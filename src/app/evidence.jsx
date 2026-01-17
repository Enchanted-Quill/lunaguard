import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useAudioPlayer, useAudioRecorder, requestRecordingPermissionsAsync } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SMS from "expo-sms";
import * as KeepAwake from "expo-keep-awake";
import * as FileSystem from "expo-file-system/legacy";
import storage from "@react-native-firebase/storage";
import auth from "@react-native-firebase/auth";
import { useUser } from "../context/UserContext";

export default function EvidenceLocker() {
  const audioRecorder = useAudioRecorder({
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 'max',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
  });
  const [isRecording, setIsRecording] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [notes, setNotes] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [currentFolder, setCurrentFolder] = useState(null);

  const {
    contacts,
    evidenceFiles = [],
    evidenceFolders = [],
    updateEvidenceFiles,
    updateEvidenceFolders,
  } = useUser();

  const user = auth().currentUser;
  KeepAwake.useKeepAwake();

  // Initialize default Legal folder if it doesn't exist
  useEffect(() => {
    if (!evidenceFolders.some(f => f.name === "Legal")) {
      const legalFolder = {
        id: "legal_folder",
        name: "Legal",
        isReadOnly: true,
        createdAt: new Date().toISOString(),
      };
      updateEvidenceFolders([legalFolder, ...evidenceFolders]);
    }
  }, []);

  // Get metadata from file
  const getFileMetadata = async (uri, type) => {
    try {
      let metadata = {
        uploadedAt: new Date().toISOString(),
        type,
        size: 0,
        dimensions: null,
        duration: null,
      };

      // Get file info
      if (uri.startsWith("file://")) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        metadata.size = fileInfo.size || 0;
      }

      // Get image/video dimensions
      if (type === "image") {
        await new Promise((resolve) => {
          Image.getSize(uri, (width, height) => {
            metadata.dimensions = { width, height };
            resolve();
          }, resolve);
        });
      }

      return metadata;
    } catch (err) {
      console.error("Error getting metadata:", err);
      return {
        uploadedAt: new Date().toISOString(),
        type,
        size: 0,
      };
    }
  };

  // Upload media to Firebase and save to context
  const uploadToFirebase = async (uri, type, name) => {
    if (!user) return;
    try {
      const fileRef = storage().ref(`evidence/${user.uid}/${type}s/${name}`);
      await fileRef.putFile(uri);
      const url = await fileRef.getDownloadURL();

      const metadata = await getFileMetadata(uri, type);

      // Check if currently in Legal folder
      const isInLegalFolder = currentFolder === "legal_folder";

      const newFile = {
        id: Date.now().toString(),
        type,
        uri: url,
        name,
        notes: "",
        folderId: currentFolder,
        isReadOnly: isInLegalFolder, // Set read-only if in Legal folder
        metadata,
      };

      updateEvidenceFiles([newFile, ...evidenceFiles]);
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
        const name = `Imported_${Date.now()}`;
        await uploadToFirebase(asset.uri, type, name);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Import failed", "Error importing media.");
    }
  };

  const startAudioRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission Required", "Microphone permission is required to record audio.");
        return;
      }

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: 'mpeg4',
          audioEncoder: 'aac',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 'max',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await audioRecorder.record(recordingOptions);
      setIsRecording(true);
      Alert.alert("Recording", "Audio recording started...");
    } catch (err) {
      console.error("Audio recording error:", err);
      Alert.alert("Error", "Failed to start recording: " + err.message);
    }
  };

  const stopAudioRecording = async () => {
    try {
      await audioRecorder.stop();
      setIsRecording(false);

      const uri = audioRecorder.uri;

      if (!uri) {
        Alert.alert("Error", "Recording failed - no file was created.");
        return;
      }

      // Ensure URI has proper file:// prefix
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      Alert.alert("Recorded audio URI:", fileUri);

      const name = `Audio_${Date.now()}.m4a`;
      await uploadToFirebase(fileUri, "audio", name);
    } catch (err) {
      console.error("Stop recording error:", err);
      Alert.alert("Error", "Failed to stop recording: " + err.message);
      setIsRecording(false);
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
        const name = `Video_${Date.now()}`;
        await uploadToFirebase(asset.uri, "video", name);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Video recording failed.");
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

  const handleRename = () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Please enter a valid name.");
      return;
    }

    const updatedFiles = evidenceFiles.map(file =>
      file.id === selectedItem.id ? { ...file, name: newName } : file
    );
    updateEvidenceFiles(updatedFiles);
    setShowRenameModal(false);
    setShowOptionsMenu(false);
    setNewName("");
    Alert.alert("Success", "File renamed successfully!");
  };

  const handleSaveNotes = () => {
    const updatedFiles = evidenceFiles.map(file =>
      file.id === selectedItem.id ? { ...file, notes } : file
    );
    updateEvidenceFiles(updatedFiles);
    setShowNotesModal(false);
    setShowOptionsMenu(false);
    Alert.alert("Success", "Notes saved successfully!");
  };

  const handleDeleteFile = () => {
    if (selectedItem.isReadOnly) {
      Alert.alert("Error", "Cannot delete files in Legal folder.");
      return;
    }

    Alert.alert(
      "Delete File",
      "Are you sure you want to delete this file?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedFiles = evidenceFiles.filter(
              file => file.id !== selectedItem.id
            );
            updateEvidenceFiles(updatedFiles);
            setShowOptionsMenu(false);
            Alert.alert("Deleted", "File deleted successfully!");
          },
        },
      ]
    );
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      Alert.alert("Error", "Please enter a folder name.");
      return;
    }

    if (evidenceFolders.some(f => f.name.toLowerCase() === newFolderName.toLowerCase())) {
      Alert.alert("Error", "A folder with this name already exists.");
      return;
    }

    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      isReadOnly: false,
      createdAt: new Date().toISOString(),
    };

    updateEvidenceFolders([...evidenceFolders, newFolder]);
    setShowFolderModal(false);
    setNewFolderName("");
    Alert.alert("Success", "Folder created successfully!");
  };

  const handleMoveFile = (targetFolderId) => {
    const targetFolder = evidenceFolders.find(f => f.id === targetFolderId);

    // Check if moving TO Legal folder
    if (targetFolder && targetFolder.id === "legal_folder") {
      Alert.alert(
        "Move to Legal Folder",
        "Files moved to the Legal folder become read-only and cannot be deleted or modified. This action cannot be undone. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Move",
            onPress: () => {
              const updatedFiles = evidenceFiles.map(file =>
                file.id === selectedItem.id
                  ? { ...file, folderId: targetFolderId, isReadOnly: true }
                  : file
              );
              updateEvidenceFiles(updatedFiles);
              setShowMoveModal(false);
              setShowOptionsMenu(false);
              Alert.alert("Success", "File moved to Legal folder and is now read-only.");
            },
          },
        ]
      );
    } else {
      const updatedFiles = evidenceFiles.map(file =>
        file.id === selectedItem.id ? { ...file, folderId: targetFolderId } : file
      );
      updateEvidenceFiles(updatedFiles);
      setShowMoveModal(false);
      setShowOptionsMenu(false);
      Alert.alert("Success", "File moved successfully!");
    }
  };

  const openOptionsMenu = (item) => {
    setSelectedItem(item);
    setNotes(item.notes || "");
    setNewName(item.name);
    setShowOptionsMenu(true);
  };

  const getCurrentItems = () => {
    const files = evidenceFiles.filter(f => f.folderId === currentFolder);
    const folders = currentFolder === null
      ? evidenceFolders.sort((a, b) => a.name.localeCompare(b.name))
      : [];
    return { folders, files };
  };

  const { folders, files } = getCurrentItems();

  return (
    <LinearGradient colors={["#521684", "#1c052f"]} style={styles.container}>
      <View style={styles.stickyBar}>
        <Text style={styles.title}>Secure Evidence Locker</Text>

        {currentFolder && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentFolder(null)}
          >
            <Text style={styles.buttonText}>← Back to All Folders</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleImport}>
            <Text style={styles.buttonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={isRecording ? stopAudioRecording : startAudioRecording}
          >
            <Text style={styles.buttonText}>
              {isRecording ? "Stop Audio" : "Record Audio"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={startVideoRecording}>
            <Text style={styles.buttonText}>Record Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowFolderModal(true)}
          >
            <Text style={styles.buttonText}>New Folder</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Folders */}
        {folders.map((folder) => (
          <TouchableOpacity
            key={folder.id}
            style={styles.folderItem}
            onPress={() => setCurrentFolder(folder.id)}
          >
            <Text style={styles.folderIcon}>📁</Text>
            <Text style={styles.folderName}>{folder.name}</Text>
            {folder.isReadOnly && (
              <Text style={styles.readOnlyBadge}>Read-Only</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Files */}
        <View style={styles.grid}>
          {files.map((item) => (
            <FilePreview
              key={item.id}
              item={item}
              onOptionsPress={openOptionsMenu}
              onSendSMS={sendToContactSMS}
            />
          ))}
        </View>
      </ScrollView>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            <Text style={styles.optionsTitle}>{selectedItem?.name}</Text>

            {!selectedItem?.isReadOnly && (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowRenameModal(true);
                }}
              >
                <Text style={styles.optionText}>✏️ Rename</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowNotesModal(true);
              }}
            >
              <Text style={styles.optionText}>
                {selectedItem?.notes ? "📝 View/Edit Notes" : "📝 Add Notes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                // Show metadata alert
                const meta = selectedItem?.metadata;
                const metaText = meta ?
                  `Uploaded: ${new Date(meta.uploadedAt).toLocaleString()}\n` +
                  `Type: ${meta.type}\n` +
                  `Size: ${(meta.size / 1024).toFixed(2)} KB\n` +
                  (meta.dimensions ? `Dimensions: ${meta.dimensions.width}x${meta.dimensions.height}\n` : '') +
                  (meta.duration ? `Duration: ${meta.duration}s\n` : '')
                  : 'No metadata available';

                Alert.alert("File Metadata", metaText);
              }}
            >
              <Text style={styles.optionText}>ℹ️ View Metadata</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowMoveModal(true);
              }}
            >
              <Text style={styles.optionText}>📁 Move</Text>
            </TouchableOpacity>

            {!selectedItem?.isReadOnly && (
              <TouchableOpacity
                style={[styles.optionItem, styles.deleteOption]}
                onPress={handleDeleteFile}
              >
                <Text style={styles.deleteText}>🗑️ Delete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptionsMenu(false)}
            >
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename File</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRenameModal(false);
                  setNewName("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleRename}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal
        visible={showNotesModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedItem?.notes ? "Edit Notes" : "Add Notes"}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter notes..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              editable={!selectedItem?.isReadOnly}
            />
            {selectedItem?.isReadOnly && (
              <Text style={styles.readOnlyText}>
                Read-only: Cannot edit notes in Legal folder
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowNotesModal(false);
                  setNotes("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              {!selectedItem?.isReadOnly && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveNotes}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        visible={showFolderModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.input}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Enter folder name"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowFolderModal(false);
                  setNewFolderName("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateFolder}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move File Modal */}
      <Modal
        visible={showMoveModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Move to Folder</Text>
            <ScrollView style={styles.folderList}>
              <TouchableOpacity
                style={styles.folderOption}
                onPress={() => handleMoveFile(null)}
              >
                <Text style={styles.folderOptionText}>📂 Root (No Folder)</Text>
              </TouchableOpacity>
              {evidenceFolders.map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  style={styles.folderOption}
                  onPress={() => handleMoveFile(folder.id)}
                >
                  <Text style={styles.folderOptionText}>
                    📁 {folder.name}
                    {folder.isReadOnly && " (Read-Only)"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { marginTop: 15 }]}
              onPress={() => setShowMoveModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// Separate component for file preview to handle audio/video players
function FilePreview({ item, onOptionsPress, onSendSMS }) {
  const audioPlayer = useAudioPlayer(item.type === 'audio' ? item.uri : null);
  const videoPlayer = useVideoPlayer(item.type === 'video' ? item.uri : null);

  return (
    <View style={styles.fileContainer}>
      <View style={styles.fileHeader}>
        <Text style={styles.fileLabel} numberOfLines={1}>
          {item.name}
        </Text>
        {/* Only show options menu if NOT read-only */}
        {!item.isReadOnly && (
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => onOptionsPress(item)}
          >
            <Text style={styles.optionsIcon}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      {item.type === "image" ? (
        <Image source={{ uri: item.uri }} style={styles.mediaInner} />
      ) : item.type === "video" ? (
        <VideoView
          player={videoPlayer}
          style={styles.mediaInner}
          nativeControls={true}
          contentFit="contain"
        />
      ) : (
        <TouchableOpacity
          style={styles.audioBox}
          onPress={() => {
            if (audioPlayer.playing) {
              audioPlayer.pause();
            } else {
              audioPlayer.play();
            }
          }}
        >
          <Text style={styles.audioText}>
            🎵 {audioPlayer.playing ? 'Pause' : 'Play'} Audio
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.sendButton}
        onPress={() => onSendSMS(item)}
      >
        <Text style={styles.sendButtonText}>Send via SMS</Text>
      </TouchableOpacity>

      {item.notes && (
        <View style={styles.notesBadge}>
          <Text style={styles.notesBadgeText}>📝 Has Notes</Text>
        </View>
      )}

      {item.isReadOnly && (
        <View style={styles.readOnlyFileBadge}>
          <Text style={styles.readOnlyFileText}>🔒 Read-Only</Text>
        </View>
      )}
    </View>
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
  title: { fontSize: 32, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  backButton: {
    backgroundColor: "#8b4ac9",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  button: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 5,
  },
  buttonText: { color: "#e0c8c4", fontWeight: "600", fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(101, 42, 156, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#652a9c",
  },
  folderIcon: { fontSize: 28, marginRight: 12 },
  folderName: { fontSize: 18, fontWeight: "600", color: "#fff", flex: 1 },
  readOnlyBadge: {
    backgroundColor: "#eb697c",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  fileContainer: {
    width: "48%",
    marginBottom: 15,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 8,
  },
  fileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fileLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  optionsButton: {
    padding: 4,
  },
  optionsIcon: {
    fontSize: 20,
    color: "#ac78cf",
    fontWeight: "bold",
  },
  mediaInner: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  audioBox: {
    width: "100%",
    height: 80,
    backgroundColor: "#333",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  audioText: { color: "#fff", fontSize: 16 },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
    alignItems: "center",
  },
  sendButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  notesBadge: {
    backgroundColor: "#652a9c",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  notesBadgeText: { color: "#e0c8c4", fontSize: 12 },
  readOnlyFileBadge: {
    backgroundColor: "#eb697c",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  readOnlyFileText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsMenu: {
    backgroundColor: "#2d0a4a",
    borderRadius: 15,
    padding: 20,
    width: "80%",
    maxWidth: 300,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
  },
  optionItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  optionText: {
    fontSize: 16,
    color: "#e0c8c4",
    textAlign: "center",
  },
  deleteOption: {
    borderBottomWidth: 0,
  },
  deleteText: {
    fontSize: 16,
    color: "#eb697c",
    textAlign: "center",
    fontWeight: "600",
  },
  modalContent: {
    backgroundColor: "#2d0a4a",
    borderRadius: 15,
    padding: 25,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#652a9c",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  readOnlyText: {
    color: "#eb697c",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#652a9c",
  },
  saveButton: {
    backgroundColor: "#aa63d2",
  },
  folderList: {
    maxHeight: 300,
  },
  folderOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  folderOptionText: {
    fontSize: 16,
    color: "#e0c8c4",
  },
});