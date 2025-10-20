// utils/firebaseAuth.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { Alert } from 'react-native';

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const { idToken } = await GoogleSignin.signIn();

    const googleCredential = GoogleAuthProvider.credential(idToken);

    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, googleCredential);

    return userCredential.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};
