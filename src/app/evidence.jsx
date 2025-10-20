// app/evidence.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as SMS from "expo-sms";
import { VideoView, useVideoPlayer } from "expo-video";
import { useAudioPlayer } from "expo-audio";

const contacts = [
  { name: "Alice", phone: "1234567890" },
  { name: "Bob", phone: "9876543210" },
];

export default function EvidenceLocker() {
  const [mediaItems, setMediaItems] = useState([
    { type: "video", uri: require("../assets/video1.mp4"), name: "video1" },
    { type: "video", uri: require("../assets/video2.mp4"), name: "video2" },
    { type: "video", uri: require("../assets/video3.mp4"), name: "video3" },
    { type: "video", uri: require("../assets/video4.mp4"), name: "video4" },
    { type: "video", uri: require("../assets/video5.mp4"), name: "video5" },
    { type: "video", uri: require("../assets/video6.mp4"), name: "video6" },
  ]);

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [importCount, setImportCount] = useState(1);

  // Create video player for fullscreen video
  const fullscreenPlayer = useVideoPlayer(
    selectedMedia?.type === "video" && selectedMedia?.uri
      ? typeof selectedMedia.uri === "string"
        ? selectedMedia.uri
        : selectedMedia.uri
      : null,
    (player) => {
      if (selectedMedia?.type === "video") {
        player.play();
      }
    }
  );

  const handleImport = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"], // Updated: replaced MediaTypeOptions with array
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) { // Updated: 'canceled' instead of 'cancelled'
        const asset = result.assets[0];
        setMediaItems((prev) => [
          ...prev,
          {
            type: asset.type === "image" ? "image" : "video",
            uri: asset.uri,
            name: `Imported ${importCount}`,
          },
        ]);
        setImportCount(importCount + 1);
        Alert.alert("Imported", "Media imported and (simulated) uploaded to cloud.");
      }
    } catch (err) {
      console.error("Import error", err);
      Alert.alert("Import failed", "There was an error importing media.");
    }
  };

  const handleExport = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Error", "SMS is not available on this device.");
      return;
    }
    const chosenContact = contacts[0];
    const chosenMedia = mediaItems[0];
    try {
      const result = await SMS.sendSMSAsync(
        [chosenContact.phone],
        `Evidence shared: ${chosenMedia.name}`
      );
      // result has shape { result } where result is 'sent' or 'cancelled' (platform dependent)
      // Only show the success alert if the user actually sent the message
      if (result && (result.result === "sent" || result.result === "unknown" || result.result === "sent")) {
        // some platforms return 'unknown' or other truthy states - treat them as success
        Alert.alert("Exported", `Sent message to ${chosenContact.name}.`);
      }
    } catch (err) {
      console.error("SMS send error", err);
      Alert.alert("Error", "Failed to send SMS.");
    }
  };

  const openFullScreen = (item) => setSelectedMedia(item);
  const closeFullScreen = () => setSelectedMedia(null);

  // Create thumbnail players for grid (these don't autoplay)
  const ThumbnailVideo = ({ source }) => {
    const player = useVideoPlayer(source, (player) => {
      // Don't autoplay thumbnails
      player.pause();
    });

    return (
      <VideoView
        player={player}
        style={styles.mediaInner}
        nativeControls={false}
      />
    );
  };

  return (
    <LinearGradient colors={["#521684", "#1c052f"]} style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.stickyBar}>
        <Text style={styles.title}>Secure Evidence Locker</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleImport}>
            <Text style={styles.buttonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleExport}>
            <Text style={styles.buttonText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable grid */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {mediaItems.map((item, idx) => (
            <View key={idx} style={{ alignItems: "center", width: "30%", marginRight: (idx % 3 === 2) ? 0 : 12 }}>
              <Text style={styles.fileLabel}>{item.name}</Text>
              <TouchableOpacity
                style={styles.mediaBox}
                activeOpacity={0.9}
                onPress={() => openFullScreen(item)}
              >
                {item.type === "video" ? (
                  <ThumbnailVideo
                    source={typeof item.uri === "string" ? item.uri : item.uri}
                  />
                ) : (
                  <Image
                    source={typeof item.uri === "string" ? { uri: item.uri } : item.uri}
                    style={styles.mediaInner}
                  />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fullscreen overlay */}
      {selectedMedia && (
        <View style={styles.fullscreenOverlay}>
          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={closeFullScreen}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.fullscreenInner}>
            {selectedMedia.type === "video" ? (
              <VideoView
                player={fullscreenPlayer}
                style={styles.fullscreenMedia}
                nativeControls={true}
                contentFit="contain"
              />
            ) : (
              <Image
                source={
                  typeof selectedMedia.uri === "string"
                    ? { uri: selectedMedia.uri }
                    : selectedMedia.uri
                }
                style={styles.fullscreenMedia}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyBar: {
    marginTop: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  button: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#e0c8c4",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  fileLabel: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  mediaBox: {
    width: "100%",
    height: 120,
    backgroundColor: "#222",
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: "3.33%",
  },
  mediaInner: {
    width: "100%",
    height: "100%",
  },
  fullscreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#652a9c",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
    zIndex: 1000,
  },
  backButtonText: {
    color: "#e0c8c4",
    fontSize: 16,
    fontWeight: "600",
  },
  fullscreenInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenMedia: {
    width: "100%",
    height: "100%",
  },
});