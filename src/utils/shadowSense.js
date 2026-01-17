// utils/shadowSense.js
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  Accelerometer,
  Gyroscope,
  LightSensor,
  Pedometer,
  DeviceMotion
} from 'expo-sensors';
import SOSService from './sosService';

const SHADOWSENSE_TASK = 'SHADOWSENSE_BACKGROUND_TASK';
const RISK_CHECK_INTERVAL = 3000; // Check every 3 seconds

// Risk score thresholds
const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 50,
  HIGH: 70,
  CRITICAL: 85, // Triggers SOS
};

// Sensor data storage
let sensorData = {
  accelerometer: { x: 0, y: 0, z: 0 },
  gyroscope: { x: 0, y: 0, z: 0 },
  light: 0,
  stepCount: 0,
  lastStepTime: Date.now(),
  deviceMotion: { acceleration: { x: 0, y: 0, z: 0 } },
  isMoving: false,
  suddenMovements: 0,
  prolongedStill: 0,
  lowLightDuration: 0,
  lastUpdateTime: Date.now(),
};

// Risk calculation weights
const WEIGHTS = {
  SUDDEN_MOVEMENT: 15,
  PROLONGED_STILL: 10,
  LOW_LIGHT: 8,
  ERRATIC_MOTION: 12,
  RAPID_DIRECTION_CHANGE: 10,
  NO_STEPS: 5,
};

// TRACK SOS STATE
let sosTriggered = false;
let username = 'Unknown User';
let emergencyContacts = [];

/**
 * Calculate risk score based on sensor data
 */
function calculateRiskScore() {
  let score = 0;
  const now = Date.now();
  const timeSinceLastUpdate = (now - sensorData.lastUpdateTime) / 1000;

  // 1. Sudden Movement Detection
  const totalAcceleration = Math.sqrt(
    Math.pow(sensorData.accelerometer.x, 2) +
    Math.pow(sensorData.accelerometer.y, 2) +
    Math.pow(sensorData.accelerometer.z, 2)
  );

  if (totalAcceleration > 15) {
    sensorData.suddenMovements++;
    score += WEIGHTS.SUDDEN_MOVEMENT * Math.min(sensorData.suddenMovements / 3, 1);
  } else if (totalAcceleration < 2) {
    sensorData.suddenMovements = Math.max(0, sensorData.suddenMovements - 0.1);
  }

  // 2. Prolonged Stillness
  if (totalAcceleration < 1.5 && !sensorData.isMoving) {
    sensorData.prolongedStill += timeSinceLastUpdate;
    const stillnessScore = Math.min((sensorData.prolongedStill / 60), 2);
    score += WEIGHTS.PROLONGED_STILL * stillnessScore;
  } else {
    sensorData.prolongedStill = 0;
  }

  // 3. Low Light Environment
  if (sensorData.light < 10) {
    sensorData.lowLightDuration += timeSinceLastUpdate;
    if (sensorData.lowLightDuration > 30) {
      const lightScore = Math.min((sensorData.lowLightDuration / 120), 2);
      score += WEIGHTS.LOW_LIGHT * lightScore;
    }
  } else {
    sensorData.lowLightDuration = 0;
  }

  // 4. Erratic Motion Detection
  const gyroMagnitude = Math.sqrt(
    Math.pow(sensorData.gyroscope.x, 2) +
    Math.pow(sensorData.gyroscope.y, 2) +
    Math.pow(sensorData.gyroscope.z, 2)
  );

  if (gyroMagnitude > 3 && totalAcceleration > 5) {
    score += WEIGHTS.ERRATIC_MOTION * Math.min(gyroMagnitude / 5, 1);
  }

  // 5. Rapid Direction Changes
  if (Math.abs(sensorData.gyroscope.z) > 2) {
    score += WEIGHTS.RAPID_DIRECTION_CHANGE * Math.min(Math.abs(sensorData.gyroscope.z) / 4, 1);
  }

  // 6. No Steps Detected
  const timeSinceLastStep = (now - sensorData.lastStepTime) / 1000;
  if (totalAcceleration > 2 && timeSinceLastStep > 30) {
    score += WEIGHTS.NO_STEPS;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Get risk level description
 */
function getRiskLevel(score) {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (score >= RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (score >= RISK_THRESHOLDS.LOW) return 'LOW';
  return 'SAFE';
}

/**
 * Trigger SOS when risk is critical
 */
async function triggerSOS() {
  if (sosTriggered) {
    console.log('🚨 SOS already triggered, skipping duplicate');
    return;
  }

  sosTriggered = true;
  console.log('🚨 CRITICAL RISK DETECTED - TRIGGERING SOS');

  // Send notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 ShadowSense Alert',
      body: 'Critical risk detected! Starting emergency recording...',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });

  try {
    // START SOS SERVICE
    const result = await SOSService.startSOS(username, emergencyContacts);

    if (result.error) {
      console.error('Failed to start SOS:', result.error);
      sosTriggered = false;
    } else {
      console.log('✅ SOS started successfully:', result.sessionId);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Emergency Recording Active',
          body: `Your emergency contacts have been notified. Session: ${result.sessionId}`,
          sound: true,
          data: {
            sessionId: result.sessionId,
            viewerLink: result.viewerLink
          },
        },
        trigger: null,
      });
    }
  } catch (error) {
    console.error('Error triggering SOS:', error);
    sosTriggered = false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ SOS Error',
        body: 'Failed to start emergency recording. Please check permissions.',
        sound: true,
      },
      trigger: null,
    });
  }
}

