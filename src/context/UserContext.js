// context/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // User profile state
  const [username, setUsername] = useState("soggydollar");
  const [name, setName] = useState("Sarah");
  const [email, setEmail] = useState("sarah@gmail.com");
  const [phone, setPhone] = useState("0123456789");
  const [profilePic, setProfilePic] = useState(null);

  // Emergency contacts state
  const [contacts, setContacts] = useState([
    { name: "Contact 1", email: "a@gmail.com", phone: "0123456789" },
  ]);

  // Shortcuts state
  const [shortcuts, setShortcuts] = useState({
    shortcut1: "SOS",
    shortcut2: "Fake Call",
  });

  // Danger radius state for map
  const [dangerRadius, setDangerRadius] = useState(1);

  // Incidents state for map
  const [incidents, setIncidents] = useState([
    // Example incident for testing
    {
      id: '1',
      title: 'Suspicious Activity',
      location: { latitude: 34.0522, longitude: -118.2437 },
      time: new Date().toISOString(),
      description: 'Person following individuals in parking lot',
      reportedBy: 'soggydollar',
    }
  ]);

  // Clean up old incidents
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      setIncidents(prevIncidents =>
        prevIncidents.filter(incident =>
          new Date(incident.time) >= thirtyDaysAgo
        )
      );
    }, 24 * 60 * 60 * 1000); // Check once per day

    return () => clearInterval(cleanupInterval);
  }, []);

  // Function to update profile
  const updateProfile = (profileData) => {
    if (profileData.username !== undefined) setUsername(profileData.username);
    if (profileData.name !== undefined) setName(profileData.name);
    if (profileData.email !== undefined) setEmail(profileData.email);
    if (profileData.phone !== undefined) setPhone(profileData.phone);
    if (profileData.profilePic !== undefined) setProfilePic(profileData.profilePic);
  };

  // Function to add contact
  const addContact = (contact) => {
    setContacts([...contacts, contact]);
  };

  // Function to update contacts
  const updateContacts = (newContacts) => {
    setContacts(newContacts);
  };

  // Function to update shortcuts
  const updateShortcuts = (newShortcuts) => {
    setShortcuts(newShortcuts);
  };

  // Function to add incident
  const addIncident = (incident) => {
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

  // Function to upvote/downvote incidents in map
  const voteOnIncident = (incidentId, voteType, voterUsername) => {
    setIncidents(prevIncidents => {
      const updatedIncidents = prevIncidents.map(incident => {
        if (incident.id !== incidentId) return incident;

        const upvotes = incident.upvotes || [];
        const downvotes = incident.downvotes || [];

        // Remove from both arrays first
        const newUpvotes = upvotes.filter(u => u !== voterUsername);
        const newDownvotes = downvotes.filter(u => u !== voterUsername);

        // Add to appropriate array
        if (voteType === 'upvote') {
          newUpvotes.push(voterUsername);
        } else if (voteType === 'downvote') {
          newDownvotes.push(voterUsername);
        }

        return {
          ...incident,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
        };
      });

      // Filter out incidents with >20 downvotes and >90% downvote ratio
      return updatedIncidents.filter(incident => {
        const upvoteCount = incident.upvotes?.length || 0;
        const downvoteCount = incident.downvotes?.length || 0;
        const totalVotes = upvoteCount + downvoteCount;

        // Keep incident if it doesn't meet removal criteria
        if (downvoteCount <= 20) return true;
        if (totalVotes === 0) return true;

        const downvoteRatio = downvoteCount / totalVotes;
        return downvoteRatio <= 0.9; // Remove if ratio > 90%
      });
    });
  };

  // Function to delete one's own incidents
  const deleteIncident = (incidentId) => {
    setIncidents(prevIncidents =>
      prevIncidents.filter(incident => incident.id !== incidentId)
    );
  };

  // Function to edit one's own incidents
  const updateIncident = (incidentId, updates) => {
    setIncidents(prevIncidents =>
      prevIncidents.map(incident =>
        incident.id === incidentId
          ? { ...incident, ...updates, editedAt: new Date().toISOString() }
          : incident
      )
    );
  };

  const value = {
    // Profile data
    username,
    name,
    email,
    phone,
    profilePic,
    // Contacts
    contacts,
    // Shortcuts
    shortcuts,
    // Danger radius
    dangerRadius,
    setDangerRadius,
    // Incidents
    incidents,
    voteOnIncident,
    deleteIncident,
    updateIncident,
    // Update functions
    updateProfile,
    addContact,
    updateContacts,
    updateShortcuts,
    addIncident,
    updateIncidents,
    setUsername,
    setName,
    setEmail,
    setPhone,
    setProfilePic,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};