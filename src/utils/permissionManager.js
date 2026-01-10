// utils/permissionManager.js
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { Alert, Linking, Platform } from 'react-native';

class PermissionManager {
  constructor() {
    this.permissions = {
      location: false,
      camera: false,
      microphone: false,
    };
  }

  // Request all permissions at once (call during onboarding)
  async requestAllPermissions() {
    const results = {
      location: false,
      camera: false,
      microphone: false,
      sms: false,
      allGranted: false,
    };

    try {
      // Request location permission
      const locationResult = await this.requestLocationPermission();
      results.location = locationResult;

      // Request camera permission
      const cameraResult = await this.requestCameraPermission();
      results.camera = cameraResult;

      // Request microphone permission
      const microphoneResult = await this.requestMicrophonePermission();
      results.microphone = microphoneResult;

      // Request SMS permission
      const smsResult = await this.requestSMSPermission();
      results.sms = smsResult;

      results.allGranted =
        results.location && results.camera && results.microphone && results.sms;

      return results;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return results;
    }
  }

  // Request location permission
  async requestLocationPermission() {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'LunaGuard needs location access to send your location during emergencies.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => this.openSettings() },
          ]
        );
        return false;
      }

      // Request background permission for Android
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Background Location',
            'For best results, please enable "Allow all the time" for location access in Settings.',
            [{ text: 'OK' }]
          );
        }
      }

      this.permissions.location = true;
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  // ✅ Request camera permission (updated for expo-vision-camera)
  async requestCameraPermission() {
    try {
      const cameraPermission = await Camera.requestCameraPermission();

      if (cameraPermission !== 'authorized') {
        Alert.alert(
          'Camera Permission Required',
          'LunaGuard needs camera access to record video during emergencies.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => this.openSettings() },
          ]
        );
        return false;
      }

      this.permissions.camera = true;
      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  // Request microphone permission
  async requestMicrophonePermission() {
    try {
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'LunaGuard needs microphone access to record audio during emergencies.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => this.openSettings() },
          ]
        );
        return false;
      }

      this.permissions.microphone = true;
      return true;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  }

  // Request SMS permission (Android only)
  async requestSMSPermission() {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this
    }

    try {
      const { PermissionsAndroid } = require('react-native');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: 'SMS Permission Required',
          message:
            'LunaGuard needs SMS permission to alert your emergency contacts during emergencies.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else {
        Alert.alert(
          'SMS Permission Required',
          'LunaGuard needs SMS permission to send emergency alerts to your contacts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => this.openSettings() },
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      return false;
    }
  }

  // ✅ Check if all permissions are granted (updated for expo-vision-camera)
  async checkAllPermissions() {
    try {
      const locationStatus = await Location.getForegroundPermissionsAsync();
      const cameraPermission = await Camera.getCameraPermissionStatus();
      const audioStatus = await Audio.getPermissionsAsync();

      this.permissions.location = locationStatus.status === 'granted';
      this.permissions.camera = cameraPermission === 'authorized';
      this.permissions.microphone = audioStatus.status === 'granted';

      // Check SMS permission on Android
      let smsGranted = true;
      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const smsStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.SEND_SMS
        );
        smsGranted = smsStatus;
      }

      return {
        location: this.permissions.location,
        camera: this.permissions.camera,
        microphone: this.permissions.microphone,
        sms: smsGranted,
        allGranted:
          this.permissions.location &&
          this.permissions.camera &&
          this.permissions.microphone &&
          smsGranted,
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        location: false,
        camera: false,
        microphone: false,
        allGranted: false,
      };
    }
  }

  // Open app settings
  openSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  // Show permission status alert
  async showPermissionStatus() {
    const status = await this.checkAllPermissions();

    const locationIcon = status.location ? '✅' : '❌';
    const cameraIcon = status.camera ? '✅' : '❌';
    const microphoneIcon = status.microphone ? '✅' : '❌';
    const smsIcon = status.sms ? '✅' : '❌';

    Alert.alert(
      'Permission Status',
      `${locationIcon} Location\n${cameraIcon} Camera\n${microphoneIcon} Microphone\n${smsIcon} SMS`,
      [
        { text: 'OK', style: 'cancel' },
        ...(status.allGranted ? [] : [{ text: 'Settings', onPress: () => this.openSettings() }]),
      ]
    );
  }
}

export default new PermissionManager();
