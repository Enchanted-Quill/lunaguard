import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../../context/UserContext';
import { onboardingStyles as styles } from './styles';
import { useRouter } from 'expo-router';

const OnboardingScreen2 = () => {
  const router = useRouter();
  const { userProfile, updateProfile, uploadProfilePic } = useUser(); 
  const [username, setUsernameLocal] = useState(userProfile.username || '');
  const [profilePic, setProfilePicLocal] = useState(userProfile.profilePic || null);
  const [loading, setLoading] = useState(false);

  // Pick an image from gallery
  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setProfilePicLocal(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleNext = async () => {
    if (!username.trim()) return;

    setLoading(true);
    try {
      let uploadedProfilePic = profilePic;

      // If the user selected a new local image, upload it
      if (profilePic && !profilePic.startsWith('https://')) {
        const downloadURL = await uploadProfilePic(profilePic);
        if (downloadURL) {
          uploadedProfilePic = downloadURL;
        }
      }

      // Update username and profilePic in context & Firestore
      await updateProfile({
        username,
        profilePic: uploadedProfilePic,
      });

      // Navigate to next screen
      router.push('/onboarding3');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = username.trim();

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
          <Text style={styles.subtitle}>(username and profile picture)</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username (visible to others)</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsernameLocal}
              placeholder="Choose a username"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Picture (optional)</Text>
            <View style={styles.profilePicContainer}>
              <View style={styles.profilePicCircle}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.profilePicImage} />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 32 }}>+</Text>
                )}
              </View>
              <TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}>
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, styles.nextButtonFlex, !canProceed && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingScreen2;
