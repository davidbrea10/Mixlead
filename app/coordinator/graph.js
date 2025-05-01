import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import { Asset } from "expo-asset";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";

// --- Constantes ---
const LOCATION_ACCURACY = Location.Accuracy.Balanced; // Can be higher if needed (BestForNavigation)
const WATCH_INTERVAL_MS = 2000; // Update more frequently for smoother movement
const WATCH_DISTANCE_INTERVAL_M = 3; // Update if moved by 3 meters
const CUSTOM_MARKER_ICON = require("../../assets/radiacion.png"); // Ensure path is correct

export default function Graph() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const webViewRef = useRef(null);
  const [isProcessingLocation, setIsProcessingLocation] = useState(false); // For the initial marker placement
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [hasLocationPermissions, setHasLocationPermissions] = useState(null); // Start as null to differentiate between checking and denied/granted
  const [markerIconBase64, setMarkerIconBase64] = useState(null);
  const [isIconLoading, setIsIconLoading] = useState(true);
  const [isWebViewReady, setIsWebViewReady] = useState(false); // Track if WebView and Leaflet are ready

  const exclusionRadius = params.radius ? parseFloat(params.radius) : null;
  console.log("Received Radius:", exclusionRadius);

  // --- Effect: Check/Request Permissions on Mount ---
  useEffect(() => {
    (async () => {
      console.log("Checking location permissions...");
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        console.log("Location permission already granted.");
        setHasLocationPermissions(true);
      } else {
        console.log("Location permission not granted yet.");
        setHasLocationPermissions(false); // Explicitly set to false
        // Optionally request immediately, or wait for button press
        // let { status: requestedStatus } = await Location.requestForegroundPermissionsAsync();
        // setHasLocationPermissions(requestedStatus === 'granted');
      }
    })();
  }, []);

  // --- Effect: Load Custom Icon ---
  useEffect(() => {
    const loadIcon = async () => {
      setIsIconLoading(true);
      try {
        const asset = Asset.fromModule(CUSTOM_MARKER_ICON);
        await asset.downloadAsync();
        if (asset.localUri) {
          const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mimeType = asset.type ? `image/${asset.type}` : "image/png"; // Handle potential missing type
          setMarkerIconBase64(`data:${mimeType};base64,${base64}`);
          console.log("Custom marker icon loaded and converted to Base64.");
        } else {
          throw new Error("Could not get local URI for asset.");
        }
      } catch (error) {
        console.error("Error loading or converting marker icon:", error);
        Alert.alert(
          t("errors.error", { defaultValue: "Error" }),
          t("errors.loadIconFailed", {
            defaultValue: "Failed to load marker icon.",
          }),
        );
      } finally {
        setIsIconLoading(false);
      }
    };
    loadIcon();
  }, [t]); // Add t to dependencies if used inside

  // --- Function: Stop Location Watcher ---
  const stopLocationUpdates = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      console.log("Location watcher stopped.");
    }
  };

  // --- Effect: Cleanup Watcher on Unmount ---
  useEffect(() => {
    return () => {
      stopLocationUpdates();
    };
  }, [locationSubscription]);

  // --- Function: Place Fixed Marker, Draw Circle, Start Tracking ---
  const markFixedLocationAndStartTracking = async () => {
    if (!markerIconBase64 || !isWebViewReady) {
      console.warn("Attempted action before icon/WebView was ready.");
      Alert.alert(
        t("errors.error", { defaultValue: "Error" }),
        t("errors.iconNotReady", {
          // Reuse or create specific error message
          defaultValue:
            "Map resources are not ready yet. Please wait a moment.",
        }),
      );
      return;
    }

    // 1. Check/Request Permissions
    let currentStatus = hasLocationPermissions;
    if (!currentStatus) {
      console.log("Requesting location permissions...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      currentStatus = status === "granted";
      setHasLocationPermissions(currentStatus); // Update state
      if (!currentStatus) {
        Alert.alert(
          t("graph.location.permissionDeniedTitle"),
          t("graph.location.permissionDeniedMessage"),
        );
        return; // Stop if permission denied
      }
    }

    // Stop previous watcher if exists (e.g., if button is pressed again)
    stopLocationUpdates();

    setIsProcessingLocation(true); // Indicate processing for the initial placement

    try {
      // 2. Get Current Location for the FIXED marker
      console.log("Getting current location for fixed marker...");
      let initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // Use higher accuracy for the fixed point
      });
      const { latitude: initialLat, longitude: initialLon } =
        initialLocation.coords;
      console.log("Initial Fixed Location obtained:", initialLat, initialLon);

      // 3. Send command to WebView to set the FIXED marker and circle
      if (webViewRef.current) {
        const script = `setFixedMarkerAndCenter(${initialLat}, ${initialLon}, ${exclusionRadius});`;
        console.log("Injecting script for fixed marker:", script);
        webViewRef.current.injectJavaScript(script);
      } else {
        console.warn("WebView ref not available for initial marker placement.");
        setIsProcessingLocation(false);
        return; // Can't proceed without WebView
      }

      // 4. Start the Location Watcher for the DYNAMIC marker
      console.log("Starting location watcher for dynamic updates...");
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: LOCATION_ACCURACY,
          timeInterval: WATCH_INTERVAL_MS,
          distanceInterval: WATCH_DISTANCE_INTERVAL_M,
        },
        (locationUpdate) => {
          // This callback runs repeatedly
          const { latitude, longitude } = locationUpdate.coords;
          // console.log("Dynamic Location Update:", latitude, longitude); // Can be very verbose
          if (webViewRef.current) {
            // Send command to update the DYNAMIC indicator
            const script = `updateDynamicLocationIndicator(${latitude}, ${longitude});`;
            webViewRef.current.injectJavaScript(script);
          }
        },
      );
      setLocationSubscription(subscription); // Store the subscription to allow stopping it
      console.log("Location watcher started successfully.");
    } catch (error) {
      console.error("Error in markFixedLocationAndStartTracking:", error);
      Alert.alert(
        t("graph.location.errorTitle"),
        t("graph.location.errorMessage"),
      );
    } finally {
      setIsProcessingLocation(false); // Finished initial placement processing
    }
  };

  // --- Function to generate Map HTML ---
  // (This function is largely the same as before, ensuring it defines
  // BOTH setFixedMarkerAndCenter AND updateDynamicLocationIndicator)
  const createMapHtml = (iconBase64Url) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>${t("graph.header.title")}</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <style>
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
        #map { height: 100%; width: 100%; background-color: #f0f0f0; }
        /* Style for the DYNAMIC (moving) blue dot */
        .dynamic-location-icon {
            background-color: rgba(0, 100, 255, 0.8); /* Slightly different blue */
            width: 14px; /* Slightly smaller */
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
            var map = L.map('map').setView([40.4167, -3.70325], 6); // Initial general view

            var fixedMarker = null;      // Marker for the initial location (radiation icon)
            var dynamicMarker = null;    // Marker for the current location (blue dot)
            var exclusionCircle = null;  // Circle around the fixed marker

            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              minZoom: 3,
              attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Define icon for the FIXED marker (radiation)
            var customFixedIcon = L.icon({
                iconUrl: '${iconBase64Url}',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });

            // Define icon for the DYNAMIC marker (blue dot)
            var dynamicLocationIcon = L.divIcon({
                className: 'dynamic-location-icon',
                iconSize: [14, 14],
                iconAnchor: [7, 7] // Center the small dot
            });

            // --- Function to set the FIXED marker and circle ---
            window.setFixedMarkerAndCenter = function(lat, lon, radiusInMeters) {
              console.log('WebView: Setting fixed marker at', lat, lon, 'with radius', radiusInMeters);
              if (!map) { console.error("Map not initialized!"); return; }

              const centerLatLng = L.latLng(lat, lon);

              // Remove previous fixed marker and circle if they exist
              if (fixedMarker) { map.removeLayer(fixedMarker); fixedMarker = null; }
              if (exclusionCircle) { map.removeLayer(exclusionCircle); exclusionCircle = null; }

              // Add new FIXED marker (radiation icon)
              fixedMarker = L.marker(centerLatLng, { icon: customFixedIcon }).addTo(map)
                .bindPopup('<b>${t("graph.map.markedLocationPopup", { defaultValue: "Marked Location" })}</b>')
                .openPopup();

              // Draw exclusion circle if radius is valid
              if (radiusInMeters && typeof radiusInMeters === 'number' && radiusInMeters > 0) {
                 console.log('WebView: Drawing circle with radius:', radiusInMeters);
                 exclusionCircle = L.circle(centerLatLng, {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.2,
                    radius: radiusInMeters
                 }).addTo(map);

                 // Adjust view to fit the circle bounds
                 map.fitBounds(exclusionCircle.getBounds(), { padding: [30, 30] }); // More padding
              } else {
                 console.log('WebView: No valid radius, only setting fixed marker.');
                 map.setView(centerLatLng, 17); // Zoom closer if no circle
              }
            }

            // --- Function to update the DYNAMIC location indicator (blue dot) ---
            window.updateDynamicLocationIndicator = function(lat, lon) {
               // console.log('WebView: Updating dynamic location to', lat, lon); // Very verbose
               if (!map) return;

               const currentLatLng = L.latLng(lat, lon);

               if (!dynamicMarker) {
                   // Create the dynamic marker if it doesn't exist
                   console.log('WebView: Creating dynamic marker for the first time.');
                   dynamicMarker = L.marker(currentLatLng, { icon: dynamicLocationIcon }).addTo(map);
               } else {
                   // Just update the position if it already exists
                   dynamicMarker.setLatLng(currentLatLng);
               }

               // Optionally, pan the map to keep the dynamic marker in view
               // Be careful with this - might fight with user panning
               // if (!map.getBounds().contains(currentLatLng)) {
               //    console.log("Panning map to keep dynamic marker in view");
               //    map.panTo(currentLatLng);
               // }
            }

            // Notify React Native that the map is ready
            if (window.ReactNativeWebView) {
                 window.ReactNativeWebView.postMessage('MapReady');
                 console.log("Leaflet Map Initialized in WebView and ready message sent.");
            } else {
                 console.error("ReactNativeWebView object not found. Cannot send MapReady message.");
            }
        });
      </script>
    </body>
    </html>
  `;

  // --- Render ---

  // Show loading indicator for the icon first
  if (isIconLoading || hasLocationPermissions === null) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FF9300" />
        <Text style={styles.loadingText}>
          {isIconLoading
            ? t("loading.map", { defaultValue: "Loading Map Resources..." })
            : t("loading.permissions", {
                defaultValue: "Checking Permissions...",
              })}
        </Text>
      </LinearGradient>
    );
  }

  // Generate HTML only when the icon is ready
  const mapHtmlContent = markerIconBase64
    ? createMapHtml(markerIconBase64)
    : null;

  // Handle case where HTML couldn't be generated (e.g., icon load failed)
  if (!mapHtmlContent) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer} // Reuse loading container style
      >
        <Text style={styles.errorText}>
          {t("errors.mapLoadFailed", { defaultValue: "Error preparing map." })}
        </Text>
        {/* Optionally add a back button here */}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image
              source={require("../../assets/go-back.png")}
              style={styles.icon}
            />
          </Pressable>
          <Text style={styles.title}>{t("graph.header.title")}</Text>
          <Pressable onPress={() => router.replace("/coordinator/home")}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtmlContent }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadEnd={() => {
              console.log("WebView Load End");
              // Consider setting webview ready slightly delayed or after receiving 'MapReady' msg
            }}
            onMessage={(event) => {
              console.log("Message from WebView:", event.nativeEvent.data);
              if (event.nativeEvent.data === "MapReady") {
                console.log("Map reported Ready state via postMessage");
                setIsWebViewReady(true); // Mark WebView as ready ONLY when Leaflet is ready
              }
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn("WebView error: ", nativeEvent);
              setIsWebViewReady(false); // Mark as not ready on error
              Alert.alert(t("errors.error"), t("errors.mapLoadFailed"));
            }}
            scrollEnabled={false} // Keep this false
            // scalesPageToFit={Platform.OS === 'android'} // Keep if it helps
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
          />

          {/* Button to trigger fixed location marking and start tracking */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={markFixedLocationAndStartTracking}
            disabled={
              isProcessingLocation || !isWebViewReady || !markerIconBase64
            } // Disable if processing, webview not ready, or icon not loaded
          >
            {isProcessingLocation ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              // Change icon maybe? Or keep locate
              <Ionicons
                name="locate"
                size={24}
                color={
                  !isWebViewReady || !markerIconBase64 ? "#ccc" : "#007AFF"
                }
              /> // Grey out icon if disabled
            )}
          </TouchableOpacity>

          {/* Optional: Add a button to stop tracking */}
          {/* {locationSubscription && (
             <TouchableOpacity
                style={[styles.locationButton, { bottom: 90, backgroundColor: 'rgba(255, 50, 50, 0.8)' }]} // Position differently
                onPress={stopLocationUpdates}
              >
                 <Ionicons name="stop-circle-outline" size={24} color="white" />
             </TouchableOpacity>
           )} */}
        </View>

        {/* Footer */}
        <View style={styles.footer}></View>
      </View>
    </LinearGradient>
  );
}

// --- Styles --- (Keep the existing styles, maybe adjust padding/margins if needed)
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
    textAlign: "center", // Center text
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  header: {
    paddingTop: Platform.select({
      ios: 60,
      android: 40,
    }),
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomStartRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  icon: { width: 45, height: 45 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginHorizontal: 10,
    flexShrink: 1, // Allow title to shrink if needed
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#e0e0e0",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  footer: {
    backgroundColor: "#006892",
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "flex-end",
    borderTopEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
    minHeight: 50, // Ensure footer has some height
  },
  locationButton: {
    position: "absolute",
    bottom: 25,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 12,
    borderRadius: 50,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 5, // Ensure button is above map but below header/footer if they overlap
  },
});
