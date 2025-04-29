import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router"; // Importar useLocalSearchParams
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import { Asset } from "expo-asset";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";

// --- Constantes ---
const LOCATION_ACCURACY = Location.Accuracy.Balanced;
const WATCH_INTERVAL_MS = 5000;
const WATCH_DISTANCE_INTERVAL_M = 10;

// --- ¡IMPORTANTE! Reemplaza con la ruta REAL a tu icono ---
const CUSTOM_MARKER_ICON = require("../../assets/radiacion.png"); // Asegúrate que la ruta es correcta

export default function Graph() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams(); // Obtener parámetros de la ruta
  const webViewRef = useRef(null);
  const [isProcessingLocation, setIsProcessingLocation] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [hasLocationPermissions, setHasLocationPermissions] = useState(false);
  const [markerIconBase64, setMarkerIconBase64] = useState(null);
  const [isIconLoading, setIsIconLoading] = useState(true);

  // Extraer el radio de los parámetros y convertirlo a número
  const exclusionRadius = params.radius ? parseFloat(params.radius) : null;
  // Podrías usar params.radiusUnit si necesitas convertir unidades, pero Leaflet usa metros
  console.log("Received Radius:", exclusionRadius); // Para depuración

  // --- Efecto para cargar permisos ---
  useEffect(() => {
    (async () => {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        setHasLocationPermissions(true);
      }
    })();
  }, []);

  // --- Efecto para cargar y convertir el icono a Base64 ---
  useEffect(() => {
    const loadIcon = async () => {
      setIsIconLoading(true); // Asegurar que se muestra cargando
      try {
        const asset = Asset.fromModule(CUSTOM_MARKER_ICON);
        await asset.downloadAsync();
        if (asset.localUri) {
          const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mimeType = asset.type ? `image/${asset.type}` : "image/png";
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
        ); // Usar traducciones para errores
      } finally {
        setIsIconLoading(false);
      }
    };
    loadIcon();
  }, []);

  // --- Función para detener el watcher ---
  const stopLocationUpdates = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      console.log("Location watcher stopped.");
    }
  };

  // --- Efecto para limpiar el watcher al desmontar ---
  useEffect(() => {
    return () => {
      stopLocationUpdates();
    };
  }, [locationSubscription]); // Dependencia explícita

  // --- Función para marcar ubicación fija, dibujar círculo e iniciar seguimiento ---
  const markAndTrackLocation = async () => {
    if (!markerIconBase64) {
      console.warn("Attempted to mark location before icon was loaded.");
      Alert.alert(
        t("errors.error", { defaultValue: "Error" }),
        t("errors.iconNotReady", {
          defaultValue: "Map resources are not ready yet.",
        }),
      );
      return;
    }

    setIsProcessingLocation(true);
    try {
      let currentStatus = hasLocationPermissions;
      // Pedir permisos si es necesario
      if (!currentStatus) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            t("graph.location.permissionDeniedTitle"),
            t("graph.location.permissionDeniedMessage"),
          );
          setIsProcessingLocation(false);
          return;
        }
        setHasLocationPermissions(true);
        currentStatus = true;
      }

      // Obtener ubicación actual
      console.log("Getting current location for fixed marker...");
      let initialLocation = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_ACCURACY,
      });
      const { latitude: initialLat, longitude: initialLon } =
        initialLocation.coords;
      console.log("Initial Location obtained:", initialLat, initialLon);

      // Enviar datos al WebView para marcar, centrar y dibujar círculo
      if (webViewRef.current) {
        // ¡Pasar el radio obtenido de los parámetros!
        const script = `setFixedMarkerAndCenter(${initialLat}, ${initialLon}, ${exclusionRadius});`;
        console.log("Injecting script:", script); // Para depurar
        webViewRef.current.injectJavaScript(script);
      } else {
        console.warn("WebView ref not available for initial marker placement.");
      }

      // Iniciar watcher si hay permisos y no está activo
      if (!locationSubscription && currentStatus) {
        console.log("Starting location watcher...");
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: LOCATION_ACCURACY,
            timeInterval: WATCH_INTERVAL_MS,
            distanceInterval: WATCH_DISTANCE_INTERVAL_M,
          },
          (locationUpdate) => {
            const { latitude, longitude } = locationUpdate.coords;
            console.log("Dynamic Location Update:", latitude, longitude);
            // Actualizar indicador dinámico en WebView
            if (webViewRef.current) {
              const script = `updateDynamicLocationIndicator(${latitude}, ${longitude});`;
              webViewRef.current.injectJavaScript(script);
            }
          },
        );
        setLocationSubscription(subscription);
      } else if (!currentStatus) {
        console.warn("Cannot start location watcher without permissions.");
      } else {
        console.log("Location watcher already active or permissions missing.");
      }
    } catch (error) {
      console.error("Error in markAndTrackLocation:", error);
      Alert.alert(
        t("graph.location.errorTitle"),
        t("graph.location.errorMessage"),
      );
    } finally {
      setIsProcessingLocation(false);
    }
  };

  // --- Función para generar el HTML del mapa ---
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
        #map { height: 100%; width: 100%; background-color: #f0f0f0; } /* Color de fondo mientras carga tiles */
        .dynamic-location-icon { /* Indicador azul que se mueve */
            background-color: rgba(0, 122, 255, 0.7); width: 16px; height: 16px;
            border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Asegurar que el script se ejecute después de que el DOM esté listo
        document.addEventListener('DOMContentLoaded', function() {
            var map = L.map('map', { // Deshabilitar zoom temporalmente si causa problemas
                 // doubleClickZoom: false,
                 // touchZoom: false, // Deshabilitar zoom con dedos si interfiere
                 // scrollWheelZoom: false // Deshabilitar zoom con rueda
            }).setView([40.4167, -3.70325], 6); // Vista inicial general

            var fixedMarker = null;
            var dynamicMarker = null;
            var exclusionCircle = null; // Referencia al círculo

            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19, // Permitir zoom cercano
              minZoom: 3,  // Evitar alejarse demasiado
              attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Definir icono personalizado para el marcador fijo
            var customFixedIcon = L.icon({
                iconUrl: '${iconBase64Url}',
                iconSize: [24, 24],    // Tamaño deseado
                iconAnchor: [12, 12],   // Centro del icono
                popupAnchor: [0, -12]  // Popup encima del centro
            });

            // Función PRINCIPAL: Marcar ubicación, dibujar círculo y centrar
            window.setFixedMarkerAndCenter = function(lat, lon, radiusInMeters) {
              console.log('WebView received fixed location:', lat, lon, 'Radius:', radiusInMeters);
              if (!map) { console.error("Map not initialized!"); return; }

              const centerLatLng = L.latLng(lat, lon);

              // Limpiar elementos anteriores
              if (fixedMarker) { map.removeLayer(fixedMarker); fixedMarker = null; }
              if (exclusionCircle) { map.removeLayer(exclusionCircle); exclusionCircle = null; }

              // Añadir nuevo marcador FIJO
              fixedMarker = L.marker(centerLatLng, { icon: customFixedIcon }).addTo(map)
                .bindPopup('<b>${t("graph.map.markedLocationPopup")}</b>')
                .openPopup(); // Abrir popup

              // Dibujar círculo de exclusión si hay radio válido
              if (radiusInMeters && typeof radiusInMeters === 'number' && radiusInMeters > 0) {
                 console.log('Drawing circle with radius:', radiusInMeters);
                 exclusionCircle = L.circle(centerLatLng, {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.2,
                    radius: radiusInMeters // Leaflet usa metros
                 }).addTo(map);

                 // Ajustar vista para mostrar marcador y círculo cómodamente
                 // Usar getBounds del círculo o calcular manualmente
                 if (exclusionCircle) {
                    map.fitBounds(exclusionCircle.getBounds(), { padding: [20, 20] }); // Añadir padding
                 } else {
                     map.setView(centerLatLng, 16); // Zoom si no hay círculo
                 }

              } else {
                   console.log('No valid radius provided, only setting marker.');
                   map.setView(centerLatLng, 16); // Zoom cercano al marcador si no hay círculo
              }
            }

            // Función para actualizar el indicador de ubicación DINÁMICA
            window.updateDynamicLocationIndicator = function(lat, lon) {
              // console.log('WebView received dynamic location:', lat, lon); // Descomentar para depurar mucho movimiento
               if (!map) return;
               const dynamicIcon = L.divIcon({
                   className: 'dynamic-location-icon', iconSize: [16, 16], iconAnchor: [8, 8]
               });
               const currentLatLng = L.latLng(lat, lon);
               if (!dynamicMarker) {
                   dynamicMarker = L.marker(currentLatLng, { icon: dynamicIcon }).addTo(map);
               } else {
                   dynamicMarker.setLatLng(currentLatLng);
               }
            }

            // Mensaje a React Native cuando el mapa esté listo (opcional)
             window.ReactNativeWebView.postMessage('MapReady');
             console.log("Leaflet Map Initialized in WebView");
        });
      </script>
    </body>
    </html>
  `;

  // --- Renderizado ---
  if (isIconLoading) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FF9300" />
        <Text style={styles.loadingText}>
          {t("loading.map", { defaultValue: "Loading Map Resources..." })}
        </Text>
      </LinearGradient>
    );
  }

  // Generar HTML solo cuando el icono esté listo
  const mapHtmlContent = createMapHtml(markerIconBase64);

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

        {/* Contenedor principal */}
        <View style={styles.mapContainer}>
          {mapHtmlContent ? (
            <WebView
              ref={webViewRef}
              originWhitelist={["*"]}
              source={{ html: mapHtmlContent }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn("WebView error: ", nativeEvent);
                // Podrías mostrar un mensaje al usuario aquí
              }}
              onLoadEnd={() => console.log("WebView Load End")} // Confirmar carga
              onMessage={(event) => {
                // Recibir mensajes del WebView
                console.log("Message from WebView:", event.nativeEvent.data);
                if (event.nativeEvent.data === "MapReady") {
                  console.log("Map reported Ready state via postMessage");
                  // Podrías habilitar el botón aquí si estaba deshabilitado
                }
              }}
              scrollEnabled={false} // Importante para evitar conflicto de gestos
              // scalesPageToFit={Platform.OS === 'android'} // Puede ayudar en Android
              // androidHardwareAccelerationDisabled={true} // Probar si hay problemas gráficos
              allowsInlineMediaPlayback={true} // Propiedades adicionales
              mediaPlaybackRequiresUserAction={false}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.errorText}>
                {t("errors.mapLoadFailed", {
                  defaultValue: "Error loading map.",
                })}
              </Text>
            </View>
          )}

          {/* Botón */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={markAndTrackLocation}
            disabled={
              isProcessingLocation || isIconLoading || !markerIconBase64
            }
          >
            {isProcessingLocation ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="locate" size={24} color="#007AFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}></View>
      </View>
    </LinearGradient>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20, // Añadir padding
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  header: {
    paddingTop: Platform.select({
      // Apply platform-specific padding
      ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
      android: 40, // Base padding on Android (adjust value as needed)
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
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#e0e0e0", // Color mientras carga el webview
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
    zIndex: 5,
  },
});