/**
 * Start sensor subscriptions
 */
let subscriptions = [];

export async function startShadowSense(userProfile = {}, contacts = []) {
  console.log('Starting ShadowSense monitoring...');

  // Store user info for SOS
  username = userProfile.username || userProfile.name || 'Unknown User';
  emergencyContacts = contacts || [];

  // Reset SOS trigger flag
  sosTriggered = false;

  // Request permissions
  const { status: notifStatus } = await Notifications.requestPermissionsAsync();
  if (notifStatus !== 'granted') {
    console.warn('Notification permission not granted');
  }

  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Reset sensor data
  sensorData = {
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    light: 0,
    stepCount: 0,
    lastStepTime: Date.now(),
    deviceMotion: { acceleration: { x: 0, y: 0, z: 0 } },
    isMoving: false,
    suddenMovements: 0,
    prolongedStill: 0,
    lowLightDuration: 0,
    lastUpdateTime: Date.now(),
  };

  // Start accelerometer
  try {
    Accelerometer.setUpdateInterval(1000);
    const accelSub = Accelerometer.addListener((data) => {
      sensorData.accelerometer = data;
      sensorData.lastUpdateTime = Date.now();
    });
    subscriptions.push(accelSub);
  } catch (e) {
    console.warn('Accelerometer not available:', e);
  }

  // Start gyroscope
  try {
    Gyroscope.setUpdateInterval(1000);
    const gyroSub = Gyroscope.addListener((data) => {
      sensorData.gyroscope = data;
    });
    subscriptions.push(gyroSub);
  } catch (e) {
    console.warn('Gyroscope not available:', e);
  }

  // Start light sensor
  try {
    LightSensor.setUpdateInterval(2000);
    const lightSub = LightSensor.addListener((data) => {
      sensorData.light = data.illuminance;
    });
    subscriptions.push(lightSub);
  } catch (e) {
    console.warn('Light sensor not available:', e);
  }

  // Start pedometer
  try {
    const pedometerSub = Pedometer.watchStepCount((result) => {
      sensorData.stepCount = result.steps;
      sensorData.lastStepTime = Date.now();
      sensorData.isMoving = true;
    });
    subscriptions.push(pedometerSub);
  } catch (e) {
    console.warn('Pedometer not available:', e);
  }

  // Start device motion
  try {
    DeviceMotion.setUpdateInterval(1000);
    const motionSub = DeviceMotion.addListener((data) => {
      if (data.acceleration) {
        sensorData.deviceMotion = data;
      }
    });
    subscriptions.push(motionSub);
  } catch (e) {
    console.warn('Device motion not available:', e);
  }

  // Start risk monitoring interval
  const riskInterval = setInterval(async () => {
    const riskScore = calculateRiskScore();
    const riskLevel = getRiskLevel(riskScore);

    console.log(`ShadowSense Risk Score: ${riskScore} (${riskLevel})`);

    // Trigger SOS if critical
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
      await triggerSOS();
    } else if (riskScore >= RISK_THRESHOLDS.HIGH) {
      // Send warning notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ ShadowSense Warning',
          body: `High risk detected (${riskScore}/100). Stay alert!`,
          sound: true,
        },
        trigger: null,
      });
    }
  }, RISK_CHECK_INTERVAL);

  subscriptions.push({ remove: () => clearInterval(riskInterval) });

  return true;
}

/**
 * Stop sensor subscriptions and SOS if active
 */
export async function stopShadowSense() {
  console.log('Stopping ShadowSense monitoring...');

  subscriptions.forEach((sub) => {
    if (sub && sub.remove) {
      sub.remove();
    }
  });
  subscriptions = [];

  // Stop SOS if it was triggered
  if (sosTriggered) {
    try {
      await SOSService.stopSOS();
      console.log('✅ SOS stopped');
    } catch (error) {
      console.error('Error stopping SOS:', error);
    }
  }

  sosTriggered = false;
}

/**
 * Get current risk score (for UI display)
 */
export function getCurrentRiskScore() {
  return {
    score: calculateRiskScore(),
    level: getRiskLevel(calculateRiskScore()),
    sensorData: { ...sensorData },
    sosActive: sosTriggered,
  };
}

// Background task definition (optional - requires background permissions)
TaskManager.defineTask(SHADOWSENSE_TASK, async () => {
  try {
    const riskScore = calculateRiskScore();

    if (riskScore >= RISK_THRESHOLDS.CRITICAL && !sosTriggered) {
      await triggerSOS();
    }

    return riskScore >= RISK_THRESHOLDS.CRITICAL
      ? TaskManager.BackgroundFetchResult.NewData
      : TaskManager.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background task error:', error);
    return TaskManager.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background location tracking (OPTIONAL - only if you need it)
 */
export async function startBackgroundTracking() {
  try {
    // First check if we have foreground permission
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('Foreground location permission not granted');
      return false;
    }

    // Then request background permission
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Background location permission not granted - continuing without background tracking');
      return false;
    }

    await Location.startLocationUpdatesAsync(SHADOWSENSE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: 'ShadowSense Active',
        notificationBody: 'Monitoring your safety in the background',
        notificationColor: '#652a9c',
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to start background tracking:', error);
    return false;
  }
}

/**
 * Stop background tracking
 */
export async function stopBackgroundTracking() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SHADOWSENSE_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(SHADOWSENSE_TASK);
    }
  } catch (error) {
    console.error('Error stopping background tracking:', error);
  }
}