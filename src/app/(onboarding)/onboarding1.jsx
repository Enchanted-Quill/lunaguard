import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import { useUser } from '../../context/UserContext';
import { onboardingStyles as styles } from './styles';
import { useRouter } from "expo-router";

const OnboardingScreen1 = ({  }) => {
  const router = useRouter();

  const { userProfile, updateProfile } = useUser(); // Use context only
  const [firstName, setFirstName] = useState(userProfile.name.split(' ')[0] || '');
  const [lastName, setLastName] = useState(userProfile.name.split(' ').slice(1).join(' ') || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phone || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = auth().currentUser;
    if (user) {
      // Prefill phone number if signed in via phone
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
      // Prefill displayName if exists
      if (user.displayName && !firstName && !lastName) {
        const [first, ...rest] = user.displayName.split(' ');
        setFirstName(first || '');
        setLastName(rest.join(' ') || '');
      }
    }
  }, []);

  const handleNext = () => {
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) return;

    // Update context only
    updateProfile({
      name: `${firstName} ${lastName}`,
      phone: phoneNumber,
    });

    // Navigate to next onboarding screen
    router.push('/onboarding2');
  };

  const canProceed = firstName.trim() && lastName.trim() && phoneNumber.trim();

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#aa63d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile Details</Text>
          <Text style={styles.subtitle}>(name, phone, picture, contacts)</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              editable={!auth().currentUser?.phoneNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed || loading}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingScreen1;
