import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronLeft, Phone } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useUser } from '../../context/UserContext';
import { onboardingStyles as styles } from './styles';
import { useRouter } from 'expo-router';

const OnboardingScreen4 = () => {
  const router = useRouter();
  const {
    userProfile,
    emergencyContacts,
    shortcuts,
    updateProfile,
    updateEmergencyContacts,
    uploadProfilePic,
  } = useUser();
  const { name, username, profilePic } = userProfile;

  const [contactsLocal, setContactsLocal] = useState(
    emergencyContacts.length
      ? emergencyContacts
      : [
          { name: '', phone: '' },
          { name: '', phone: '' },
          { name: '', phone: '' },
        ]
  );
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateContact = (index, field, value) => {
    setContactsLocal((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const saveToFirebase = async () => {
    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('No authenticated user found.');

      let profilePicUrl = profilePic;

      // Upload local profile pic to Firebase Storage
      if (profilePic && !profilePic.startsWith('https://')) {
        const downloadURL = await uploadProfilePic(profilePic);
        if (downloadURL) profilePicUrl = downloadURL;
      }

      // Validate emergency contacts
      const validContacts = contactsLocal.filter(
        (c) => c.name?.trim() && c.phone?.trim()
      );

      // Save everything to Firestore
      await firestore().collection('users').doc(user.uid).set(
        {
          userProfile: { name, username, profilePic: profilePicUrl },
          shortcuts,
          emergencyContacts: validContacts,
          onboardingCompleted: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Update context
      await updateProfile({ name, username, profilePic: profilePicUrl });
      await updateEmergencyContacts(validContacts);

      Alert.alert('Success', 'Profile saved successfully!');
      router.replace('/home');
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed =
    contactsLocal.some((c) => c.name.trim() && c.phone.trim()) &&
    privacyAccepted;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>App Info</Text>
          <Text style={styles.subtitle}>Pick 1-3 emergency contacts</Text>
        </View>

        <View style={styles.form}>
          {contactsLocal.map((contact, index) => (
            <View key={index} style={styles.contactBox}>
              <TextInput
                style={styles.input}
                value={contact.name}
                onChangeText={(value) => updateContact(index, 'name', value)}
                placeholder={`Contact ${index + 1} Name`}
                placeholderTextColor="#999"
              />
              <View style={styles.phoneInputContainer}>
                <Phone color="#fff" size={20} style={styles.phoneIcon} />
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={contact.phone}
                  onChangeText={(value) => updateContact(index, 'phone', value)}
                  placeholder="Phone Number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          ))}

          <View style={styles.privacyBox}>
            <TouchableOpacity
              style={styles.privacyCheckbox}
              onPress={() => setPrivacyAccepted(!privacyAccepted)}
            >
              <View
                style={[
                  styles.checkbox,
                  privacyAccepted && styles.checkboxChecked,
                ]}
              >
                {privacyAccepted && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.privacyText}>Agree to privacy policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, styles.progressDotActive]}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextButton,
            styles.nextButtonFlex,
            (!canProceed || loading) && styles.nextButtonDisabled,
          ]}
          onPress={saveToFirebase}
          disabled={!canProceed || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>Finish</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingScreen4;
