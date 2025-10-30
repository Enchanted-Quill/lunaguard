// utils/sosService.js
/**
 * SOSService
 * - Records audio in short chunks (CHUNK_DURATION ms)
 * - Saves chunks locally, uploads to Firebase Storage, writes metadata to Firestore
 * - Sends an initial SMS to emergency contacts with a viewer link
 * - Keeps a resilient upload queue that retries when network returns
 *
 * Notes:
 * - For foreground video recording use react-native-vision-camera in a component;
 *   capture short files and call sosService.queueUpload(...) to upload them.
 * - Audio chunking + upload is much more reliable and is implemented here.
 */

import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import NetInfo from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import SendSMS from 'react-native-sms';

const CHUNK_DURATION = 8000; // ms (8 seconds)
const MAX_UPLOAD_RETRIES = 5;
const UPLOAD_CONCURRENCY = 1; // one at a time to preserve order

class SOSService {
  constructor() {
    this.sessionId = null;
    this.isActive = false;
    this.chunkIndex = 0;
    this.uploadQueue = []; // { sessionId, chunkIndex, localUri, mode, attempts }
    this.processingUploads = false;
    this.isOnline = true;
    this.locationInterval = null;
    this.recordingMode = 'audio'; // 'audio' | 'video' (video handled in UI)
    this.recordingInstance = null;

    // Watch network
    this.netUnsub = NetInfo.addEventListener(state => {
      this.isOnline = !!(state.isConnected && state.isInternetReachable);
      if (this.isOnline) this._processUploadQueue().catch(e => console.error(e));
    });
  }

  // -------------------------
  // Utilities
  // -------------------------
  _generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async _sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  // -------------------------
  // Public API
  // -------------------------
  /**
   * startSOS(username, contacts)
   * - username (string)
   * - contacts: [{ name, phone }, ...]
   *
   * Returns: { sessionId, viewerLink } on success
   */
  async startSOS(username = 'Unknown', contacts = []) {
    if (this.isActive) {
      console.warn('SOS already active');
      return { error: 'SOS already active' };
    }

    this.isActive = true;
    this.sessionId = this._generateSessionId();
    this.chunkIndex = 0;
    this.uploadQueue = [];

    try {
      // Request minimal permissions (location, audio)
      try {
        const loc = await Location.requestForegroundPermissionsAsync();
        if (loc.status !== 'granted') {
          console.warn('Location permission not granted for SOS');
        }
      } catch (e) {
        console.warn('Location permission request failed', e);
      }

      try {
        // expo-av uses Audio.requestPermissionsAsync in newer versions
        if (Audio && Audio.requestPermissionsAsync) {
          await Audio.requestPermissionsAsync();
        }
      } catch (e) {
        console.warn('Audio permission request failed', e);
      }

      // Get initial location (may be null)
      const initialLocation = await this._getCurrentLocation();

      // Create Firestore session doc
      await firestore().collection('sos-sessions').doc(this.sessionId).set({
        username,
        startTime: firestore.FieldValue.serverTimestamp(),
        status: 'active',
        initialLocation: initialLocation ? {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        } : null,
        chunkCount: 0,
        recordingMode: this.recordingMode,
      });

      // Build a viewer link (you'll need to provide the viewer page on your web host)
      const viewerLink = `https://your-viewer.example.com/sos?session=${this.sessionId}`;

      // Notify emergency contacts via SMS (best-effort)
      try {
        const phoneNumbers = contacts.map(c => c.phone).filter(Boolean);
        if (phoneNumbers.length) {
          const locationText = initialLocation
            ? `\nLocation: https://maps.google.com/?q=${initialLocation.coords.latitude},${initialLocation.coords.longitude}`
            : '';

          const message = `🚨 EMERGENCY from ${username}${locationText}\nLive: ${viewerLink}\n(Automatic alert from LunaGuard)`;

          // Using react-native-sms (will open native SMS UI on some platforms)
          SendSMS.send({
            body: message,
            recipients: phoneNumbers,
            successTypes: ['sent', 'queued'],
            allowAndroidSendWithoutReadPermission: true,
          }, (completed, cancelled, error) => {
            if (error) console.warn('SMS send error', error);
            // We don't fail the SOS if SMS fails
          });
        }
      } catch (smsErr) {
        console.warn('SMS notify error', smsErr);
      }

      // Start location updates loop (30s)
      this._startLocationUpdates();

      // Start audio chunk recorder loop
      await this._startAudioChunkLoop();

      return { sessionId: this.sessionId, viewerLink };
    } catch (err) {
      console.error('startSOS error', err);
      this.isActive = false;
      this.sessionId = null;
      throw err;
    }
  }

