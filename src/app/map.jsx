import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';

export default function MapScreen() {
  const { incidents, addIncident } = useUser();
  const [location, setLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 34.0522,
    longitude: -118.2437,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLocation, setReportLocation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setMapRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  const handleMapPress = (e) => {
    if (showReportModal) {
      setReportLocation(e.nativeEvent.coordinate);
    }
  };

  const handleReportIncident = () => {
    if (!reportTitle || !reportDescription) {
      alert('Please fill in all fields');
      return;
    }

    const incidentLocation = reportLocation || {
      latitude: location?.coords.latitude || mapRegion.latitude,
      longitude: location?.coords.longitude || mapRegion.longitude,
    };

    addIncident({
      title: reportTitle,
      location: incidentLocation,
      description: reportDescription,
    });

    // Reset form
    setReportTitle('');
    setReportDescription('');
    setReportLocation(null);
    setShowReportModal(false);
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <LinearGradient colors={['#521684', '#1c052f']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Safety Map</Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* User's current location marker */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="You are here"
              pinColor="blue"
            />
          )}

          {/* Incident markers */}
          {incidents.map((incident) => (
            <Marker
              key={incident.id}
              coordinate={incident.location}
              title={incident.title}
              pinColor="red"
              onPress={() => setSelectedIncident(incident)}
            />
          ))}

          {/* Temporary marker when reporting */}
          {showReportModal && reportLocation && (
            <Marker
              coordinate={reportLocation}
              title="Report Location"
              pinColor="orange"
            />
          )}
        </MapView>
      </View>

      {/* Report Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => setShowReportModal(true)}
        >
          <Text style={styles.buttonText}>Report Incident</Text>
        </TouchableOpacity>
      </View>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <Modal
          visible={!!selectedIncident}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedIncident(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedIncident.title}</Text>
              <Text style={styles.modalLabel}>Time:</Text>
              <Text style={styles.modalText}>{formatTime(selectedIncident.time)}</Text>
              <Text style={styles.modalLabel}>Location:</Text>
              <Text style={styles.modalText}>
                {selectedIncident.location.latitude.toFixed(4)}, {selectedIncident.location.longitude.toFixed(4)}
              </Text>
              <Text style={styles.modalLabel}>Description:</Text>
              <Text style={styles.modalText}>{selectedIncident.description}</Text>
              <Text style={styles.modalLabel}>Reported by:</Text>
              <Text style={styles.modalText}>{selectedIncident.reportedBy}</Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedIncident(null)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Report Incident Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Incident</Text>

            <Text style={styles.modalLabel}>Title:</Text>
            <TextInput
              style={styles.input}
              value={reportTitle}
              onChangeText={setReportTitle}
              placeholder="e.g., Suspicious Activity"
              placeholderTextColor="#ccc"
            />

            <Text style={styles.modalLabel}>Description:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Describe what happened..."
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.modalLabel}>Location:</Text>
            <Text style={styles.modalText}>
              {reportLocation
                ? `${reportLocation.latitude.toFixed(4)}, ${reportLocation.longitude.toFixed(4)}`
                : 'Tap on map to set location, or use your current location'}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowReportModal(false);
                  setReportTitle('');
                  setReportDescription('');
                  setReportLocation(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleReportIncident}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#652a9c',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  reportButton: {
    backgroundColor: '#652a9c',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#e0c8c4',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2d0a4a',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ac78cf',
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 14,
    color: '#e0c8c4',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#652a9c',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    backgroundColor: '#1c052f',
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#652a9c',
  },
  submitButton: {
    backgroundColor: '#aa63d2',
  },
  closeButton: {
    backgroundColor: '#652a9c',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
});