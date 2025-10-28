// context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  // --- User Profile ---
  const [userProfile, setUserProfile] = useState({
    name: '',
    phone: '',
    username: '',
    profilePic: null,
  });

  // --- Permissions ---
  const [permissions, setPermissions] = useState({
    camera: false,
    contacts: false,
    location: false,
    notifications: false,
  });

  // --- Shortcuts ---
  const [shortcuts, setShortcuts] = useState({
    sos: 'Press 3 times',
    fakeCall: 'Shake phone',
    emergency: 'Hold volume down',
  });

  // --- Emergency Contacts ---
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' },
  ]);

  // --- Load user data on app start ---
  useEffect(() => {
    const loadUserData = async () => {
      const user = auth().currentUser;
      if (!user) return;

      const userRef = firestore().collection('users').doc(user.uid);
      const docSnap = await userRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        if (data.userProfile) setUserProfile(data.userProfile);
        if (data.permissions) setPermissions(data.permissions);
        if (data.shortcuts) setShortcuts(data.shortcuts);
        if (data.emergencyContacts) setEmergencyContacts(data.emergencyContacts);
      } else {
        // Create default Firestore doc if it doesn't exist
        await userRef.set({
          userProfile: {
            name: user.displayName || '',
            username: user.displayName || '',
            phone: user.phoneNumber || '',
            profilePic: null,
          },
          permissions,
          shortcuts,
          emergencyContacts,
        });
      }
    };

    loadUserData();
  }, []);

  // --- Profile Functions ---
  const updateProfile = async (updates) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
    const user = auth().currentUser;
    if (!user) return;
    await firestore().collection('users').doc(user.uid).set(
      { userProfile: { ...userProfile, ...updates } },
      { merge: true }
    );
  };

  const uploadProfilePic = async (localUri) => {
    if (!localUri) return null;
    const user = auth().currentUser;
    if (!user) return null;

    try {
      const fileName = localUri.split('/').pop();
      const storageRef = storage().ref(`profilePics/${user.uid}/${fileName}`);

      // Upload local file directly
      await storageRef.putFile(localUri);

      // Get download URL
      const downloadURL = await storageRef.getDownloadURL();

      // Update Firestore and local context
      await updateProfile({ profilePic: downloadURL });
      return downloadURL;
    } catch (err) {
      console.error('Firebase Storage upload error:', err);
      return null;
    }
  };

  // --- Permissions Functions ---
  const updatePermissions = async (updates) => {
    setPermissions((prev) => ({ ...prev, ...updates }));
    const user = auth().currentUser;
    if (!user) return;
    await firestore().collection('users').doc(user.uid).set(
      { permissions: { ...permissions, ...updates } },
      { merge: true }
    );
  };

  // --- Shortcuts Functions ---
  const updateShortcuts = async (updates) => {
    setShortcuts((prev) => ({ ...prev, ...updates }));
    const user = auth().currentUser;
    if (!user) return;
    await firestore().collection('users').doc(user.uid).set(
      { shortcuts: { ...shortcuts, ...updates } },
      { merge: true }
    );
  };

  // --- Emergency Contacts Functions ---
  const updateEmergencyContacts = async (contacts) => {
    setEmergencyContacts(contacts);
    const user = auth().currentUser;
    if (!user) return;
    await firestore().collection('users').doc(user.uid).set(
      { emergencyContacts: contacts },
      { merge: true }
    );
  };

  return (
    <UserContext.Provider
      value={{
        userProfile,
        updateProfile,
        uploadProfilePic,
        permissions,
        updatePermissions,
        shortcuts,
        updateShortcuts,
        emergencyContacts,
        updateEmergencyContacts,
        setUserProfile,
        setPermissions,
        setShortcuts,
        setEmergencyContacts,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
