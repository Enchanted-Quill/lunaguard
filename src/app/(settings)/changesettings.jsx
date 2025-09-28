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
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

export default function ChangeSettingsScreen() {
  const router = useRouter();

  // Placeholder changeable profile variables
  const [username, setUsername] = useState("soggydollar");
  const [name, setName] = useState("Sarah");
  const [email, setEmail] = useState("sarah@gmail.com");
  const [phone, setPhone] = useState("0123456789");
  const [profilePic, setProfilePic] = useState(null);

  // Placeholder changeable contacts
  const [contacts, setContacts] = useState([
    { name: "Contact 1", email: "a@gmail.com", phone: "0123456789" },
  ]);

  //Placeholder changeable shortcuts
  const [shortcuts, setShortcuts] = useState({
    shortcut1: "SOS",
    shortcut2: "Fake Call",
  });

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

  // Prompt chain for adding a new contact
  const handleAddContact = () => {
    Alert.prompt("New Contact", "Enter name:", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Next",
        onPress: (name) => {
          if (!name) return;
          Alert.prompt("New Contact", "Enter email:", [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Next",
              onPress: (email) => {
                if (!email) return;
                Alert.prompt("New Contact", "Enter phone:", [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Add",
                    onPress: (phone) => {
                      if (!phone) return;
                      setContacts([...contacts, { name, email, phone }]);
                    },
                  },
                ]);
              },
            },
          ]);
        },
      },
    ]);
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
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#ccc"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.profileLabel}>Name:</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter name"
                placeholderTextColor="#ccc"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.profileLabel}>Email:</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor="#ccc"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.profileLabel}>Phone:</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone"
                placeholderTextColor="#ccc"
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
        <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
          <Text style={styles.addButtonText}>+ Add Contact</Text>
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

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => router.push("/settings")}
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
