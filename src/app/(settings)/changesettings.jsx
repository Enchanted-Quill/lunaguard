// ChangeSettingsScreen.js
import React, { useState } from "react";
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
import { useUser } from "../../context/UserContext";
import { Picker } from "@react-native-picker/picker";
import { Feather } from '@expo/vector-icons'; 
import * as ImagePicker from "expo-image-picker";

export default function ChangeSettingsScreen() {
  const router = useRouter();
  const {
    userProfile,
    emergencyContacts,
    shortcuts,
    updateProfile,
    updateEmergencyContacts,
    updateShortcuts,
    uploadProfilePic,
    dangerRadius,
    setDangerRadius,
  } = useUser();

  // --- Local state ---
  const [username, setUsername] = useState(userProfile.username || "");
  const [name, setName] = useState(userProfile.name || "");
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [profilePic, setProfilePic] = useState(userProfile.profilePic || "");
  const [contacts, setContacts] = useState(emergencyContacts || []);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [localShortcuts, setLocalShortcuts] = useState({ ...shortcuts });
  const [localDangerRadius, setLocalDangerRadius] = useState(dangerRadius || 1);

  // --- Pick image ---
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) setProfilePic(result.assets[0].uri);
    } catch (err) {
      console.error("ImagePicker error:", err);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  // --- Add or save new contact ---
  const handleAddContactToggle = () => {
    if (showAddContact) {
      if (newContactName && newContactPhone) {
        setContacts(prev => [...prev, { name: newContactName, phone: newContactPhone }]);
        setNewContactName("");
        setNewContactPhone("");
        setShowAddContact(false);
      } else {
        Alert.alert("Missing Info", "Please fill all contact fields.");
      }
    } else {
      setShowAddContact(true);
    }
  };

  // --- Delete a contact ---
  const handleDeleteContact = index => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  // --- Edit a contact inline ---
  const handleEditContact = (index, key, value) => {
    setContacts(prev => prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)));
  };

  // --- Save all changes ---
  const handleSave = async () => {
    setSaving(true);
    try {
      let uploadedPic = profilePic;

      if (profilePic && !profilePic.startsWith("https://")) {
        uploadedPic = await uploadProfilePic(profilePic);
      }

      await updateProfile({ name, username, phone, profilePic: uploadedPic });
      await updateEmergencyContacts(contacts);
      await updateShortcuts(localShortcuts);
      setDangerRadius(localDangerRadius);

      Alert.alert("Success", "Settings updated successfully!");
      router.back();
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={["#521684", "#1c052f"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Change Settings</Text>

        {/* Profile */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={profilePic ? { uri: profilePic } : require("../../assets/pfp.jpg")}
              style={styles.profilePic}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {[
              { label: "Username", value: username, setValue: setUsername },
              { label: "Name", value: name, setValue: setName },
              { label: "Phone", value: phone, setValue: setPhone, type: "phone-pad" },
            ].map((field, i) => (
              <View style={styles.inputRow} key={i}>
                <Text style={styles.profileLabel}>{field.label}:</Text>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.setValue}
                  keyboardType={field.type || "default"}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  placeholderTextColor="#ccc"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Emergency Contacts */}
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        {contacts.map((c, i) => (
          <View style={styles.contactRow} key={i}>
            <TextInput
              style={[styles.input, { flex: 1, color: "#fff" }]}
              value={c.name}
              onChangeText={val => handleEditContact(i, "name", val)}
              placeholder="Name"
              placeholderTextColor="#ccc"
            />
            <TextInput
              style={[styles.input, { flex: 1, color: "#fff" }]}
              value={c.phone}
              onChangeText={val => handleEditContact(i, "phone", val)}
              placeholder="Phone"
              placeholderTextColor="#ccc"
              keyboardType="phone-pad"
            />
            <TouchableOpacity onPress={() => handleDeleteContact(i)} style={{ marginLeft: 8 }}>
              <Feather name="trash-2" size={24} color="#e0c8c4" />
            </TouchableOpacity>
          </View>
        ))}

        {showAddContact && (
          <View style={styles.addContactForm}>
            <TextInput
              style={styles.input}
              placeholder="Contact Name"
              placeholderTextColor="#ccc"
              value={newContactName}
              onChangeText={setNewContactName}
            />
            <TextInput
              style={styles.input}
              placeholder="Contact Phone"
              placeholderTextColor="#ccc"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
            />
          </View>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddContactToggle}>
          <Text style={styles.addButtonText}>
            {showAddContact ? "✓ Add Contact" : "+ Add Contact"}
          </Text>
        </TouchableOpacity>

        {/* Shortcuts */}
        <Text style={styles.sectionTitle}>Shortcuts</Text>
        {["shortcut1", "shortcut2"].map((key, i) => (
          <View style={styles.shortcutRow} key={i}>
            <Text style={styles.shortcutLabel}>
              {i === 0 ? "Tap side bar twice" : "Press home button 3 times"}
            </Text>
            <Picker
              selectedValue={localShortcuts[key]}
              style={styles.picker}
              dropdownIconColor="#fff"
              onValueChange={val => setLocalShortcuts({ ...localShortcuts, [key]: val })}
            >
              <Picker.Item label="SOS" value="SOS" />
              <Picker.Item label="Fake Call" value="Fake Call" />
              <Picker.Item label="Record Audio" value="Record Audio" />
            </Picker>
          </View>
        ))}

        {/* Danger Radius */}
        <Text style={styles.sectionTitle}>Danger Radius</Text>
        <Text style={styles.shortcutLabel}>
          Routes avoid incidents within: {localDangerRadius} mile
          {localDangerRadius !== 1 ? "s" : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 10 }}>
          <TouchableOpacity
            onPress={() => setLocalDangerRadius(Math.max(0.5, localDangerRadius - 0.5))}
          >
            <Text style={{ color: "#fff", fontSize: 24, paddingHorizontal: 15 }}>−</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, height: 4, backgroundColor: "#652a9c", borderRadius: 2 }}>
            <View
              style={{
                width: `${(localDangerRadius / 5) * 100}%`,
                height: "100%",
                backgroundColor: "#aa63d2",
                borderRadius: 2,
              }}
            />
          </View>
          <TouchableOpacity
            onPress={() => setLocalDangerRadius(Math.min(5, localDangerRadius + 0.5))}
          >
            <Text style={{ color: "#fff", fontSize: 24, paddingHorizontal: 15 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: "bold", color: "#fff", textAlign: "center", marginTop: 40 },
  sectionTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", marginVertical: 10 },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  profilePic: { width: 80, height: 80, borderRadius: 40, marginRight: 15 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  profileLabel: { color: "#fff", width: 80 },
  input: {
    flex: 1,
    borderColor: "#652a9c",
    borderWidth: 1,
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: { color: "#fff", fontSize: 16 },
  addButton: { backgroundColor: "#652a9c", borderRadius: 25, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  addButtonText: { color: "#e0c8c4", fontSize: 16, fontWeight: "600" },
  addContactForm: { marginBottom: 10, gap: 8 },
  shortcutRow: { marginVertical: 8 },
  shortcutLabel: { color: "#fff", fontSize: 16, marginBottom: 4 },
  saveButton: { backgroundColor: "#aa63d2", borderRadius: 25, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
