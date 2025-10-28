// firebase.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// No initializeApp needed bc native firebase

export { auth, firestore as db, storage };