  async stopSOS() {
    if (!this.isActive) return null;
    this.isActive = false;

    // stop recording if running
    try {
      if (this.recordingInstance) {
        try {
          await this.recordingInstance.stopAndUnloadAsync();
        } catch (_) { /* ignore */ }
        this.recordingInstance = null;
      }
    } catch (err) {
      console.warn('Error stopping recordingInstance', err);
    }

    // wait for upload queue to drain a bit (best-effort)
    let tries = 0;
    while (this.uploadQueue.length > 0 && tries < 30) {
      await this._sleep(1000);
      tries++;
    }

    // Stop location updates
    this._stopLocationUpdates();

    // Mark Firestore session as completed
    try {
      await firestore().collection('sos-sessions').doc(this.sessionId).update({
        status: 'completed',
        endTime: firestore.FieldValue.serverTimestamp(),
      });

      // Optionally call Cloud Function to assemble archive (if you have one)
      // functions().httpsCallable('assembleSOSArchive')({ sessionId: this.sessionId })
      //   .catch(e => console.warn('assemble archive error', e));
    } catch (err) {
      console.warn('Error updating session completed status', err);
    }

    const finishedId = this.sessionId;
    this.sessionId = null;
    this.chunkIndex = 0;
    return finishedId;
  }

  // -------------------------
  // Recording + chunking
  // -------------------------
  async _startAudioChunkLoop() {
    // loop that records short chunks until this.isActive is false
    this.recordingMode = 'audio';

    // Loop in background: start/stop Recording instances for each chunk
    this._audioLoopRunning = true;
    (async () => {
      while (this.isActive) {
        try {
          const chunkUri = await this._recordOneChunk();
          if (chunkUri && this.sessionId) {
            // queue it
            this._queueUpload({
              sessionId: this.sessionId,
              chunkIndex: this.chunkIndex,
              localUri: chunkUri,
              mode: 'audio',
            });
            this.chunkIndex++;
            // fire off uploads if online
            if (this.isOnline) this._processUploadQueue().catch(e => console.error(e));
          }
        } catch (err) {
          console.error('Chunk record error', err);
          // short backoff to avoid tight loop on error
          await this._sleep(500);
        }
      }
      this._audioLoopRunning = false;
    })();
  }

