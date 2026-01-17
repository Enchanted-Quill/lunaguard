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

  // Evidence Locker state
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceFolders, setEvidenceFolders] = useState([]);

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

      try {
        const userRef = firestore().collection('users').doc(user.uid);
        const docSnap = await userRef.get();

        if (docSnap.exists) {
          const data = docSnap.data();
          if (data.userProfile) setUserProfile(data.userProfile);
          if (data.permissions) setPermissions(data.permissions);
          if (data.shortcuts) setShortcuts(data.shortcuts);
          if (data.emergencyContacts) setEmergencyContacts(data.emergencyContacts);

          // Load evidence locker data
          if (data.evidenceFiles) setEvidenceFiles(data.evidenceFiles);
          if (data.evidenceFolders) setEvidenceFolders(data.evidenceFolders);
        } else {
          // Create default Firestore doc if it doesn't exist
          await userRef.set({
            userProfile,
            permissions,
            shortcuts,
            emergencyContacts,
            evidenceFiles: [],
            evidenceFolders: [],
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // --- Profile Functions ---
  const updateProfile = async updates => {
    const newProfile = { ...userProfile, ...updates };
    setUserProfile(newProfile);
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({ userProfile: newProfile }, { merge: true });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
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
    const newPermissions = { ...permissions, ...updates };
    setPermissions(newPermissions);
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({ permissions: newPermissions }, { merge: true });
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  // --- Shortcuts Functions ---
  const updateShortcuts = async updates => {
    const newShortcuts = { ...shortcuts, ...updates };
    setShortcuts(newShortcuts);
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({ shortcuts: newShortcuts }, { merge: true });
    } catch (error) {
      console.error('Error updating shortcuts:', error);
    }
  };

  // --- Emergency Contacts Functions ---
  const updateEmergencyContacts = async contacts => {
    setEmergencyContacts(contacts);
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore().collection('users').doc(user.uid).set(
        { emergencyContacts: contacts },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating emergency contacts:', error);
    }
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

  // Evidence Locker functions with Firebase persistence
  const updateEvidenceFiles = async (newFiles) => {
    setEvidenceFiles(newFiles);
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({ evidenceFiles: newFiles }, { merge: true });
    } catch (error) {
      console.error('Error updating evidence files:', error);
    }
  };

  const updateEvidenceFolders = async (newFolders) => {
    setEvidenceFolders(newFolders);
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({ evidenceFolders: newFolders }, { merge: true });
    } catch (error) {
      console.error('Error updating evidence folders:', error);
    }
  };

  const addEvidenceFile = async (file) => {
    const newFiles = [file, ...evidenceFiles];
    await updateEvidenceFiles(newFiles);
  };

  const addEvidenceFolder = async (folder) => {
    const newFolders = [...evidenceFolders, folder];
    await updateEvidenceFolders(newFolders);
  };

  const deleteEvidenceFile = async (fileId) => {
    const newFiles = evidenceFiles.filter(file => file.id !== fileId);
    await updateEvidenceFiles(newFiles);
  };

  const deleteEvidenceFolder = async (folderId) => {
    // Move files in this folder to root
    const updatedFiles = evidenceFiles.map(file =>
      file.folderId === folderId ? { ...file, folderId: null } : file
    );
    await updateEvidenceFiles(updatedFiles);

    // Delete the folder
    const newFolders = evidenceFolders.filter(folder => folder.id !== folderId);
    await updateEvidenceFolders(newFolders);
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
    evidenceFiles,
    evidenceFolders,
    updateEvidenceFiles,
    updateEvidenceFolders,
    addEvidenceFile,
    addEvidenceFolder,
    deleteEvidenceFile,
    deleteEvidenceFolder,
    incidents,
    addIncident,
    updateIncidents,
    voteOnIncident,
    deleteIncident,
    updateIncident,
    dangerRadius,
    setDangerRadius,
    // Legacy compatibility
    contacts: emergencyContacts,
    username: userProfile.username,
    name: userProfile.name,
    email: userProfile.email || '',
    phone: userProfile.phone,
    profilePic: userProfile.profilePic,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};