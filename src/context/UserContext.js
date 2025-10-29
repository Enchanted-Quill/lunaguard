// context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};

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

  // --- Incidents ---
  const [incidents, setIncidents] = useState([
    {
      id: '1',
      title: 'Suspicious Activity',
      location: { latitude: 34.0522, longitude: -118.2437 },
      time: new Date().toISOString(),
      description: 'Person following individuals in parking lot',
      reportedBy: 'soggydollar',
    },
  ]);

  const [dangerRadius, setDangerRadius] = useState(1);

  // Clean up old incidents
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      setIncidents(prev =>
        prev.filter(incident => new Date(incident.time) >= thirtyDaysAgo)
      );
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

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
          userProfile,
          permissions,
          shortcuts,
          emergencyContacts,
        });
      }
    };

    loadUserData();
  }, []);

  // --- Profile Functions ---
  const updateProfile = async updates => {
    setUserProfile(prev => ({ ...prev, ...updates }));
    const user = auth().currentUser;
    if (!user) return;
    await firestore()
      .collection('users')
      .doc(user.uid)
      .set({ userProfile: { ...userProfile, ...updates } }, { merge: true });
  };

  const uploadProfilePic = async localUri => {
    if (!localUri) return null;
    const user = auth().currentUser;
    if (!user) return null;

    try {
      const fileName = localUri.split('/').pop();
      const storageRef = storage().ref(`profilePics/${user.uid}/${fileName}`);
      await storageRef.putFile(localUri);
      const downloadURL = await storageRef.getDownloadURL();
      await updateProfile({ profilePic: downloadURL });
      return downloadURL;
    } catch (err) {
      console.error('Firebase Storage upload error:', err);
      return null;
    }
  };

  // --- Permissions Functions ---
  const updatePermissions = async updates => {
    setPermissions(prev => ({ ...prev, ...updates }));
    const user = auth().currentUser;
    if (!user) return;
    await firestore()
      .collection('users')
      .doc(user.uid)
      .set({ permissions: { ...permissions, ...updates } }, { merge: true });
  };

  // --- Shortcuts Functions ---
  const updateShortcuts = async updates => {
    setShortcuts(prev => ({ ...prev, ...updates }));
    const user = auth().currentUser;
    if (!user) return;
    await firestore()
      .collection('users')
      .doc(user.uid)
      .set({ shortcuts: { ...shortcuts, ...updates } }, { merge: true });
  };

  // --- Emergency Contacts Functions ---
  const updateEmergencyContacts = async contacts => {
    setEmergencyContacts(contacts);
    const user = auth().currentUser;
    if (!user) return;
    await firestore().collection('users').doc(user.uid).set(
      { emergencyContacts: contacts },
      { merge: true }
    );
  };

    // Function to add incident
  const addIncident = (incident) => {
    const { username } = userProfile;
    const newIncident = {
      ...incident,
      id: Date.now().toString(),
      time: new Date().toISOString(),
      reportedBy: username,
    };
    setIncidents([...incidents, newIncident]);
  };

  // Function to update incidents
  const updateIncidents = (newIncidents) => {
    setIncidents(newIncidents);
  };

  // --- Incidents Functions ---

  const voteOnIncident = (incidentId, voteType, voterUsername) => {
    setIncidents(prev =>
      prev
        .map(incident => {
          if (incident.id !== incidentId) return incident;

          const upvotes = incident.upvotes || [];
          const downvotes = incident.downvotes || [];

          const newUpvotes = upvotes.filter(u => u !== voterUsername);
          const newDownvotes = downvotes.filter(u => u !== voterUsername);

          if (voteType === 'upvote') newUpvotes.push(voterUsername);
          else newDownvotes.push(voterUsername);

          return { ...incident, upvotes: newUpvotes, downvotes: newDownvotes };
        })
        .filter(incident => {
          const upvoteCount = incident.upvotes?.length || 0;
          const downvoteCount = incident.downvotes?.length || 0;
          const totalVotes = upvoteCount + downvoteCount;
          if (downvoteCount <= 20) return true;
          if (totalVotes === 0) return true;
          return downvoteCount / totalVotes <= 0.9;
        })
    );
  };

  const deleteIncident = incidentId => {
    setIncidents(prev => prev.filter(incident => incident.id !== incidentId));
  };

  const updateIncident = (incidentId, updates) => {
    setIncidents(prev =>
      prev.map(incident =>
        incident.id === incidentId
          ? { ...incident, ...updates, editedAt: new Date().toISOString() }
          : incident
      )
    );
  };

  const value = {
    userProfile,
    updateProfile,
    uploadProfilePic,
    permissions,
    updatePermissions,
    shortcuts,
    updateShortcuts,
    emergencyContacts,
    updateEmergencyContacts,
    incidents,
    addIncident,
    updateIncidents,
    voteOnIncident,
    deleteIncident,
    updateIncident,
    dangerRadius,
    setDangerRadius,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