  async _recordOneChunk() {
    // prepare a file path
    const fileName = `sos_${Date.now()}_${Math.floor(Math.random()*1000)}.m4a`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;

    const recording = new Audio.Recording();
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // attempt to keep recording in background
      });

      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
      });

      await recording.startAsync();
      // record for CHUNK_DURATION
      await this._sleep(CHUNK_DURATION);
      await recording.stopAndUnloadAsync();

      // get URI from recording
      const uri = recording.getURI();
      // optionally copy to our FileSystem path (some platforms already put it in doc dir)
      // We'll attempt to move/copy file if recording URI exists and is not within documentDirectory
      if (uri && !uri.startsWith(FileSystem.documentDirectory)) {
        // copy
        try {
          await FileSystem.copyAsync({ from: uri, to: localUri });
          return localUri;
        } catch (e) {
          // fallback to using returned uri
          return uri;
        }
      }
      return uri;
    } catch (err) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (_) {}
      console.error('recordOneChunk error', err);
      return null;
    }
  }

  // -------------------------
  // Upload queue
  // -------------------------
  _queueUpload(item) {
    // item: { sessionId, chunkIndex, localUri, mode }
    this.uploadQueue.push({ ...item, attempts: 0 });
  }

  async _processUploadQueue() {
    if (this.processingUploads) return;
    this.processingUploads = true;

    while (this.uploadQueue.length > 0) {
      if (!this.isOnline) break; // wait until online

      const next = this.uploadQueue[0];
      try {
        await this._uploadChunk(next);
        // remove from queue
        this.uploadQueue.shift();
      } catch (err) {
        next.attempts = (next.attempts || 0) + 1;
        console.warn(`Upload attempt ${next.attempts} failed for chunk ${next.chunkIndex}`, err);
        if (next.attempts >= MAX_UPLOAD_RETRIES) {
          console.error(`Dropping chunk ${next.chunkIndex} after ${next.attempts} attempts`);
          this.uploadQueue.shift();
        } else {
          // backoff then retry loop will pick it up
          await this._sleep(1000 * next.attempts);
        }
      }
    }

    this.processingUploads = false;
  }

  async _uploadChunk({ sessionId, chunkIndex, localUri, mode }) {
    // path in storage
    const filename = `chunk_${String(chunkIndex).padStart(5, '0')}.m4a`;
    const storagePath = `sos-sessions/${sessionId}/${filename}`;
    const storageRef = storage().ref(storagePath);

    // upload local file to Firebase Storage
    await storageRef.putFile(localUri);
    const downloadUrl = await storageRef.getDownloadURL();

    // write metadata in Firestore under session/chunks
    await firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .collection('chunks')
      .doc(String(chunkIndex))
      .set({
        index: chunkIndex,
        url: downloadUrl,
        mode,
        uploadedAt: firestore.FieldValue.serverTimestamp(),
      });

    // increment chunkCount atomically
    await firestore().collection('sos-sessions').doc(sessionId).update({
      chunkCount: firestore.FieldValue.increment(1),
      lastChunkAt: firestore.FieldValue.serverTimestamp(),
    });

    // delete local file (best-effort)
    try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch (_) {}
  }

  // Optionally allow other parts of app (e.g., camera component) to queue uploads
  async queueUpload({ sessionId, localUri, mode = 'video', chunkIndex = null }) {
    if (!sessionId) sessionId = this.sessionId || this._generateSessionId();
    if (chunkIndex === null) chunkIndex = this.chunkIndex++;
    this._queueUpload({ sessionId, chunkIndex, localUri, mode });
    if (this.isOnline) this._processUploadQueue().catch(e => console.error(e));
  }

  // -------------------------
  // Location updates
  // -------------------------
  _startLocationUpdates() {
    // update every 30s while SOS active
    this._stopLocationUpdates();
    this.locationInterval = setInterval(async () => {
      if (!this.isActive || !this.sessionId) return;
      try {
        const loc = await this._getCurrentLocation();
        if (loc) {
          await firestore().collection('sos-sessions').doc(this.sessionId).update({
            currentLocation: {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              timestamp: firestore.FieldValue.serverTimestamp(),
            },
          });
        }
      } catch (e) {
        console.warn('location update error', e);
      }
    }, 30_000);
  }

  _stopLocationUpdates() {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
  }

  async _getCurrentLocation() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return loc;
    } catch (err) {
      console.warn('getCurrentLocation error', err);
      return null;
    }
  }

  // -------------------------
  // Cleanup
  // -------------------------
  async cleanup() {
    this.isActive = false;
    this._stopLocationUpdates();
    try { this.netUnsub && this.netUnsub(); } catch (_) {}
    try {
      if (this.recordingInstance) {
        await this.recordingInstance.stopAndUnloadAsync();
        this.recordingInstance = null;
      }
    } catch (_) {}
  }
}


export default new SOSService();
