// utils/sosService.js
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import NetInfo from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const CHUNK_DURATION = 8000;
const MAX_UPLOAD_RETRIES = 5;
const UPLOAD_CONCURRENCY = 1;

class SOSService {
  constructor() {
    this.sessionId = null;
    this.isActive = false;
    this.chunkIndex = 0;
    this.uploadQueue = [];
    this.processingUploads = false;
    this.isOnline = true;
    this.locationInterval = null;
    this.recordingMode = 'audio';
    this.recordingInstance = null;
    this.userId = null;

    this.netUnsub = NetInfo.addEventListener(state => {
      this.isOnline = !!(state.isConnected && state.isInternetReachable);
      if (this.isOnline) this._processUploadQueue().catch(e => console.error(e));
    });
  }

  _generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async _sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  /**
   * Request SMS permission on Android
   */
  async _requestSMSPermission() {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't support automatic SMS sending
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: 'SMS Permission',
          message: 'LunaGuard needs SMS permission to send emergency alerts to your contacts',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('SMS permission error:', err);
      return false;
    }
  }

  /**
   * Send SMS automatically using native Android SmsManager
   * This only works on Android with SEND_SMS permission
   */
  async _sendAutomaticSMS(phoneNumbers, message) {
    if (Platform.OS !== 'android') {
      console.warn('Automatic SMS sending is only supported on Android');
      return [];
    }

    try {
      // Request permission first
      const hasPermission = await this._requestSMSPermission();
      if (!hasPermission) {
        console.warn('SMS permission denied');
        return phoneNumbers.map(phone => ({ success: false, phone, error: 'Permission denied' }));
      }

      // Use native SmsManager
      const { SmsManager } = NativeModules;

      // If module doesn't exist, create it
      if (!SmsManager) {
        console.warn('SmsManager module not found, attempting direct send...');
        return await this._sendSMSDirect(phoneNumbers, message);
      }

      const results = [];

      for (const phone of phoneNumbers) {
        try {
          await SmsManager.sendTextMessage(phone, null, message, null, null);
          console.log(`✅ SMS sent to ${phone}`);
          results.push({ success: true, phone });
        } catch (error) {
          console.error(`❌ SMS failed to ${phone}:`, error);
          results.push({ success: false, phone, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Automatic SMS error:', error);
      return phoneNumbers.map(phone => ({ success: false, phone, error: error.message }));
    }
  }

  /**
   * Fallback method using React Native's direct SMS API
   */
  async _sendSMSDirect(phoneNumbers, message) {
    const results = [];

    for (const phone of phoneNumbers) {
      try {
        // Use React Native's Linking API as fallback
        // This will open SMS app but with pre-filled content
        const { Linking } = require('react-native');

        // For Android, we can try using SMS intent
        if (Platform.OS === 'android') {
          const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
          const canOpen = await Linking.canOpenURL(smsUrl);

          if (canOpen) {
            // Note: This opens the SMS app, doesn't send automatically
            // await Linking.openURL(smsUrl);

            // Instead, try using expo-sms for better control
            const SMS = require('expo-sms');
            const isAvailable = await SMS.isAvailableAsync();

            if (isAvailable) {
              // This will still require user tap, but it's the best we can do
              // without native module
              console.warn(`SMS app opened for ${phone} - requires user confirmation`);
              results.push({ success: false, phone, error: 'Requires user confirmation' });
            }
          }
        }
      } catch (error) {
        console.error(`SMS fallback error for ${phone}:`, error);
        results.push({ success: false, phone, error: error.message });
      }
    }

    return results;
  }

  async startSOS(username = 'Unknown', contacts = []) {
    if (this.isActive) {
      console.warn('SOS already active');
      return { error: 'SOS already active' };
    }

    this.isActive = true;
    this.sessionId = this._generateSessionId();
    this.chunkIndex = 0;
    this.uploadQueue = [];
    this.userId = auth().currentUser?.uid;

    try {
      // Request permissions
      try {
        const loc = await Location.requestForegroundPermissionsAsync();
        if (loc.status !== 'granted') {
          console.warn('Location permission not granted for SOS');
        }
      } catch (e) {
        console.warn('Location permission request failed', e);
      }

      try {
        if (Audio && Audio.requestPermissionsAsync) {
          await Audio.requestPermissionsAsync();
        }
      } catch (e) {
        console.warn('Audio permission request failed', e);
      }

      // Get initial location
      const initialLocation = await this._getCurrentLocation();

      // Create Firestore session doc
      await firestore().collection('sos-sessions').doc(this.sessionId).set({
        username,
        userId: this.userId,
        startTime: firestore.FieldValue.serverTimestamp(),
        status: 'active',
        initialLocation: initialLocation ? {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        } : null,
        chunkCount: 0,
        recordingMode: this.recordingMode,
      });

      // Build viewer link
      const viewerLink = `https://lunaguard-304d3.web.app/sos-viewer.html?session=${this.sessionId}`;

      // 🚨 AUTOMATIC SMS SENDING (ANDROID ONLY)
      try {
        const phoneNumbers = contacts.map(c => c.phone).filter(Boolean);
        if (phoneNumbers.length > 0) {
          const locationText = initialLocation
            ? `\nLocation: https://maps.google.com/?q=${initialLocation.coords.latitude},${initialLocation.coords.longitude}`
            : '';

          const message = `🚨 EMERGENCY from ${username}${locationText}\nLive: ${viewerLink}\n(Automatic alert from LunaGuard)`;

          console.log('📱 Sending automatic SMS alerts...');
          const smsResults = await this._sendAutomaticSMS(phoneNumbers, message);

          // Log SMS results to Firestore
          await firestore().collection('sos-sessions').doc(this.sessionId).update({
            smsAlerts: {
              sent: smsResults.filter(r => r.success).map(r => r.phone),
              failed: smsResults.filter(r => !r.success).map(r => ({ phone: r.phone, error: r.error })),
              timestamp: firestore.FieldValue.serverTimestamp(),
              platform: Platform.OS
            }
          });

          const successCount = smsResults.filter(r => r.success).length;
          if (successCount > 0) {
            console.log(`✅ ${successCount}/${phoneNumbers.length} SMS sent successfully`);
          } else {
            console.warn('⚠️ No SMS sent automatically (may require manual confirmation)');
          }
        }
      } catch (smsErr) {
        console.warn('Automatic SMS error (non-fatal):', smsErr);
        // Don't fail SOS if SMS fails
      }

      // Start location updates
      this._startLocationUpdates();

      // Start audio chunk recorder
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

    // Stop recording
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

    // Wait for uploads to drain
    let tries = 0;
    while (this.uploadQueue.length > 0 && tries < 30) {
      await this._sleep(1000);
      tries++;
    }

    // Stop location updates
    this._stopLocationUpdates();

    // Mark session as completed
    try {
      await firestore().collection('sos-sessions').doc(this.sessionId).update({
        status: 'completed',
        endTime: firestore.FieldValue.serverTimestamp(),
      });

      // 📁 COPY CHUNKS TO EVIDENCE LOCKER
      await this._copyChunksToEvidenceLocker();
    } catch (err) {
      console.warn('Error updating session completed status', err);
    }

    const finishedId = this.sessionId;
    this.sessionId = null;
    this.chunkIndex = 0;
    return finishedId;
  }

  /**
   * Copy all SOS chunks to Evidence Locker's Legal folder
   */
  async _copyChunksToEvidenceLocker() {
    if (!this.userId || !this.sessionId) return;

    try {
      console.log('📁 Copying SOS chunks to Evidence Locker...');

      // Get all chunks from Firestore
      const chunksSnapshot = await firestore()
        .collection('sos-sessions')
        .doc(this.sessionId)
        .collection('chunks')
        .orderBy('index')
        .get();

      if (chunksSnapshot.empty) {
        console.log('No chunks to copy');
        return;
      }

      // Get user's evidence files
      const userDoc = await firestore().collection('users').doc(this.userId).get();
      const userData = userDoc.data() || {};
      const evidenceFiles = userData.evidenceFiles || [];

      // Create Legal folder if it doesn't exist
      let legalFolderId = 'legal_folder';

      // Add each chunk as an evidence file
      const timestamp = new Date().toISOString();
      const newFiles = [];

      chunksSnapshot.forEach((chunkDoc) => {
        const chunk = chunkDoc.data();
        newFiles.push({
          id: `sos_${this.sessionId}_${chunk.index}`,
          type: 'audio',
          uri: chunk.url,
          name: `SOS_${this.sessionId}_Chunk_${chunk.index + 1}.m4a`,
          notes: `Emergency recording from ${timestamp}`,
          folderId: legalFolderId,
          isReadOnly: true,
          metadata: {
            uploadedAt: timestamp,
            size: 0,
            sessionId: this.sessionId,
          }
        });
      });

      // Update user's evidence files
      await firestore().collection('users').doc(this.userId).update({
        evidenceFiles: [...newFiles, ...evidenceFiles]
      });

      console.log(`✅ ${newFiles.length} chunks copied to Evidence Locker`);
    } catch (error) {
      console.error('Error copying chunks to Evidence Locker:', error);
    }
  }

  async _startAudioChunkLoop() {
    this.recordingMode = 'audio';
    this._audioLoopRunning = true;

    (async () => {
      while (this.isActive) {
        try {
          const chunkUri = await this._recordOneChunk();
          if (chunkUri && this.sessionId) {
            this._queueUpload({
              sessionId: this.sessionId,
              chunkIndex: this.chunkIndex,
              localUri: chunkUri,
              mode: 'audio',
            });
            this.chunkIndex++;
            if (this.isOnline) this._processUploadQueue().catch(e => console.error(e));
          }
        } catch (err) {
          console.error('Chunk record error', err);
          await this._sleep(500);
        }
      }
      this._audioLoopRunning = false;
    })();
  }

  async _recordOneChunk() {
    const fileName = `sos_${Date.now()}_${Math.floor(Math.random()*1000)}.m4a`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;

    const recording = new Audio.Recording();
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
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
      await this._sleep(CHUNK_DURATION);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (uri && !uri.startsWith(FileSystem.documentDirectory)) {
        try {
          await FileSystem.copyAsync({ from: uri, to: localUri });
          return localUri;
        } catch (e) {
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

  _queueUpload(item) {
    this.uploadQueue.push({ ...item, attempts: 0 });
  }

  async _processUploadQueue() {
    if (this.processingUploads) return;
    this.processingUploads = true;

    while (this.uploadQueue.length > 0) {
      if (!this.isOnline) break;

      const next = this.uploadQueue[0];
      try {
        await this._uploadChunk(next);
        this.uploadQueue.shift();
      } catch (err) {
        next.attempts = (next.attempts || 0) + 1;
        console.warn(`Upload attempt ${next.attempts} failed for chunk ${next.chunkIndex}`, err);
        if (next.attempts >= MAX_UPLOAD_RETRIES) {
          console.error(`Dropping chunk ${next.chunkIndex} after ${next.attempts} attempts`);
          this.uploadQueue.shift();
        } else {
          await this._sleep(1000 * next.attempts);
        }
      }
    }

    this.processingUploads = false;
  }

  async _uploadChunk({ sessionId, chunkIndex, localUri, mode }) {
    const filename = `chunk_${String(chunkIndex).padStart(5, '0')}.m4a`;
    const storagePath = `sos-sessions/${sessionId}/${filename}`;
    const storageRef = storage().ref(storagePath);

    await storageRef.putFile(localUri);
    const downloadUrl = await storageRef.getDownloadURL();

    await firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .collection('chunks')
      .doc(String(chunkIndex))
      .set({
        index: chunkIndex,
        url: downloadUrl,
        storagePath,
        mode,
        uploadedAt: firestore.FieldValue.serverTimestamp(),
      });

    await firestore().collection('sos-sessions').doc(sessionId).update({
      chunkCount: firestore.FieldValue.increment(1),
      lastChunkAt: firestore.FieldValue.serverTimestamp(),
    });

    try {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    } catch (_) {}
  }

  async queueUpload({ sessionId, localUri, mode = 'video', chunkIndex = null }) {
    if (!sessionId) sessionId = this.sessionId || this._generateSessionId();
    if (chunkIndex === null) chunkIndex = this.chunkIndex++;
    this._queueUpload({ sessionId, chunkIndex, localUri, mode });
    if (this.isOnline) this._processUploadQueue().catch(e => console.error(e));
  }

  _startLocationUpdates() {
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