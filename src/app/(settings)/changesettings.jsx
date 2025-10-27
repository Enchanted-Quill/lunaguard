import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { useUser } from "../../context/UserContext";

export default function ChangeSettingsScreen() {
  const router = useRouter();
  const {
    username: globalUsername,
    name: globalName,
    email: globalEmail,
    phone: globalPhone,
    profilePic: globalProfilePic,
    contacts: globalContacts,
    shortcuts: globalShortcuts,
    dangerRadius: globalDangerRadius,
    updateProfile,
    updateContacts,
    updateShortcuts,
    setDangerRadius,
  } = useUser();

  // Local state for editing - initialize from global context
  const [username, setUsername] = useState(globalUsername);
  const [name, setName] = useState(globalName);
  const [email, setEmail] = useState(globalEmail);
  const [phone, setPhone] = useState(globalPhone);
  const [profilePic, setProfilePic] = useState(globalProfilePic);
  const [contacts, setContacts] = useState([...globalContacts]);
  const [shortcuts, setShortcuts] = useState({...globalShortcuts});

  // State for adding new contact
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Danger radius state
  const [localDangerRadius, setLocalDangerRadius] = useState(globalDangerRadius);

  // Profile image picker
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  // Toggle add contact form
  const handleAddContactToggle = () => {
    if (showAddContact) {
      // If form is showing and user clicks button, add the contact
      if (newContactName && newContactEmail && newContactPhone) {
        setContacts([...contacts, {
          name: newContactName,
          email: newContactEmail,
          phone: newContactPhone
        }]);
        // Reset form
        setNewContactName('');
        setNewContactEmail('');
        setNewContactPhone('');
        setShowAddContact(false);
      }
    } else {
      // Show the form
      setShowAddContact(true);
    }
  };

  // Save changes to global context
  const handleSave = () => {
    // Update all global state
    updateProfile({
      username: username,
      name: name,
      email: email,
      phone: phone,
      profilePic: profilePic,
    });
    updateContacts(contacts);
    updateShortcuts(shortcuts);
    setDangerRadius(localDangerRadius);

    // Navigate back immediately
    router.back();
  };

  return (
    <LinearGradient colors={["#521684", "#1c052f"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Change Settings</Text>
        </View>

        {/* Profile section */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={
                profilePic
                  ? { uri: profilePic }
                  : require("../../assets/pfp.jpg")
              }
              style={styles.profilePic}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={styles.inputRow}>
              <Text style={styles.profileLabel}>Username:</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(text) => setUsername(text)}
                placeholder="Enter username"
                placeholderTextColor="#ccc"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.profileLabel}>Name:</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(text) => setName(text)}
                placeholder="Enter name"
                placeholderTextColor="#ccc"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.profileLabel}>Email:</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => setEmail(text)}
                placeholder="Enter email"
                placeholderTextColor="#ccc"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.profileLabel}>Phone:</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(text) => setPhone(text)}
                placeholder="Enter phone"
                placeholderTextColor="#ccc"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Emergency Contacts */}
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableText, styles.headerText]}>Name</Text>
            <Text style={[styles.tableText, styles.headerText]}>Email</Text>
            <Text style={[styles.tableText, styles.headerText]}>Phone #</Text>
          </View>
          {contacts.map((c, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.tableText}>{c.name}</Text>
              <Text style={styles.tableText}>{c.email}</Text>
              <Text style={styles.tableText}>{c.phone}</Text>
            </View>
          ))}
        </View>

        {/* Add Contact Form */}
        {showAddContact && (
          <View style={styles.addContactForm}>
            <TextInput
              style={styles.input}
              value={newContactName}
              onChangeText={setNewContactName}
              placeholder="Contact Name"
              placeholderTextColor="#ccc"
            />
            <TextInput
              style={styles.input}
              value={newContactEmail}
              onChangeText={setNewContactEmail}
              placeholder="Contact Email"
              placeholderTextColor="#ccc"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              placeholder="Contact Phone"
              placeholderTextColor="#ccc"
              keyboardType="phone-pad"
            />
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleAddContactToggle}>
          <Text style={styles.addButtonText}>
            {showAddContact ? '✓ Add Contact' : '+ Add Contact'}
          </Text>
        </TouchableOpacity>

        {/* Shortcuts */}
        <Text style={styles.sectionTitle}>Shortcuts</Text>
        <View style={styles.shortcutRow}>
          <Text style={styles.shortcutLabel}>Tap side bar twice</Text>
          <Picker
            selectedValue={shortcuts.shortcut1}
            style={styles.picker}
            dropdownIconColor="#fff"
            onValueChange={(val) => setShortcuts({ ...shortcuts, shortcut1: val })}
          >
            <Picker.Item label="SOS" value="SOS" />
            <Picker.Item label="Fake Call" value="Fake Call" />
            <Picker.Item label="Record Audio" value="Record Audio" />
          </Picker>
        </View>
        <View style={styles.shortcutRow}>
          <Text style={styles.shortcutLabel}>Press home button 3 times</Text>
          <Picker
            selectedValue={shortcuts.shortcut2}
            style={styles.picker}
            dropdownIconColor="#fff"
            onValueChange={(val) => setShortcuts({ ...shortcuts, shortcut2: val })}
          >
            <Picker.Item label="SOS" value="SOS" />
            <Picker.Item label="Fake Call" value="Fake Call" />
            <Picker.Item label="Record Audio" value="Record Audio" />
          </Picker>
        </View>

        {/* Danger Radius */}
        <Text style={styles.sectionTitle}>Danger Radius</Text>
        <Text style={styles.shortcutLabel}>
          Routes avoid incidents within: {localDangerRadius} mile{localDangerRadius !== 1 ? 's' : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
          <TouchableOpacity onPress={() => setLocalDangerRadius(Math.max(0.5, localDangerRadius - 0.5))}>
            <Text style={{ color: '#fff', fontSize: 24, paddingHorizontal: 15 }}>−</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, height: 4, backgroundColor: '#652a9c', borderRadius: 2 }}>
            <View style={{ width: `${(localDangerRadius / 5) * 100}%`, height: '100%', backgroundColor: '#aa63d2', borderRadius: 2 }} />
          </View>
          <TouchableOpacity onPress={() => setLocalDangerRadius(Math.min(5, localDangerRadius + 0.5))}>
            <Text style={{ color: '#fff', fontSize: 24, paddingHorizontal: 15 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 6,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  profileLabel: {
    color: "#fff",
    fontSize: 16,
    marginRight: 6,
    width: 80,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#652a9c",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: "#fff",
  },
  table: {
    borderWidth: 1,
    borderColor: "#652a9c",
    borderRadius: 8,
    marginBottom: 20,
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#652a9c",
  },
  tableHeader: {
    backgroundColor: "#aa63d2",
  },
  tableText: {
    flex: 1,
    color: "#fff",
    textAlign: "center",
  },
  headerText: {
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "#e0c8c4",
    fontSize: 16,
    fontWeight: "600",
  },
  addContactForm: {
    marginBottom: 10,
    gap: 8,
  },
  saveButton: {
    backgroundColor: "#aa63d2",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  shortcutRow: { marginVertical: 8 },
  shortcutLabel: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
  },
  picker: {
    backgroundColor: "#652a9c",
    color: "#fff",
  },
});