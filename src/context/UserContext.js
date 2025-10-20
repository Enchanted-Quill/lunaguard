// context/UserContext.js
import React, { createContext, useState, useContext } from 'react';

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
    // Incidents
    incidents,
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