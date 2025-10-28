import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "../../context/UserContext";
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    userProfile,
    emergencyContacts = [],
    shortcuts = {},
  } = useUser();

  const { username, name, phone = "N/A", profilePic } = userProfile;

  return (
    <LinearGradient colors={["#521684", "#1c052f"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={() => router.push("/changesettings")}>
            <Image
              source={require("../../assets/edit.png")}
              style={styles.editIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileRow}>
          <Image
            source={
              profilePic ? { uri: profilePic } : require("../../assets/pfp.jpg")
            }
            style={styles.profilePic}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileText}>
              Username: {username || "N/A"}
            </Text>
            <Text style={styles.profileText}>Name: {name || "N/A"}</Text>
            <Text style={styles.profileText}>Phone Number: {phone}</Text>
          </View>
        </View>

        {/* Emergency Contacts */}
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableText, styles.headerText]}>Name</Text>
            <Text style={[styles.tableText, styles.headerText]}>Phone #</Text>
          </View>
          {emergencyContacts.length ? (
            emergencyContacts.map((c, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={styles.tableText}>{c.name || "N/A"}</Text>
                <Text style={styles.tableText}>{c.phone || "N/A"}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={styles.tableText}>No contacts added</Text>
            </View>
          )}
        </View>

        {/* Shortcuts */}
        <Text style={styles.sectionTitle}>Shortcuts</Text>
        <View style={styles.shortcutRow}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Tap side bar twice</Text>
          </View>
          <Text style={styles.shortcutLabel}>{shortcuts.shortcut1}</Text>
        </View>
        <View style={styles.shortcutRow}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Press home button 3 times</Text>
          </View>
          <Text style={styles.shortcutLabel}>{shortcuts.shortcut2}</Text>
        </View>

        {/* Danger Radius */}
        <Text style={styles.sectionTitle}>Danger Radius</Text>
        <Text style={styles.profileText}>
          Current radius: {dangerRadius} mile{dangerRadius !== 1 ? 's' : ''}
        </Text>
        <Text style={[styles.profileText, { fontSize: 14, marginTop: 5 }]}>
          Routes will avoid incidents within this distance.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    marginTop: 40,
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#fff", marginRight: 10 },
  editIcon: { width: 40, height: 40 },
  sectionTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", marginVertical: 6 },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  profilePic: { width: 80, height: 80, borderRadius: 40, marginRight: 15 },
  profileInfo: { flex: 1 },
  profileText: { fontSize: 16, color: "#fff", marginBottom: 4 },
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
  tableHeader: { backgroundColor: "#aa63d2" },
  tableText: { flex: 1, color: "#fff", textAlign: "center" },
  headerText: { fontWeight: "bold" },
  shortcutRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  button: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 3,
    alignSelf: "center",
    alignItems: "center",
  },
  buttonText: { color: "#e0c8c4", fontSize: 16, fontWeight: "600", textAlign: "center" },
  shortcutLabel: { color: "#fff", fontSize: 16, marginLeft: 10 },
  signOutButton: {
  backgroundColor: "#d94c4c",
  borderRadius: 25,
  paddingVertical: 12,
  paddingHorizontal: 15,
  alignItems: "center",
  marginTop: 30,
},
signOutText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
},

});
