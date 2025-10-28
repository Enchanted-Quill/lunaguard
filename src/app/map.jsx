import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Linking,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import { getDistance } from 'geolib';

export default function MapScreen() {
  const { incidents, addIncident, dangerRadius, voteOnIncident, username, deleteIncident, updateIncident } = useUser();
  const mapRef = useRef(null);

  //Miscellaneous states
  const [location, setLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [showIncidentList, setShowIncidentList] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', '24h', '7d', '30d'
  const [radiusFilter, setRadiusFilter] = useState(10); // miles from user location
  const [editingIncident, setEditingIncident] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLocation, setReportLocation] = useState(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);

  // Routing state
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [showDestinationSearch, setShowDestinationSearch] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);

  // Safe route state
  const [useSafeRoute, setUseSafeRoute] = useState(false);
  const [loadingSafeRoute, setLoadingSafeRoute] = useState(false);

  // Google Maps API Key
  const GOOGLE_MAPS_API_KEY = 'AIzaSyD56nBfBcvXRIOA76Rv5q3Lp84_M1LCF7Y';

  useEffect(() => {
    // Request permission to get user location
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        setMapRegion({
          latitude: 34.0522,
          longitude: -118.2437,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        return;
      }

      // Sets the map region to the user's location
      try {
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
        const newRegion = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setMapRegion(newRegion);

        // Delay animation until map is ready
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion(newRegion, 1000);
          }
        }, 500);
      } catch (error) {
        console.error('Error getting location:', error);
        setMapRegion({
          latitude: 34.0522,
          longitude: -118.2437,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    })();
  }, []);

  // When the user clicks the map, if they are selecting the location of the reported incident, it grabs the coordinates
  const handleMapPress = useCallback((e) => {
    const coords = e.nativeEvent.coordinate;
    if (isSelectingLocation) {
      setReportLocation(coords);
      setLocationSearch(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    } else if (isSelectingDestination) {
      setDestinationCoords(coords);
      setDestinationSearch(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    }
  }, [isSelectingLocation, isSelectingDestination]);

  // Provides suggestions for locations as the user types using Google Maps API
  const searchLocation = useCallback(async (query) => {
    setLocationSearch(query);

    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&location=${location?.coords.latitude},${location?.coords.longitude}&radius=50000`
      );
      const data = await response.json();

      if (data.predictions) {
        setLocationSuggestions(data.predictions.slice(0, 5));
      }
    } catch (error) {
      console.error('Location search error:', error);
    }
  }, [location, GOOGLE_MAPS_API_KEY]);

  // Get data for the location the user selects from the suggestion list
  const selectLocationSuggestion = useCallback(async (placeId, description) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.result?.geometry?.location) {
        const coords = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        };
        setReportLocation(coords);
        setLocationSearch(description);
        setLocationSuggestions([]);
        Keyboard.dismiss();
      }
    } catch (error) {
      console.error('Place details error:', error);
    }
  }, [GOOGLE_MAPS_API_KEY]);

  // Same thing as searchLocation
  const searchDestination = useCallback(async (query) => {
    setDestinationSearch(query);

    if (query.length < 3) {
      setDestinationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&location=${location?.coords.latitude},${location?.coords.longitude}&radius=50000`
      );
      const data = await response.json();

      if (data.predictions) {
        setDestinationSuggestions(data.predictions.slice(0, 5));
      }
    } catch (error) {
      console.error('Destination search error:', error);
    }
  }, [location, GOOGLE_MAPS_API_KEY]);

  // Decode polyline from Google format into array
  const decodePolyline = useCallback((t) => {
    let points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < t.length) {
      let b, shift = 0, result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }, []);

  const milesToMeters = useCallback((miles) => miles * 1609.34, []);

  // Fetches all routes and returns the best safe one
  const findSafeRoute = useCallback(async (originCoords, destCoords) => {
    try {
      setLoadingSafeRoute(true);
      const origin = `${originCoords.latitude},${originCoords.longitude}`;
      const destination = `${destCoords.latitude},${destCoords.longitude}`;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&alternatives=true&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      const dangerRadius = milesToMeters(dangerRadius);
      const safeRoutes = data.routes.filter((route) => {
        const points = decodePolyline(route.overview_polyline.points);
        return !points.some((p) =>
          incidents.some((incident) =>
            getDistance(
              { latitude: p.latitude, longitude: p.longitude },
              incident.location
            ) < dangerRadius
          )
        );
      });

      setLoadingSafeRoute(false);

      if (safeRoutes.length === 0) {
        Alert.alert('No Safe Routes Found', 'All routes pass near reported incidents.');
        return null;
      }

      safeRoutes.sort(
        (a, b) => a.legs[0].duration.value - b.legs[0].duration.value
      );

      return safeRoutes[0];
    } catch (error) {
      console.error('Safe route error:', error);
      Alert.alert('Error', 'Failed to find a safe route.');
      setLoadingSafeRoute(false);
      return null;
    }
  }, [incidents, GOOGLE_MAPS_API_KEY, decodePolyline, milesToMeters]);

  // Same as selectLocationSuggestion
  const selectDestinationSuggestion = useCallback(async (placeId, description) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.result?.geometry?.location) {
        const coords = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        };
        setDestinationCoords(coords);
        setDestinationSearch(description);
        setDestinationSuggestions([]);
        Keyboard.dismiss();
      }
    } catch (error) {
      console.error('Place details error:', error);
    }
  }, [GOOGLE_MAPS_API_KEY]);

  // Handle done button in destination modal
  const handleDestinationDone = useCallback(async () => {
    if (!destinationCoords) {
      Alert.alert('No Destination', 'Please select a destination first.');
      return;
    }

    setShowDestinationSearch(false);

    if (useSafeRoute) {
      if (!location) {
        Alert.alert('Error', 'Current location unavailable.');
        return;
      }

      const originCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const safe = await findSafeRoute(originCoords, destinationCoords);

      if (safe) {
        Alert.alert(
          'Safe Route Found',
          `Fastest safe route: ${safe.legs[0].duration.text} (${safe.legs[0].distance.text})`,
          [
            {
              text: 'Open in Google Maps',
              onPress: () => openInGoogleMaps(destinationCoords),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } else {
      openInGoogleMaps(destinationCoords);
    }

    // Reset destination state
    setDestinationCoords(null);
    setDestinationSearch('');
    setDestinationSuggestions([]);
  }, [destinationCoords, useSafeRoute, location, findSafeRoute]);

  // Adds the incident to the map and resets when the submit button is pressed
  const handleReportIncident = useCallback(() => {
    if (!reportTitle || !reportDescription) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    const incidentLocation = reportLocation || {
      latitude: location?.coords.latitude || mapRegion.latitude,
      longitude: location?.coords.longitude || mapRegion.longitude,
    };

    const incidentData = {
      title: reportTitle,
      location: incidentLocation,
      description: reportDescription,
    };

    addIncident(incidentData);

    setReportTitle('');
    setReportDescription('');
    setReportLocation(null);
    setLocationSearch('');
    setLocationSuggestions([]);
    setShowReportModal(false);
    Keyboard.dismiss();
  }, [reportTitle, reportDescription, reportLocation, location, mapRegion, addIncident, incidents]);


  const cancelReport = useCallback(() => {
    setShowReportModal(false);
    setReportTitle('');
    setReportDescription('');
    setReportLocation(null);
    setLocationSearch('');
    setLocationSuggestions([]);
    setIsSelectingLocation(false);
    Keyboard.dismiss();
  }, []);

  const cancelDestination = useCallback(() => {
    setShowDestinationSearch(false);
    setDestinationCoords(null);
    setDestinationSearch('');
    setDestinationSuggestions([]);
    setIsSelectingDestination(false);
    Keyboard.dismiss();
  }, []);

  const handleDoneSelectingLocation = useCallback(() => {
    setIsSelectingLocation(false);
    setShowReportModal(true);
  }, []);

  const handleDoneSelectingDestination = useCallback(() => {
    setIsSelectingDestination(false);
    setShowDestinationSearch(true);
  }, []);

  const formatTime = useCallback((isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  }, []);

  // Opens the possible routes to a specific location in the Google Maps app
  const openInGoogleMaps = useCallback((destCoords) => {
    const origin = location ? `${location.coords.latitude},${location.coords.longitude}` : '';
    const destination = `${destCoords.latitude},${destCoords.longitude}`;
    const url = Platform.select({
      ios: `maps://app?saddr=${origin}&daddr=${destination}&dirflg=d`,
      android: `google.navigation:q=${destination}&mode=d`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const browserUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        Linking.openURL(browserUrl);
      }
    });
  }, [location]);

  // Handle callout press for POI markers
  const handlePoiClick = useCallback((e) => {
    const { coordinate, name } = e.nativeEvent;
    if (coordinate && name) {
      Alert.alert(
        name,
        'Would you like directions to this location?',
        [
          {
            text: 'Get Directions',
            onPress: () => openInGoogleMaps(coordinate),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [openInGoogleMaps]);

  const getFilteredIncidents = useCallback(() => {
    let filtered = [...incidents];

    // Filter by time
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoffTime = new Date();

      switch(timeFilter) {
        case '24h':
          cutoffTime.setHours(now.getHours() - 24);
          break;
        case '7d':
          cutoffTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffTime.setDate(now.getDate() - 30);
          break;
      }

      filtered = filtered.filter(incident =>
        new Date(incident.time) >= cutoffTime
      );
    }

    // Filter by radius (if user location available)
    if (location && radiusFilter) {
      filtered = filtered.filter(incident => {
        const distance = getDistance(
          { latitude: location.coords.latitude, longitude: location.coords.longitude },
          incident.location
        );
        return distance <= milesToMeters(radiusFilter);
      });
    }

    // Sort by most recent
    filtered.sort((a, b) => new Date(b.time) - new Date(a.time));

    return filtered;
  }, [incidents, timeFilter, radiusFilter, location]);

  const focusOnIncident = useCallback((incident) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: incident.location.latitude,
        longitude: incident.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    setShowIncidentList(false);
    setSelectedIncident(incident);
  }, []);

  return (
    <LinearGradient colors={['#521684', '#1c052f']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Safety Map</Text>
      </View>

      {/* Map */}
      {mapRegion && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={mapRegion}
            onPress={handleMapPress}
            onPoiClick={handlePoiClick}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsPointsOfInterest={true}
            loadingEnabled={true}
            loadingIndicatorColor="#ac78cf"
          >
            {incidents.map((incident) => (
              <Marker
                key={incident.id}
                coordinate={incident.location}
                title={incident.title}
                pinColor="red"
                onPress={() => setSelectedIncident(incident)}
              />
            ))}

            {showReportModal && reportLocation && (
              <Marker
                coordinate={reportLocation}
                title="Report Location"
                pinColor="orange"
              />
            )}

            {showDestinationSearch && destinationCoords && (
              <Marker
                coordinate={destinationCoords}
                title="Destination"
                pinColor="blue"
              />
            )}
          </MapView>
        </View>
      )}

      {/* Report Incident and Set Destination Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => setShowReportModal(true)}
        >
          <Text style={styles.buttonText}>Report Incident</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportButton, { backgroundColor: '#aa63d2', marginTop: 10 }]}
          onPress={() => setShowDestinationSearch(true)}
        >
          <Text style={styles.buttonText}>Set Destination</Text>
        </TouchableOpacity>
      </View>

      {/* Incident List Button */}
      <View style={styles.incidentListButtonContainer}>
        <TouchableOpacity
          style={styles.incidentListButton}
          onPress={() => setShowIncidentList(true)}
        >
          <Text style={styles.buttonText}>📋 Incident List</Text>
        </TouchableOpacity>
      </View>

      {/* Description of selected incident on map popup */}
      {selectedIncident && incidents.find(inc => inc.id === selectedIncident.id) && (
        <Modal
          visible={!!selectedIncident}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedIncident(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedIncident(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.incidentModalContent}>
                  <ScrollView showsVerticalScrollIndicator={false}>
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

                    {/* Voting */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          selectedIncident.upvotes?.includes(username) && styles.voteButtonActive
                        ]}
                        onPress={() => {
                          voteOnIncident(
                            selectedIncident.id,
                            selectedIncident.upvotes?.includes(username) ? 'remove' : 'upvote',
                            username
                          );
                          // Update selectedIncident to reflect the new vote
                          const updatedIncident = incidents.find(inc => inc.id === selectedIncident.id);
                          if (updatedIncident) {
                            const newUpvotes = updatedIncident.upvotes?.includes(username)
                              ? updatedIncident.upvotes.filter(u => u !== username)
                              : [...(updatedIncident.upvotes || []), username];
                            const newDownvotes = (updatedIncident.downvotes || []).filter(u => u !== username);
                            setSelectedIncident({
                              ...updatedIncident,
                              upvotes: newUpvotes,
                              downvotes: newDownvotes,
                            });
                          }
                        }}
                      >
                        <Text style={styles.buttonText}>
                          👍 {selectedIncident.upvotes?.length || 0}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          { marginLeft: 10 },
                          selectedIncident.downvotes?.includes(username) && styles.voteButtonActive
                        ]}
                        onPress={() => {
                          voteOnIncident(
                            selectedIncident.id,
                            selectedIncident.downvotes?.includes(username) ? 'remove' : 'downvote',
                            username
                          );
                          // Update selectedIncident to reflect the new vote
                          const updatedIncident = incidents.find(inc => inc.id === selectedIncident.id);
                          if (updatedIncident) {
                            const newDownvotes = updatedIncident.downvotes?.includes(username)
                              ? updatedIncident.downvotes.filter(u => u !== username)
                              : [...(updatedIncident.downvotes || []), username];
                            const newUpvotes = (updatedIncident.upvotes || []).filter(u => u !== username);
                            setSelectedIncident({
                              ...updatedIncident,
                              upvotes: newUpvotes,
                              downvotes: newDownvotes,
                            });
                          }
                        }}
                      >
                        <Text style={styles.buttonText}>
                          👎 {selectedIncident.downvotes?.length || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Edit/Delete buttons if user owns incident */}
                    {selectedIncident.reportedBy === username && (
                      <View style={{ flexDirection: 'row', marginTop: 15 }}>
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: '#8b4ac9', marginRight: 5 }]}
                          onPress={() => {
                            setEditTitle(selectedIncident.title);
                            setEditDescription(selectedIncident.description);
                            setEditingIncident(selectedIncident);
                            setSelectedIncident(null);
                          }}
                        >
                          <Text style={styles.buttonText}>✏️ Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: '#c94a4a', marginLeft: 5 }]}
                          onPress={() => {
                            Alert.alert(
                              'Delete Incident',
                              'Are you sure you want to delete this incident?',
                              [
                                {
                                  text: 'Cancel',
                                  style: 'cancel',
                                },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => {
                                    deleteIncident(selectedIncident.id);
                                    setSelectedIncident(null);
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Text style={styles.buttonText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Close Button */}
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setSelectedIncident(null)}
                    >
                      <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.closeButton, { backgroundColor: '#aa63d2', marginTop: 10 }]}
                      onPress={() => {
                        openInGoogleMaps(selectedIncident.location);
                        setSelectedIncident(null);
                      }}
                    >
                      <Text style={styles.buttonText}>Get Directions</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Report incident popup */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelReport}
      >
        <TouchableWithoutFeedback onPress={cancelReport}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
              >
                <View style={styles.modalContent}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <Text style={styles.modalTitle}>Report Incident</Text>

                    <Text style={styles.modalLabel}>Title:</Text>
                    <TextInput
                      style={styles.input}
                      value={reportTitle}
                      onChangeText={setReportTitle}
                      placeholder="e.g., Suspicious Activity"
                      placeholderTextColor="#ccc"
                      returnKeyType="next"
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
                      returnKeyType="done"
                    />

                    <Text style={styles.modalLabel}>Location:</Text>
                    <TextInput
                      style={styles.input}
                      value={locationSearch}
                      onChangeText={searchLocation}
                      placeholder="Search for a location..."
                      placeholderTextColor="#ccc"
                      returnKeyType="search"
                    />

                    {locationSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {locationSuggestions.map((suggestion) => (
                          <TouchableOpacity
                            key={suggestion.place_id}
                            style={styles.suggestionItem}
                            onPress={() => selectLocationSuggestion(suggestion.place_id, suggestion.description)}
                          >
                            <Text style={styles.suggestionText}>{suggestion.description}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.locationButton}
                      onPress={() => {
                        setIsSelectingLocation(true);
                        setShowReportModal(false);
                      }}
                    >
                      <Text style={styles.buttonText}>📍 Or Tap Map to Select</Text>
                    </TouchableOpacity>

                    {reportLocation && (
                      <Text style={styles.modalText}>
                        Selected: {reportLocation.latitude.toFixed(4)}, {reportLocation.longitude.toFixed(4)}
                      </Text>
                    )}

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={cancelReport}
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
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Set destination popup */}
      <Modal
        visible={showDestinationSearch}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelDestination}
      >
        <TouchableWithoutFeedback onPress={cancelDestination}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Set Destination</Text>

                  <Text style={styles.modalLabel}>Search for a place:</Text>
                  <TextInput
                    style={styles.input}
                    value={destinationSearch}
                    onChangeText={searchDestination}
                    placeholder="Enter destination..."
                    placeholderTextColor="#ccc"
                    returnKeyType="search"
                    autoFocus
                  />

                  {destinationSuggestions.length > 0 && (
                    <ScrollView style={styles.suggestionsContainer}>
                      {destinationSuggestions.map((suggestion) => (
                        <TouchableOpacity
                          key={suggestion.place_id}
                          style={styles.suggestionItem}
                          onPress={() => selectDestinationSuggestion(suggestion.place_id, suggestion.description)}
                        >
                          <Text style={styles.suggestionText}>{suggestion.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={() => {
                      setIsSelectingDestination(true);
                      setShowDestinationSearch(false);
                    }}
                  >
                    <Text style={styles.buttonText}>📍 Or Tap Map to Select</Text>
                  </TouchableOpacity>

                  {destinationCoords && (
                    <Text style={styles.modalText}>
                      Selected: {destinationCoords.latitude.toFixed(4)}, {destinationCoords.longitude.toFixed(4)}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                    <Text style={{ color: '#fff', fontSize: 16, marginRight: 10 }}>Safe Route</Text>
                    <Switch
                      value={useSafeRoute}
                      onValueChange={setUseSafeRoute}
                      thumbColor={useSafeRoute ? '#aa63d2' : '#ccc'}
                      trackColor={{ false: '#444', true: '#652a9c' }}
                    />
                  </View>

                  {loadingSafeRoute && (
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                      <ActivityIndicator size="large" color="#aa63d2" />
                      <Text style={{ color: '#e0c8c4', marginTop: 10 }}>Finding safest route...</Text>
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={cancelDestination}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={handleDestinationDone}
                    >
                      <Text style={styles.buttonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Select location popup */}
      {isSelectingLocation && (
        <View style={styles.selectionOverlay}>
          <Text style={styles.selectionText}>Tap on the map to select incident location</Text>
          {reportLocation && (
            <Text style={styles.selectionCoords}>
              Selected: {reportLocation.latitude.toFixed(4)}, {reportLocation.longitude.toFixed(4)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDoneSelectingLocation}
          >
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Select destination popup */}
      {isSelectingDestination && (
        <View style={styles.selectionOverlay}>
          <Text style={styles.selectionText}>Tap on the map to select destination</Text>
          {destinationCoords && (
            <Text style={styles.selectionCoords}>
              Selected: {destinationCoords.latitude.toFixed(4)}, {destinationCoords.longitude.toFixed(4)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDoneSelectingDestination}
          >
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Incident List Modal */}
      <Modal
        visible={showIncidentList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIncidentList(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowIncidentList(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Incident List</Text>

                {/* Filters */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.modalLabel}>Time Filter:</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
                    {['all', '24h', '7d', '30d'].map(filter => (
                      <TouchableOpacity
                        key={filter}
                        style={[
                          styles.filterButton,
                          timeFilter === filter && styles.filterButtonActive
                        ]}
                        onPress={() => setTimeFilter(filter)}
                      >
                        <Text style={styles.buttonText}>
                          {filter === 'all' ? 'All' : filter === '24h' ? '24 Hours' : filter === '7d' ? '7 Days' : '30 Days'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalLabel}>Radius: {radiusFilter} miles</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setRadiusFilter(Math.max(1, radiusFilter - 1))}>
                      <Text style={{ color: '#fff', fontSize: 24, paddingHorizontal: 15 }}>−</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1, height: 4, backgroundColor: '#652a9c', borderRadius: 2 }}>
                      <View style={{ width: `${(radiusFilter / 50) * 100}%`, height: '100%', backgroundColor: '#aa63d2', borderRadius: 2 }} />
                    </View>
                    <TouchableOpacity onPress={() => setRadiusFilter(Math.min(50, radiusFilter + 1))}>
                      <Text style={{ color: '#fff', fontSize: 24, paddingHorizontal: 15 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={{ maxHeight: '60%' }}>
                  {getFilteredIncidents().length === 0 ? (
                    <Text style={styles.modalText}>No incidents match your filters.</Text>
                  ) : (
                    getFilteredIncidents().map((incident) => (
                      <TouchableOpacity
                        key={incident.id}
                        style={styles.incidentListItem}
                        onPress={() => focusOnIncident(incident)}
                      >
                        <Text style={styles.incidentListTitle}>{incident.title}</Text>
                        <Text style={styles.incidentListTime}>{formatTime(incident.time)}</Text>
                        <Text style={styles.incidentListDescription} numberOfLines={2}>
                          {incident.description}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowIncidentList(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Incident Modal */}
      <Modal
        visible={!!editingIncident}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingIncident(null)}
      >
        <TouchableWithoutFeedback onPress={() => setEditingIncident(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Incident</Text>

                  <Text style={styles.modalLabel}>Title:</Text>
                  <TextInput
                    style={styles.input}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Incident title"
                    placeholderTextColor="#ccc"
                  />

                  <Text style={styles.modalLabel}>Description:</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Incident description"
                    placeholderTextColor="#ccc"
                    multiline
                    numberOfLines={4}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setEditingIncident(null)}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={() => {
                        if (!editTitle || !editDescription) {
                          Alert.alert('Missing Information', 'Please fill in all fields');
                          return;
                        }
                        updateIncident(editingIncident.id, {
                          title: editTitle,
                          description: editDescription,
                        });
                        setEditingIncident(null);
                        Keyboard.dismiss();
                      }}
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2d0a4a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    maxHeight: '95%',
  },
  incidentModalContent: {
    backgroundColor: '#2d0a4a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    maxHeight: '70%',
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
  suggestionsContainer: {
    backgroundColor: '#1c052f',
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#652a9c',
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#652a9c',
  },
  suggestionText: {
    color: '#e0c8c4',
    fontSize: 14,
  },
  locationButton: {
    backgroundColor: '#652a9c',
    borderRadius: 15,
    paddingVertical: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#2d0a4a',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#652a9c',
  },
  selectionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#aa63d2',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  selectionCoords: {
    color: '#fff',
    fontSize: 14,
    marginVertical: 5,
    textAlign: 'center',
  },
  incidentListButtonContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    alignItems: 'center',
  },
  incidentListButton: {
    backgroundColor: '#8b4ac9',
    borderRadius: 25,
    paddingVertical: 12,
    width: 150,
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#652a9c',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterButtonActive: {
    backgroundColor: '#aa63d2',
  },
  incidentListItem: {
    backgroundColor: '#1c052f',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#652a9c',
  },
  incidentListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  incidentListTime: {
    fontSize: 12,
    color: '#ac78cf',
    marginBottom: 5,
  },
  incidentListDescription: {
    fontSize: 14,
    color: '#e0c8c4',
  },
  voteButton: {
    backgroundColor: '#652a9c',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  voteButtonActive: {
    backgroundColor: '#aa63d2',
  },
});