// utils/firebaseAuth.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { initializeApp } from '@react-native-firebase/app';

if (!auth().app) {
  initializeApp();
}

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '877797615505-7ulh4595slq2roakc1gmd22aceabaufd.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export const signInWithGoogle = async () => {
    try {
      await GoogleSignin.signOut();
      const result = await GoogleSignin.signIn();
      const { idToken } = result.data;

      if (!idToken) {
        throw new Error(
          'Google Sign-In failed: no idToken returned. Check webClientId, SHA-1, and device Google Play Services.'
        );
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      return userCredential.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
};


