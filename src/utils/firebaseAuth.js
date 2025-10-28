// utils/firebaseAuth.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '877797615505-7ulh4595slq2roakc1gmd22aceabaufd.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export const signInWithGoogle = async () => {
  try {
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.warn('No user signed in, skipping signOut');
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const signInResult = await GoogleSignin.signIn();

    // Get Firebase credential
    const { idToken } = signInResult;
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Sign in with Firebase
    const userCredential = await auth().signInWithCredential(googleCredential);
    const user = userCredential.user;

    // Check if Firestore user exists
    const userDoc = await firestore().collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      // Create user doc
      await firestore().collection('users').doc(user.uid).set({
        userProfile: {
          name: user.displayName || '',
          username: user.displayName || '',
          phone: user.phoneNumber || '',
          profilePic: user.photoURL || null,
        },
        permissions: {
          camera: false,
          contacts: false,
          location: false,
          notifications: false,
        },
        shortcuts: {
          sos: 'Press 3 times',
          fakeCall: 'Shake phone',
          emergency: 'Hold volume down',
        },
        emergencyContacts: [
          { name: '', phone: '' },
          { name: '', phone: '' },
          { name: '', phone: '' },
        ],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      return { isNewUser: true, user };
    }

    return { isNewUser: false, user };

  } catch (error) {
    console.error('Google Sign-In Error:', error?.message || error);
    return { error: error?.message || 'Unknown error occurred during Google sign-in' };
  }
};
