import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, ChevronLeft, Camera, Phone, MapPin, Bell, Check, Shield } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../../context/UserContext';
import { onboardingStyles as styles } from './styles';
import { useRouter } from "expo-router";

const OnboardingScreen3 = ({ }) => {
  const router = useRouter();

  const { updatePermissions, setShortcuts } = useUser();

  const [permissions, setPermissionsLocal] = useState({
    camera: false,
    contacts: false,
    location: false,
    notifications: false,
  });

  const [shortcuts] = useState({
    sos: 'Press 3 times',
    fakeCall: 'Shake phone',
    emergency: 'Hold volume down',
  });

  const requestPermission = async (type) => {
    try {
      switch (type) {
        case 'camera': {
          const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
          setPermissionsLocal(prev => ({ ...prev, camera: cameraResult.granted }));
          break;
        }
        case 'contacts': {
          const contactResult = await Contacts.requestPermissionsAsync();
          setPermissionsLocal(prev => ({ ...prev, contacts: contactResult.granted }));
          break;
        }
        case 'location': {
          const locationResult = await Location.requestForegroundPermissionsAsync();
          setPermissionsLocal(prev => ({ ...prev, location: locationResult.granted }));
          break;
        }
        case 'notifications': {
          // For simplicity, mark notifications as granted
          setPermissionsLocal(prev => ({ ...prev, notifications: true }));
          break;
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const handleNext = () => {
    // Update context only
    updatePermissions(permissions);
    setShortcuts(shortcuts);

    // Navigate to next screen
    router.push('/onboarding4');
  };

  const allPermissionsGranted = Object.values(permissions).every(p => p);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile Details 2</Text>
          <Text style={styles.subtitle}>(emergency contacts, shortcuts, permissions)</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.permissionBox}>
            <View style={styles.permissionHeader}>
              <Shield color="#fff" size={20} />
              <Text style={styles.permissionTitle}>Allow Permissions</Text>
            </View>
            <Text style={styles.permissionSubtitle}>
              Allow camera, contacts, and location access
            </Text>

            <View style={styles.permissionButtons}>
              {['camera', 'contacts', 'location', 'notifications'].map((type) => {
                const icons = {
                  camera: <Camera color="#fff" size={20} />,
                  contacts: <Phone color="#fff" size={20} />,
                  location: <MapPin color="#fff" size={20} />,
                  notifications: <Bell color="#fff" size={20} />,
                };
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.permissionButton, permissions[type] && styles.permissionButtonActive]}
                    onPress={() => requestPermission(type)}
                  >
                    <View style={styles.permissionButtonContent}>
                      {icons[type]}
                      <Text style={styles.permissionButtonText}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </View>
                    {permissions[type] && <Check color="#fff" size={20} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.shortcutsBox}>
            <Text style={styles.shortcutsTitle}>Shortcuts</Text>
            <Text style={styles.shortcutsSubtitle}>Set custom shortcuts (can edit later)</Text>
            <View style={styles.shortcutsList}>
              {Object.entries(shortcuts).map(([key, value]) => (
                <View key={key} style={styles.shortcutItem}>
                  <View style={styles.shortcutDot} />
                  <Text style={styles.shortcutText}>
                    {`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot]} />
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, styles.nextButtonFlex, !allPermissionsGranted && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!allPermissionsGranted}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingScreen3;
