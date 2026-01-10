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
  SUDDEN_MOVEMENT: 15,      // Sudden jerky movements (dropped phone, struggle)
  PROLONGED_STILL: 10,      // No movement for extended period
  LOW_LIGHT: 8,             // Extremely low light conditions
  ERRATIC_MOTION: 12,       // Random, non-walking motion patterns
  RAPID_DIRECTION_CHANGE: 10, // Quick changes in direction
  NO_STEPS: 5,              // No walking detected when should be moving
};

/**
 * Calculate risk score based on sensor data
 *
 * Risk Factors Explained:
 * 1. Sudden Movement (0-25 points): Detects phone being dropped, thrown, or struggle
 *    - Triggered by rapid acceleration spikes (>15 m/s²)
 *
 * 2. Prolonged Stillness (0-20 points): Phone hasn't moved in a while
 *    - Could indicate user is incapacitated or restrained
 *    - Increases over time if no movement detected
 *
 * 3. Low Light Environment (0-15 points): Extremely dark surroundings
 *    - May indicate secluded area or trunk of car
 *    - Only scores high if prolonged (>30 seconds)
 *
 * 4. Erratic Motion (0-20 points): Non-walking movement patterns
 *    - Detects random, unnatural movements
 *    - Could indicate struggle or being carried
 *
 * 5. Rapid Direction Changes (0-15 points): Quick rotation/turning
 *    - Multiple direction changes in short time
 *    - May indicate disorientation or evasive action
 *
 * 6. No Steps Detected (0-10 points): Should be walking but isn't
 *    - User was walking, then suddenly stopped moving but phone still moves
 *    - Could indicate being carried or in vehicle unexpectedly
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

  if (totalAcceleration > 15) { // Gravity is ~9.8, so >15 is significant
    sensorData.suddenMovements++;
    score += WEIGHTS.SUDDEN_MOVEMENT * Math.min(sensorData.suddenMovements / 3, 1);
  } else if (totalAcceleration < 2) {
    // Reset sudden movement counter if stable
    sensorData.suddenMovements = Math.max(0, sensorData.suddenMovements - 0.1);
  }

  // 2. Prolonged Stillness
  if (totalAcceleration < 1.5 && !sensorData.isMoving) {
    sensorData.prolongedStill += timeSinceLastUpdate;
    const stillnessScore = Math.min((sensorData.prolongedStill / 60), 2); // Max at 2 minutes
    score += WEIGHTS.PROLONGED_STILL * stillnessScore;
  } else {
    sensorData.prolongedStill = 0;
  }

  // 3. Low Light Environment
  if (sensorData.light < 10) { // Very dark (lux < 10)
    sensorData.lowLightDuration += timeSinceLastUpdate;
    if (sensorData.lowLightDuration > 30) { // More than 30 seconds
      const lightScore = Math.min((sensorData.lowLightDuration / 120), 2); // Max at 2 minutes
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
    // High rotation + high acceleration = erratic movement
    score += WEIGHTS.ERRATIC_MOTION * Math.min(gyroMagnitude / 5, 1);
  }

  // 5. Rapid Direction Changes
  if (Math.abs(sensorData.gyroscope.z) > 2) { // Rapid yaw rotation
    score += WEIGHTS.RAPID_DIRECTION_CHANGE * Math.min(Math.abs(sensorData.gyroscope.z) / 4, 1);
  }

  // 6. No Steps Detected (when should be walking)
  const timeSinceLastStep = (now - sensorData.lastStepTime) / 1000;
  if (totalAcceleration > 2 && timeSinceLastStep > 30) {
    // Phone is moving but no steps detected for 30+ seconds
    score += WEIGHTS.NO_STEPS;
  }

  // Normalize score to 0-100 range
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
  console.log('🚨 CRITICAL RISK DETECTED - TRIGGERING SOS');

  // Send notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 ShadowSense Alert',
      body: 'Critical risk detected! Emergency contacts have been notified.',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null, // Immediate
  });

  import SOSService from './sosService';
  import { useUser } from '../context/UserContext';

  async function triggerSOS() {
    console.log('🚨 CRITICAL RISK DETECTED - TRIGGERING SOS');

    // Send notification
    await Notifications.scheduleNotificationAsync({...});

    // Automatically start SOS
    try {
      // Get user data (you'll need to pass this in)
      const username = 'user'; // Get from context
      const contacts = []; // Get from context

      await SOSService.startSOS(username, contacts);
    } catch (error) {
      console.error('Failed to auto-trigger SOS:', error);
    }
  }
}

/**
 * Start sensor subscriptions
 */
let subscriptions = [];

export async function startShadowSense() {
  console.log('Starting ShadowSense monitoring...');

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
  Accelerometer.setUpdateInterval(1000);
  const accelSub = Accelerometer.addListener((data) => {
    sensorData.accelerometer = data;
    sensorData.lastUpdateTime = Date.now();
  });
  subscriptions.push(accelSub);

  // Start gyroscope
  Gyroscope.setUpdateInterval(1000);
  const gyroSub = Gyroscope.addListener((data) => {
    sensorData.gyroscope = data;
  });
  subscriptions.push(gyroSub);

  // Start light sensor
  LightSensor.setUpdateInterval(2000);
  const lightSub = LightSensor.addListener((data) => {
    sensorData.light = data.illuminance;
  });
  subscriptions.push(lightSub);

  // Start pedometer
  const pedometerSub = Pedometer.watchStepCount((result) => {
    sensorData.stepCount = result.steps;
    sensorData.lastStepTime = Date.now();
    sensorData.isMoving = true;
  });
  subscriptions.push(pedometerSub);

  // Start device motion
  DeviceMotion.setUpdateInterval(1000);
  const motionSub = DeviceMotion.addListener((data) => {
    if (data.acceleration) {
      sensorData.deviceMotion = data;
    }
  });
  subscriptions.push(motionSub);

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
 * Stop sensor subscriptions
 */
export function stopShadowSense() {
  console.log('Stopping ShadowSense monitoring...');
  subscriptions.forEach((sub) => {
    if (sub && sub.remove) {
      sub.remove();
    }
  });
  subscriptions = [];
}

/**
 * Get current risk score (for UI display)
 */
export function getCurrentRiskScore() {
  return {
    score: calculateRiskScore(),
    level: getRiskLevel(calculateRiskScore()),
    sensorData: { ...sensorData },
  };
}

// Background task definition (for when app is in background)
TaskManager.defineTask(SHADOWSENSE_TASK, async () => {
  try {
    // This runs in background
    const riskScore = calculateRiskScore();

    if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
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
 * Register background location tracking (for when user is in Google Maps)
 */
export async function startBackgroundTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Background location permission not granted');
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
}

/**
 * Stop background tracking
 */
export async function stopBackgroundTracking() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SHADOWSENSE_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(SHADOWSENSE_TASK);
  }
}