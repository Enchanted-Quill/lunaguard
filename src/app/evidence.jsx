import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Audio, Video } from "expo-av";
import * as SMS from "expo-sms";
import * as KeepAwake from "expo-keep-awake";
import storage from "@react-native-firebase/storage";
import auth from "@react-native-firebase/auth";

const contacts = [
  { name: "Alice", phone: "1234567890" },
  { name: "Bob", phone: "9876543210" },
];

export default function EvidenceLocker() {
  const [mediaItems, setMediaItems] = useState([]);
  const [importCount, setImportCount] = useState(1);
  const [recording, setRecording] = useState(null);
  const [soundObjects, setSoundObjects] = useState({});

  const user = auth().currentUser;
  KeepAwake.useKeepAwake();

  // Fetch user's media from Firebase Storage
  useEffect(() => {
    const fetchMedia = async () => {
      if (!user) return;
      try {
        const types = ["images", "videos", "audios"];
        const allItems = [];

        for (const type of types) {
          const folderRef = storage().ref(`evidence/${user.uid}/${type}`);
          const listResult = await folderRef.listAll();
          const items = await Promise.all(
            listResult.items.map(async (ref) => {
              const uri = await ref.getDownloadURL();
              return { type: type.slice(0, -1), uri, name: ref.name };
            })
          );
          allItems.push(...items);
        }

        setMediaItems(allItems);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to fetch media.");
      }
    };

    fetchMedia();
  }, [user]);

  // Upload media to user's folder
  const uploadToFirebase = async (uri, type, name) => {
    if (!user) return;
    try {
      const fileRef = storage().ref(`evidence/${user.uid}/${type}s/${name}`);
      await fileRef.putFile(uri);
      const url = await fileRef.getDownloadURL();
      setMediaItems((prev) => [{ type, uri: url, name }, ...prev]);
      Alert.alert("Uploaded", `${type} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      Alert.alert("Upload failed", `Failed to upload ${type}.`);
    }
  };

  const handleImport = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const type = asset.type === "image" ? "image" : "video";
        const name = `Imported_${importCount}`;
        setImportCount(importCount + 1);
        await uploadToFirebase(asset.uri, type, name);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Import failed", "Error importing media.");
    }
  };

  const startAudioRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recordingInstance = new Audio.Recording();
      await recordingInstance.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await recordingInstance.startAsync();
      setRecording(recordingInstance);
      Alert.alert("Recording", "Audio recording started...");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const stopAudioRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      const name = `Audio_${importCount}`;
      setImportCount(importCount + 1);
      await uploadToFirebase(uri, "audio", name);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  const startVideoRecording = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const name = `Video_${importCount}`;
        setImportCount(importCount + 1);
        await uploadToFirebase(asset.uri, "video", name);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Video recording failed.");
    }
  };

  const playAudio = async (uri, name) => {
    try {
      if (soundObjects[name]) {
        await soundObjects[name].stopAsync();
        await soundObjects[name].unloadAsync();
      }
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri });
      await sound.playAsync();
      setSoundObjects((prev) => ({ ...prev, [name]: sound }));
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to play audio.");
    }
  };

  const sendToContactSMS = async (item) => {
    const phoneNumbers = contacts.map((c) => c.phone);
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Error", "SMS not available on this device.");
      return;
    }
    try {
      await SMS.sendSMSAsync(
        phoneNumbers,
        `Evidence: ${item.name}\n${item.uri}`
      );
      Alert.alert("Sent", `${item.name} sent via SMS.`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to send SMS.");
    }
  };

  return (
    <LinearGradient colors={["#521684", "#1c052f"]} style={styles.container}>
      <View style={styles.stickyBar}>
        <Text style={styles.title}>Secure Evidence Locker</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleImport}>
            <Text style={styles.buttonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={recording ? stopAudioRecording : startAudioRecording}
          >
            <Text style={styles.buttonText}>
              {recording ? "Stop Audio" : "Record Audio"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={startVideoRecording}>
            <Text style={styles.buttonText}>Record Video</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {mediaItems.map((item, idx) => (
            <View key={idx} style={{ width: "45%", margin: 5 }}>
              <Text style={styles.fileLabel}>{item.name}</Text>
              {item.type === "image" ? (
                <Image source={{ uri: item.uri }} style={styles.mediaInner} />
              ) : item.type === "video" ? (
                <Video
                  source={{ uri: item.uri }}
                  style={styles.mediaInner}
                  useNativeControls
                  resizeMode="contain"
                  isLooping
                />
              ) : (
                <TouchableOpacity
                  style={styles.audioBox}
                  onPress={() => playAudio(item.uri, item.name)}
                >
                  <Text style={{ color: "#fff", textAlign: "center" }}>
                    Play Audio
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => sendToContactSMS(item)}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>
                  Send via SMS
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyBar: {
    marginTop: 48,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#fff" },
  buttonRow: { flexDirection: "row", marginTop: 10 },
  button: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 5,
  },
  buttonText: { color: "#e0c8c4", fontWeight: "600" },
  scrollContent: { padding: 16, paddingBottom: 80 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  fileLabel: { color: "#fff", marginBottom: 4, fontSize: 14 },
  mediaInner: { width: "100%", height: 120, borderRadius: 8, backgroundColor: "#222" },
  audioBox: {
    width: "100%",
    height: 50,
    backgroundColor: "#333",
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 10,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
});
