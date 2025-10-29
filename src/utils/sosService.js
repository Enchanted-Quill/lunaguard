// utils/sosService.js
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as TaskManager from 'expo-task-manager';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import NetInfo from '@react-native-community/netinfo';
import { Video } from 'expo-av';
import { Alert } from 'react-native';
import SendSMS from 'react-native-sms';

const SOS_TASK_NAME = 'SOS_RECORDING_TASK';
const CHUNK_DURATION = 8000; // 8 seconds in milliseconds
const MAX_RETRIES = 5;

let currentSessionId = null;
let chunkCounter = 0;
let isRecording = false;
let recordingInstance = null;
let uploadQueue = [];
let retryQueue = [];

class SOSService {
  constructor() {
    this.sessionId = null;
    this.isActive = false;
    this.chunkIndex = 0;
    this.uploadQueue = [];
    this.isOnline = true;
    this.recordingMode = 'video'; // 'video' or 'audio'

    // Monitor network status
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
      if (this.isOnline && this.uploadQueue.length > 0) {
        this.processUploadQueue();
      }
    });
  }

  // Generate unique session ID
  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Start SOS session
  async startSOS(username, contacts) {
    try {
      if (this.isActive) {
        console.log('SOS already active');
        return;
      }

      this.isActive = true;
      this.sessionId = this.generateSessionId();
      this.chunkIndex = 0;

      console.log('Starting SOS session:', this.sessionId);

      // Get initial location
      const location = await this.getCurrentLocation();

      // Create session in Firestore
      await firestore().collection('sos-sessions').doc(this.sessionId).set({
        username,
        startTime: firestore.FieldValue.serverTimestamp(),
        status: 'active',
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        } : null,
        chunkCount: 0,
        recordingMode: 'video',
      });

      // Generate viewer link
      const viewerLink = `https://lunaguard-304d3.web.app/sos-viewer.html?session=${this.sessionId}`;

      // Send SMS to emergency contacts via react-native-sms
      try {
        const locationText = location
          ? `\nLocation: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`
          : '';

        const message = `🚨 EMERGENCY ALERT from ${username}${locationText}\n\nLive Stream: ${viewerLink}\n\nThis is an automated emergency alert from LunaGuard.`;

        const phoneNumbers = contacts.map(c => c.phone);

        SendSMS.send({
          body: message,
          recipients: phoneNumbers,
          successTypes: ['sent', 'queued'],
          allowAndroidSendWithoutReadPermission: true
        }, (completed, cancelled, error) => {
          if (completed) {
            console.log('SMS alerts sent successfully to', phoneNumbers.length, 'contacts');

            // Update Firestore with SMS status
            firestore().collection('sos-sessions').doc(this.sessionId).update({
              smsSent: true,
              smsTimestamp: firestore.FieldValue.serverTimestamp(),
              contactsNotified: phoneNumbers.length,
            }).catch(err => console.error('Error updating SMS status:', err));
          } else if (cancelled) {
            console.log('SMS sending cancelled');
          } else if (error) {
            console.error('SMS sending error:', error);
          }
        });
      } catch (error) {
        console.error('Error sending SMS:', error);
        // Continue even if SMS fails
      }

      // Start recording
      await this.startRecording();

      // Start background location updates
      await this.startLocationUpdates();

      return {
        sessionId: this.sessionId,
        viewerLink,
      };
    } catch (error) {
      console.error('Error starting SOS:', error);
      this.isActive = false;
      throw error;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  // Start recording (tries video first, falls back to audio)
  async startRecording() {
    try {
      // Try video recording first
      const cameraPermission = await Camera.getCameraPermissionsAsync();
      const audioPermission = await Audio.getPermissionsAsync();

      if (cameraPermission.status === 'granted' && audioPermission.status === 'granted') {
        await this.startVideoRecording();
      } else if (audioPermission.status === 'granted') {
        await this.startAudioRecording();
      } else {
        throw new Error('No recording permissions');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      // Try audio fallback
      try {
        await this.startAudioRecording();
      } catch (audioError) {
        console.error('Audio fallback failed:', audioError);
        throw audioError;
      }
    }
  }

  // Start video recording with chunks
  async startVideoRecording() {
    this.recordingMode = 'video';
    console.log('Starting video recording');

    // Note: Actual video recording requires a Camera component reference
    // This is a simplified version - in production, you'd need to:
    // 1. Have a hidden Camera component mounted
    // 2. Get reference to it
    // 3. Call recordAsync on it

    // For now, we'll use audio recording as the primary method
    // since video recording in background is complex on Android
    await this.startAudioRecording();
  }

  // Start audio recording with chunks
  async startAudioRecording() {
    this.recordingMode = 'audio';
    console.log('Starting audio recording');

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start chunk recording loop
      this.recordChunkLoop();
    } catch (error) {
      console.error('Error setting up audio:', error);
      throw error;
    }
  }

  // Record chunk loop
  async recordChunkLoop() {
    while (this.isActive) {
      try {
        console.log(`Recording chunk ${this.chunkIndex}`);

        const chunkUri = await this.recordSingleChunk();

        if (chunkUri) {
          // Add to upload queue
          const chunkData = {
            sessionId: this.sessionId,
            chunkIndex: this.chunkIndex,
            uri: chunkUri,
            timestamp: Date.now(),
            mode: this.recordingMode,
          };

          this.uploadQueue.push(chunkData);
          this.chunkIndex++;

          // Try to upload immediately if online
          if (this.isOnline) {
            this.processUploadQueue();
          }
        }
      } catch (error) {
        console.error('Error in chunk loop:', error);
      }
    }
  }

  // Record a single chunk
  async recordSingleChunk() {
    try {
      const fileName = `chunk_${this.chunkIndex}_${Date.now()}.${this.recordingMode === 'video' ? 'm4a' : 'm4a'}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await recording.startAsync();

      // Record for CHUNK_DURATION
      await new Promise(resolve => setTimeout(resolve, CHUNK_DURATION));

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      return uri;
    } catch (error) {
      console.error('Error recording chunk:', error);
      return null;
    }
  }

  // Process upload queue
  async processUploadQueue() {
    if (this.uploadQueue.length === 0) return;

    const chunk = this.uploadQueue[0];

    try {
      await this.uploadChunk(chunk);

      // Remove from queue on success
      this.uploadQueue.shift();

      // Delete local file
      await FileSystem.deleteAsync(chunk.uri, { idempotent: true });

      // Continue with next chunk
      if (this.uploadQueue.length > 0) {
        this.processUploadQueue();
      }
    } catch (error) {
      console.error('Error uploading chunk:', error);

      // Move to retry queue if max retries not reached
      chunk.retries = (chunk.retries || 0) + 1;
      if (chunk.retries < MAX_RETRIES) {
        this.uploadQueue.shift();
        this.uploadQueue.push(chunk);
      } else {
        console.error('Max retries reached for chunk:', chunk.chunkIndex);
        this.uploadQueue.shift();
      }
    }
  }

  // Upload single chunk
  async uploadChunk(chunkData) {
    const { sessionId, chunkIndex, uri, timestamp, mode } = chunkData;

    // Upload to Firebase Storage
    const storageRef = storage().ref(`sos-sessions/${sessionId}/chunk_${String(chunkIndex).padStart(4, '0')}.m4a`);

    await storageRef.putFile(uri);
    const downloadUrl = await storageRef.getDownloadURL();

    // Update Firestore with chunk metadata
    await firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .collection('chunks')
      .doc(String(chunkIndex))
      .set({
        index: chunkIndex,
        url: downloadUrl,
        timestamp: firestore.Timestamp.fromMillis(timestamp),
        mode,
        uploaded: firestore.FieldValue.serverTimestamp(),
      });

    // Update session chunk count
    await firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .update({
        chunkCount: firestore.FieldValue.increment(1),
        lastChunkTime: firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Chunk ${chunkIndex} uploaded successfully`);
  }

  // Start location updates
  async startLocationUpdates() {
    try {
      // Update location every 30 seconds
      this.locationInterval = setInterval(async () => {
        const location = await this.getCurrentLocation();
        if (location && this.sessionId) {
          await firestore()
            .collection('sos-sessions')
            .doc(this.sessionId)
            .update({
              currentLocation: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                timestamp: firestore.FieldValue.serverTimestamp(),
              },
            });
        }
      }, 30000);
    } catch (error) {
      console.error('Error starting location updates:', error);
    }
  }

  // Stop SOS session
  async stopSOS() {
    try {
      if (!this.isActive) {
        console.log('No active SOS session');
        return;
      }

      console.log('Stopping SOS session:', this.sessionId);
      this.isActive = false;

      // Clear location interval
      if (this.locationInterval) {
        clearInterval(this.locationInterval);
      }

      // Wait for remaining uploads to complete
      let attempts = 0;
      while (this.uploadQueue.length > 0 && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      // Update session status
      await firestore()
        .collection('sos-sessions')
        .doc(this.sessionId)
        .update({
          status: 'completed',
          endTime: firestore.FieldValue.serverTimestamp(),
        });

      // Trigger archive assembly via Cloud Function
      try {
        const assembleArchive = functions().httpsCallable('assembleSOSArchive');
        const result = await assembleArchive({
          sessionId: this.sessionId,
        });
        console.log('Archive assembly initiated:', result.data);
      } catch (error) {
        console.error('Error assembling archive:', error);
      }

      const completedSessionId = this.sessionId;
      this.sessionId = null;

      return completedSessionId;
    } catch (error) {
      console.error('Error stopping SOS:', error);
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }
}

// Export singleton instance
export default new SOSService();