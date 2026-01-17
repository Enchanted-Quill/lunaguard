import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "../context/UserContext";
import { useShadowSense } from "../context/ShadowSenseContext";
import SOSService from "../utils/sosService";

const logo = require("../assets/logo.png");

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, emergencyContacts } = useUser();
  const { isActive: shadowSenseActive, activateShadowSense } = useShadowSense();
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [shadowSenseLoading, setShadowSenseLoading] = useState(false);

  const handleSOS = async () => {
    if (sosActive) {
      // Stop SOS
      Alert.alert(
        'End SOS',
        'Are you sure you want to end the emergency session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End SOS',
            style: 'destructive',
            onPress: async () => {
              try {
                setSosLoading(true);
                await SOSService.stopSOS();
                setSosActive(false);
                Alert.alert(
                  'SOS Ended',
                  'Emergency session has been ended. Recording saved to Evidence Locker.'
                );
              } catch (error) {
                console.error('Error ending SOS:', error);
                Alert.alert('Error', 'Failed to end SOS session');
              } finally {
                setSosLoading(false);
              }
            },
          },
        ]
      );
    } else {
      // Start SOS
      Alert.alert(
        'Start SOS',
        'This will start emergency recording and alert your contacts. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start SOS',
            style: 'destructive',
            onPress: async () => {
              try {
                setSosLoading(true);

                // Check if contacts exist
                if (!emergencyContacts || emergencyContacts.length === 0) {
                  Alert.alert(
                    'No Emergency Contacts',
                    'Please add emergency contacts in Settings before using SOS.'
                  );
                  setSosLoading(false);
                  return;
                }

                // Start SOS
                const result = await SOSService.startSOS(
                  userProfile.username || userProfile.name,
                  emergencyContacts
                );

                setSosActive(true);

                Alert.alert(
                  'SOS Active',
                  `Emergency recording started. Your contacts have been notified.\n\nViewer Link: ${result.viewerLink}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('Error starting SOS:', error);
                Alert.alert(
                  'Error',
                  `Failed to start SOS: ${error.message}\n\nPlease check your permissions in Settings.`
                );
              } finally {
                setSosLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleStartShadowSense = async () => {
    if (shadowSenseActive) {
      // If already active, just navigate to the screen
      router.push('/shadowsense');
      return;
    }

    Alert.alert(
      'Start ShadowSense',
      'ShadowSense will monitor your environment and automatically trigger SOS if danger is detected. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              setShadowSenseLoading(true);

              // Check if contacts exist
              if (!emergencyContacts || emergencyContacts.length === 0) {
                Alert.alert(
                  'No Emergency Contacts',
                  'Please add emergency contacts in Settings before using ShadowSense.'
                );
                setShadowSenseLoading(false);
                return;
              }

              // Start ShadowSense
              const success = await activateShadowSense(userProfile, emergencyContacts);

              if (success) {
                Alert.alert(
                  'ShadowSense Active',
                  'Background monitoring started. You will be alerted if danger is detected.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push('/shadowsense'),
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Error',
                  'Failed to start ShadowSense. Please check your permissions in Settings.'
                );
              }
            } catch (error) {
              console.error('Error starting ShadowSense:', error);
              Alert.alert('Error', `Failed to start ShadowSense: ${error.message}`);
            } finally {
              setShadowSenseLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#521684", "#1c052f"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Main content */}
      <SafeAreaView style={styles.inner}>
        {/* Logo */}
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        {/* Title */}
        <Text style={styles.title}>
          <Text style={styles.luna}>luna</Text>
          <Text style={styles.guard}>guard</Text>
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>What do you want to do today?</Text>

        {/* Settings Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>

        {/* Map Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/map")}
        >
          <Text style={styles.buttonText}>Map</Text>
        </TouchableOpacity>

        {/* Empowerment Circles Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/chat")}
        >
          <Text style={styles.buttonText}>Self Defense Learning</Text>
        </TouchableOpacity>

        {/* Evidence Locker Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/evidence")}
        >
          <Text style={styles.buttonText}>Evidence Locker</Text>
        </TouchableOpacity>

        {/* ShadowSense Button */}
        <TouchableOpacity
          style={[
            styles.button,
            shadowSenseActive && styles.shadowSenseActiveButton,
          ]}
          activeOpacity={0.5}
          onPress={handleStartShadowSense}
          disabled={shadowSenseLoading}
        >
          {shadowSenseLoading ? (
            <ActivityIndicator color="#e0c8c4" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {shadowSenseActive ? '👁️ ShadowSense (Active)' : 'ShadowSense'}
            </Text>
          )}
        </TouchableOpacity>

        {/* SOS Button */}
        <TouchableOpacity
          style={[
            styles.emergencyButton,
            sosActive && styles.emergencyButtonActive,
          ]}
          activeOpacity={0.5}
          onPress={handleSOS}
          disabled={sosLoading}
        >
          <LinearGradient
            colors={sosActive ? ["#4caf50", "#2e7d32"] : ["#eb697c", "#7e1067"]}
            style={styles.gradientBackground}
          />
          {sosLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {sosActive ? "End SOS" : "SOS"}
            </Text>
          )}
        </TouchableOpacity>

        {sosActive && (
          <View style={styles.sosIndicator}>
            <View style={styles.sosPulse} />
            <Text style={styles.sosIndicatorText}>🔴 Recording Active</Text>
          </View>
        )}

        {shadowSenseActive && !sosActive && (
          <View style={styles.shadowSenseIndicator}>
            <View style={styles.shadowSensePulse} />
            <Text style={styles.shadowSenseIndicatorText}>
              👁️ ShadowSense Monitoring
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 12,
  },
  luna: {
    color: "#e1c8f5",
  },
  guard: {
    color: "#ac78cf",
  },
  subtitle: {
    fontSize: 18,
    color: "#e0c8c4",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    width: 200,
    marginVertical: 8,
    alignSelf: "center",
    alignItems: "center",
  },
  shadowSenseActiveButton: {
    backgroundColor: "#aa63d2",
  },
  buttonText: {
    color: "#e0c8c4",
    fontSize: 16,
    fontWeight: "600",
  },
  emergencyButton: {
    borderRadius: 25,
    paddingVertical: 12,
    width: 200,
    marginVertical: 8,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyButtonActive: {},
  gradientBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 25,
  },
  sosIndicator: {
    marginTop: 20,
    alignItems: "center",
    position: "relative",
  },
  sosPulse: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff0000",
    top: 5,
    left: -20,
  },
  sosIndicatorText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
  },
  shadowSenseIndicator: {
    marginTop: 10,
    alignItems: "center",
    position: "relative",
  },
  shadowSensePulse: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#aa63d2",
    top: 5,
    left: -20,
  },
  shadowSenseIndicatorText: {
    color: "#aa63d2",
    fontSize: 14,
    fontWeight: "600",
  },
})