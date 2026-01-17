// shadowsense.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useShadowSense } from '../context/ShadowSenseContext';
import { getCurrentRiskScore } from '../utils/shadowSense';

export default function ShadowSenseScreen() {
  const router = useRouter();
  const { isActive, riskScore, riskLevel, deactivateShadowSense } = useShadowSense();
  const [sensorData, setSensorData] = useState({
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    light: 0,
    stepCount: 0,
    suddenMovements: 0,
    prolongedStill: 0,
    lowLightDuration: 0,
  });
  const [sosActive, setSosActive] = useState(false);

  // Animated pulse for critical state
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!isActive) {
      Alert.alert(
        'ShadowSense Inactive',
        'ShadowSense monitoring is not active. Please start it from the Map screen.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // Update sensor data every second
    const interval = setInterval(() => {
      const data = getCurrentRiskScore();
      setSensorData(data.sensorData);
      setSosActive(data.sosActive);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Pulse animation for critical risk
  useEffect(() => {
    if (riskLevel === 'CRITICAL') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [riskLevel]);

  const handleStopMonitoring = async () => {
    Alert.alert(
      'Stop ShadowSense',
      'Are you sure you want to stop safety monitoring?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            await deactivateShadowSense();
            router.back();
          },
        },
      ]
    );
  };

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return '#c94a4a';
      case 'HIGH':
        return '#e89f3c';
      case 'MEDIUM':
        return '#e8c93c';
      case 'LOW':
        return '#9ce83c';
      default:
        return '#4ac97e';
    }
  };

  const calculateAccelMagnitude = () => {
    const { x, y, z } = sensorData.accelerometer;
    return Math.sqrt(x * x + y * y + z * z).toFixed(2);
  };

  const calculateGyroMagnitude = () => {
    const { x, y, z } = sensorData.gyroscope;
    return Math.sqrt(x * x + y * y + z * z).toFixed(2);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <LinearGradient colors={['#521684', '#1c052f']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ShadowSense Monitor</Text>
          <Text style={styles.subtitle}>Real-time Safety Analysis</Text>
        </View>

        {/* SOS Alert */}
        {sosActive && (
          <View style={styles.sosAlert}>
            <Text style={styles.sosAlertText}>🚨 SOS ACTIVE</Text>
            <Text style={styles.sosAlertSubtext}>Emergency recording in progress</Text>
          </View>
        )}

        {/* Risk Score Display */}
        <Animated.View
          style={[
            styles.riskCard,
            { transform: [{ scale: pulseAnim }] },
            { borderColor: getRiskColor() },
          ]}
        >
          <Text style={styles.riskLabel}>Current Risk Level</Text>
          <Text style={[styles.riskLevel, { color: getRiskColor() }]}>
            {riskLevel}
          </Text>
          <Text style={styles.riskScore}>{riskScore}/100</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${riskScore}%`, backgroundColor: getRiskColor() },
              ]}
            />
          </View>

          {/* Risk Description */}
          <Text style={styles.riskDescription}>
            {riskLevel === 'CRITICAL' && 'Critical danger detected! SOS triggered.'}
            {riskLevel === 'HIGH' && 'High risk detected. Stay alert!'}
            {riskLevel === 'MEDIUM' && 'Moderate risk. Be cautious.'}
            {riskLevel === 'LOW' && 'Low risk. Continue monitoring.'}
            {riskLevel === 'SAFE' && 'You are safe. All sensors normal.'}
          </Text>
        </Animated.View>

        {/* Sensor Breakdowns */}
        <View style={styles.sensorsSection}>
          <Text style={styles.sectionTitle}>Sensor Data</Text>

          {/* Accelerometer */}
          <View style={styles.sensorCard}>
            <Text style={styles.sensorTitle}>📱 Accelerometer</Text>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>X:</Text>
              <Text style={styles.sensorValue}>
                {sensorData.accelerometer.x.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Y:</Text>
              <Text style={styles.sensorValue}>
                {sensorData.accelerometer.y.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Z:</Text>
              <Text style={styles.sensorValue}>
                {sensorData.accelerometer.z.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Magnitude:</Text>
              <Text style={styles.sensorValue}>
                {calculateAccelMagnitude()} m/s²
              </Text>
            </View>
            <Text style={styles.sensorNote}>
              {parseFloat(calculateAccelMagnitude()) > 15
                ? '⚠️ Sudden movement detected'
                : parseFloat(calculateAccelMagnitude()) < 1.5
                ? '⚠️ Prolonged stillness'
                : '✓ Normal movement'}
            </Text>
          </View>

          {/* Gyroscope */}
          <View style={styles.sensorCard}>
            <Text style={styles.sensorTitle}>🔄 Gyroscope</Text>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>X:</Text>
              <Text style={styles.sensorValue}>
                {sensorData.gyroscope.x.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Y:</Text>
              <Text style={styles.sensorValue}>
                {sensorData.gyroscope.y.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Z:</Text>
              <Text style={styles.sensorValue}>
                {sensorData.gyroscope.z.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Magnitude:</Text>
              <Text style={styles.sensorValue}>
                {calculateGyroMagnitude()} rad/s
              </Text>
            </View>
            <Text style={styles.sensorNote}>
              {parseFloat(calculateGyroMagnitude()) > 3
                ? '⚠️ Erratic motion detected'
                : Math.abs(sensorData.gyroscope.z) > 2
                ? '⚠️ Rapid direction change'
                : '✓ Stable orientation'}
            </Text>
          </View>

          {/* Light Sensor */}
          <View style={styles.sensorCard}>
            <Text style={styles.sensorTitle}>💡 Light Sensor</Text>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Illuminance:</Text>
              <Text style={styles.sensorValue}>{sensorData.light.toFixed(1)} lux</Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Low Light Duration:</Text>
              <Text style={styles.sensorValue}>
                {formatDuration(sensorData.lowLightDuration)}
              </Text>
            </View>
            <Text style={styles.sensorNote}>
              {sensorData.light < 10
                ? sensorData.lowLightDuration > 30
                  ? '⚠️ Extended low light detected'
                  : '⚠️ Low light environment'
                : '✓ Adequate lighting'}
            </Text>
          </View>

          {/* Movement Analysis */}
          <View style={styles.sensorCard}>
            <Text style={styles.sensorTitle}>🚶 Movement Analysis</Text>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Step Count:</Text>
              <Text style={styles.sensorValue}>{sensorData.stepCount}</Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Sudden Movements:</Text>
              <Text style={styles.sensorValue}>
                {sensorData.suddenMovements.toFixed(1)}
              </Text>
            </View>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Still Duration:</Text>
              <Text style={styles.sensorValue}>
                {formatDuration(sensorData.prolongedStill)}
              </Text>
            </View>
            <Text style={styles.sensorNote}>
              {sensorData.suddenMovements > 2
                ? '⚠️ Multiple sudden movements'
                : sensorData.prolongedStill > 60
                ? '⚠️ Prolonged stillness detected'
                : '✓ Normal activity'}
            </Text>
          </View>
        </View>

        {/* Stop Button */}
        <TouchableOpacity style={styles.stopButton} onPress={handleStopMonitoring}>
          <Text style={styles.stopButtonText}>Stop Monitoring</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ac78cf',
  },
  sosAlert: {
    backgroundColor: '#c94a4a',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  sosAlertText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sosAlertSubtext: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  riskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 3,
  },
  riskLabel: {
    fontSize: 16,
    color: '#ac78cf',
    marginBottom: 10,
  },
  riskLevel: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  riskScore: {
    fontSize: 24,
    color: '#e0c8c4',
    marginBottom: 15,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  riskDescription: {
    fontSize: 14,
    color: '#e0c8c4',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sensorsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  sensorCard: {
    backgroundColor: 'rgba(101, 42, 156, 0.3)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#652a9c',
  },
  sensorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sensorLabel: {
    fontSize: 14,
    color: '#ac78cf',
  },
  sensorValue: {
    fontSize: 14,
    color: '#e0c8c4',
    fontWeight: '600',
  },
  sensorNote: {
    fontSize: 12,
    color: '#e0c8c4',
    marginTop: 8,
    fontStyle: 'italic',
  },
  stopButton: {
    backgroundColor: '#c94a4a',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});