import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Modal,
  ScrollView,
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
const CENTER_ICON_SIZE = 30;

export default function Graph() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const webViewRef = useRef(null);
  const mapCenterPromiseResolveRef = useRef(null);

  const [activityStates, setActivityStates] = useState({
    isGettingPermissions: true,
    isIconLoading: true,
    isMarkingMaterial: false,
    isCenteringMap: false,
  });

  const [locationSubscription, setLocationSubscription] = useState(null);
  // Inicializa hasLocationPermissions a null para saber cuándo aún se está verificando
  const [hasLocationPermissions, setHasLocationPermissions] = useState(null);
  const [markerIconBase64, setMarkerIconBase64] = useState(null);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [isMaterialMarked, setIsMaterialMarked] = useState(false);
  const [isLegendModalVisible, setIsLegendModalVisible] = useState(true);

  const exclusionRadius = params.radius ? parseFloat(params.radius) : null;
  // console.log("Received Radius:", exclusionRadius);

  useEffect(() => {
    (async () => {
      setActivityStates((prev) => ({ ...prev, isGettingPermissions: true }));
      console.log("Checking location permissions...");
      let { status: currentStatus } =
        await Location.getForegroundPermissionsAsync();

      if (currentStatus !== "granted") {
        console.log("Location permission not granted initially, requesting...");
        // Si no está concedido, lo pedimos
        let { status: requestedStatus } =
          await Location.requestForegroundPermissionsAsync();
        currentStatus = requestedStatus; // Actualizamos el estado con el resultado de la petición
      }

      if (currentStatus === "granted") {
        console.log("Location permission is granted.");
        setHasLocationPermissions(true);
      } else {
        console.log("Location permission was denied or not determined.");
        setHasLocationPermissions(false);
        // Solo mostramos alerta si fue explícitamente denegado después de una petición o si falla la comprobación inicial
        // (podrías ajustar esta lógica de alerta si quieres que siempre aparezca si no hay permisos)
        if (currentStatus !== "granted" && currentStatus !== "undetermined") {
          // Evitar alerta si solo es undetermined al inicio
          Alert.alert(
            t("graph.location.permissionDeniedTitle"),
            t("graph.location.permissionDeniedMessage"),
          );
        }
      }
      setActivityStates((prev) => ({ ...prev, isGettingPermissions: false }));
    })();
  }, [t]); // `t` es para traducciones, si cambian, se re-ejecuta.

  // --- Effect: Load Custom Icon --- (Sin cambios)
  useEffect(() => {
    const loadIcon = async () => {
      // ... (tu código de loadIcon sin cambios) ...
    };
    loadIcon();
  }, [t]);

  // --- Effect: Load Custom Icon ---
  useEffect(() => {
    const loadIcon = async () => {
      setActivityStates((prev) => ({ ...prev, isIconLoading: true }));
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
        );
      } finally {
        setActivityStates((prev) => ({ ...prev, isIconLoading: false }));
      }
    };
    loadIcon();
  }, [t]);

  // --- Function: Stop Location Watcher ---
  const stopLocationUpdates = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      console.log("Location watcher stopped.");
    }
  }, [locationSubscription]);

  // --- Effect: Cleanup Watcher on Unmount ---
  useEffect(() => {
    return () => {
      stopLocationUpdates();
    };
  }, [stopLocationUpdates]);

  // --- Effect: Cleanup Watcher on Unmount ---
  useEffect(() => {
    return () => {
      stopLocationUpdates();
    };
  }, [locationSubscription]);

  // --- Function: Start/Manage Dynamic Location Watcher ---
  const startDynamicLocationWatcher = useCallback(async () => {
    // No es necesario verificar hasLocationPermissions aquí si el useEffect que lo llama ya lo hace.
    // Pero mantenerlo como doble chequeo no hace daño.
    if (hasLocationPermissions !== true) {
      // Asegurarse que sea estrictamente true
      console.log(
        "Permissions not granted. Cannot start watcher from startDynamicLocationWatcher.",
      );
      // Opcional: intentar pedir permisos de nuevo si se llama esta función y no los tiene.
      // Por ahora, asumimos que el useEffect principal de permisos ya lo manejó.
      return false;
    }

    if (locationSubscription) {
      console.log("Watcher already active via startDynamicLocationWatcher.");
      return true;
    }

    console.log("Attempting to start location watcher for dynamic updates...");
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: LOCATION_ACCURACY,
          timeInterval: WATCH_INTERVAL_MS,
          distanceInterval: WATCH_DISTANCE_INTERVAL_M,
        },
        (locationUpdate) => {
          const { latitude, longitude } = locationUpdate.coords;
          setCurrentCoords({ latitude, longitude });
          if (webViewRef.current && isWebViewReady) {
            // Asegurarse que webViewReady también sea true
            const script = `updateDynamicLocationIndicator(${latitude}, ${longitude});`;
            webViewRef.current.injectJavaScript(script);
          }
        },
      );
      setLocationSubscription(subscription);
      console.log(
        "Location watcher started successfully by startDynamicLocationWatcher.",
      );
      return true;
    } catch (error) {
      console.error("Failed to start location watcher:", error);
      Alert.alert(t("errors.error"), "Could not start location tracking.");
      return false;
    }
  }, [hasLocationPermissions, locationSubscription, isWebViewReady, t]); // Agregado isWebViewReady aquí también

  // --- ✨ NUEVO useEffect para iniciar el watcher cuando todo esté listo ---
  useEffect(() => {
    // Solo intentar iniciar si los permisos son 'true' (concedidos) y el WebView está listo
    if (hasLocationPermissions === true && isWebViewReady) {
      console.log(
        "DEPENDENCY EFFECT: Permissions and WebView ready. Initiating dynamic location watcher.",
      );
      startDynamicLocationWatcher();
    } else {
      // Log para depuración
      if (hasLocationPermissions !== true) {
        console.log(
          "DEPENDENCY EFFECT: Watcher not started: hasLocationPermissions is not true (current: ",
          hasLocationPermissions,
          ")",
        );
      }
      if (!isWebViewReady) {
        console.log(
          "DEPENDENCY EFFECT: Watcher not started: isWebViewReady is false",
        );
      }
    }
  }, [hasLocationPermissions, isWebViewReady, startDynamicLocationWatcher]); // Dependencias clave

  // --- handleViewMyCurrentLocation --- (Sin cambios significativos, pero se beneficia del watcher ya iniciado)
  const handleViewMyCurrentLocation = async () => {
    // ... (tu código actual está bien, se beneficiará si startDynamicLocationWatcher ya fue llamado por el useEffect)
    // Asegúrate que startDynamicLocationWatcher se llame aquí también si es necesario (por si el useEffect no lo hizo)
    // O confía en que el useEffect lo hará. Si el watcher ya está activo, esta función principalmente centrará el mapa.
    if (!isWebViewReady) {
      Alert.alert(t("errors.error"), "Map not ready yet.");
      return;
    }
    setActivityStates((prev) => ({ ...prev, isCenteringMap: true }));

    // Intenta iniciar el watcher si no está activo (o si falló el useEffect por alguna razón)
    // startDynamicLocationWatcher() ya tiene una guarda para no iniciarse múltiples veces.
    const watcherStarted = await startDynamicLocationWatcher();

    if (!watcherStarted && hasLocationPermissions !== true) {
      // Si el watcher no pudo iniciarse porque los permisos no fueron concedidos (ni siquiera después del intento en startDynamicLocationWatcher)
      setActivityStates((prev) => ({ ...prev, isCenteringMap: false }));
      // La alerta de permisos ya se habrá mostrado desde startDynamicLocationWatcher o el useEffect de permisos
      return;
    }

    if (currentCoords) {
      console.log("Panning to currentCoords from state:", currentCoords);
      webViewRef.current?.injectJavaScript(
        `panToUserLocation(${currentCoords.latitude}, ${currentCoords.longitude});`,
      );
      setActivityStates((prev) => ({ ...prev, isCenteringMap: false }));
    } else {
      // Si no hay currentCoords (el watcher acaba de empezar o aún no ha emitido), obtenemos una posición fresca
      try {
        console.log("Getting fresh current position for centering map...");
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude } = location.coords;
        // Actualizamos currentCoords para que esté disponible la próxima vez
        // y para que el watcher, si está activo, no cause un "salto" inmediato
        setCurrentCoords({ latitude, longitude });
        console.log("Panning to fresh location:", latitude, longitude);
        webViewRef.current?.injectJavaScript(
          `panToUserLocation(${latitude}, ${longitude});`,
        );
      } catch (error) {
        console.error("Error getting current position for centering:", error);
        Alert.alert(
          t("errors.error"),
          "Could not get current location to center map.",
        );
      } finally {
        setActivityStates((prev) => ({ ...prev, isCenteringMap: false }));
      }
    }
  };
  // --- Function: Place Fixed Marker ("Mark Material") ---
  const handleMarkMaterial = async () => {
    if (!isWebViewReady || !markerIconBase64) {
      Alert.alert(t("errors.error"), t("errors.iconNotReady"));
      return;
    }
    // No necesitamos verificar permisos de localización aquí necesariamente,
    // ya que no usaremos el GPS del dispositivo para este marcador.

    setActivityStates((prev) => ({ ...prev, isMarkingMaterial: true }));
    try {
      console.log("Requesting map center from WebView for marking material...");
      // Pide al WebView que envíe las coordenadas de su centro
      webViewRef.current?.injectJavaScript("getMapCenter();");

      // Espera a que onMessage reciba las coordenadas y resuelva esta promesa
      const centerCoords = await new Promise((resolve, reject) => {
        mapCenterPromiseResolveRef.current = resolve; // Guarda la función resolve de la promesa
        // Opcional: Timeout para evitar espera infinita
        setTimeout(() => {
          if (mapCenterPromiseResolveRef.current) {
            // Si no se ha resuelto aún
            reject(new Error("Timeout waiting for map center coordinates."));
            mapCenterPromiseResolveRef.current = null;
          }
        }, 7000); // Timeout de 7 segundos
      });

      if (centerCoords && webViewRef.current) {
        console.log(
          "Using map center to mark material:",
          centerCoords.lat,
          centerCoords.lng,
        );
        const script = `setFixedMarkerAndCircle(${centerCoords.lat}, ${centerCoords.lng}, ${exclusionRadius});`;
        webViewRef.current.injectJavaScript(script);
        setIsMaterialMarked(true); // <--- AÑADIR ESTO para indicar que el material está marcado
      } else {
        throw new Error(
          "Could not get map center coordinates to mark material.",
        );
      }
    } catch (error) {
      console.error("Error in handleMarkMaterial:", error);
      Alert.alert(
        t("graph.location.errorTitle", { defaultValue: "Location Error" }),
        error.message ||
          t("graph.location.errorMessage", {
            defaultValue: "Could not mark location.",
          }),
      );
    } finally {
      setActivityStates((prev) => ({ ...prev, isMarkingMaterial: false }));
    }
  };

  const handleUnmarkMaterial = async () => {
    if (!isWebViewReady) {
      Alert.alert(t("errors.error"), "Map not ready yet.");
      return;
    }
    // Opcional: puedes añadir un estado de carga para "desmarcar" si lo ves necesario
    // setActivityStates(prev => ({ ...prev, isUnmarkingMaterial: true }));

    try {
      console.log("Requesting to unmark material from WebView...");
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript("removeFixedMarkerAndCircle();");
      }
      setIsMaterialMarked(false); // Revertir el estado
    } catch (error) {
      console.error("Error in handleUnmarkMaterial:", error);
      Alert.alert(
        t("errors.error", { defaultValue: "Error" }),
        "Could not unmark material.", // Añade una traducción para esto si quieres
      );
    } finally {
      // setActivityStates(prev => ({ ...prev, isUnmarkingMaterial: false }));
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
        .dynamic-location-icon {
            background-color: rgba(0, 100, 255, 0.8); width: 14px; height: 14px;
            border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
            var map = L.map('map').setView([40.4167, -3.70325], 6);
            var fixedMarker = null;
            var dynamicMarker = null;
            var exclusionCircle = null;

            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19, minZoom: 3,
              attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            var customFixedIcon = L.icon({
                iconUrl: '${iconBase64Url || ""}', // Ensure iconBase64Url is defined or empty string
                iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12]
            });

            var dynamicLocationIcon = L.divIcon({
                className: 'dynamic-location-icon',
                iconSize: [14, 14], iconAnchor: [7, 7]
            });

            window.setFixedMarkerAndCircle = function(lat, lon, radiusInMeters) {
              console.log('WebView: Setting fixed marker at', lat, lon, 'with radius', radiusInMeters);
              if (!map) { console.error("Map not initialized!"); return; }
              const centerLatLng = L.latLng(lat, lon);
              if (fixedMarker) { map.removeLayer(fixedMarker); fixedMarker = null; }
              if (exclusionCircle) { map.removeLayer(exclusionCircle); exclusionCircle = null; }

              if ('${iconBase64Url}') { // Only add if icon is actually loaded
                fixedMarker = L.marker(centerLatLng, { icon: customFixedIcon }).addTo(map)
                  .bindPopup('<b>${t("graph.map.markedLocationPopup", { defaultValue: "Marked Location" })}</b>')
                  .openPopup();
              } else {
                console.warn("WebView: customFixedIcon URL is not available, skipping fixed marker.");
              }

              if (radiusInMeters && typeof radiusInMeters === 'number' && radiusInMeters > 0) {
                  exclusionCircle = L.circle(centerLatLng, {
                    color: 'red', fillColor: '#f03', fillOpacity: 0.2, radius: radiusInMeters
                  }).addTo(map);
                  map.fitBounds(exclusionCircle.getBounds(), { padding: [50, 50] }); // Increased padding
              } else {
                  map.setView(centerLatLng, 17);
              }
            }

            window.updateDynamicLocationIndicator = function(lat, lon) {
              if (!map) return;
              const currentLatLng = L.latLng(lat, lon);
              if (!dynamicMarker) {
                  dynamicMarker = L.marker(currentLatLng, { icon: dynamicLocationIcon }).addTo(map);
              } else {
                  dynamicMarker.setLatLng(currentLatLng);
              }
            }

            // --- NEW: Function to pan map to user's location ---
            window.panToUserLocation = function(lat, lon, zoomLevel = 17) {
                if (!map) return;
                console.log('WebView: Panning to user location:', lat, lon);
                map.setView([lat, lon], zoomLevel);
            }

            window.getMapCenter = function() {
                if (map && window.ReactNativeWebView) {
                    const center = map.getCenter();
                    const centerCoords = { lat: center.lat, lng: center.lng };
                    // Envía un objeto JSON stringificado para facilitar el parseo en React Native
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapCenter', data: centerCoords }));
                    console.log('WebView: Sent map center to RN:', centerCoords);
                } else {
                    console.error('WebView: Map or ReactNativeWebView not available for getMapCenter.');
                }
            };

             window.removeFixedMarkerAndCircle = function() {
              if (map) { // Asegurarse que el mapa existe
                  if (fixedMarker) {
                      map.removeLayer(fixedMarker);
                      fixedMarker = null; // Importante ponerlo a null
                  }
                  if (exclusionCircle) {
                      map.removeLayer(exclusionCircle);
                      exclusionCircle = null; // Importante ponerlo a null
                  }
                  console.log('WebView: Fixed marker and circle removed.');
                  // Opcional: podrías enviar un mensaje de vuelta a React Native si necesitas confirmación
                  // if (window.ReactNativeWebView) {
                  //   window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'materialUnmarked' }));
                  // }
              } else {
                  console.error('WebView: Map not available for removeFixedMarkerAndCircle.');
              }
            };
            
            // Notificar que el mapa está listo
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('MapReady');
            }
        });
      </script>
    </body>
    </html>
  `;

  // --- Render ---

  // Show loading indicator for the icon first
  // --- Render ---
  if (activityStates.isGettingPermissions || activityStates.isIconLoading) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FF9300" />
        <Text style={styles.loadingText}>
          {activityStates.isIconLoading
            ? t("loading.map", { defaultValue: "Loading Map Resources..." })
            : t("loading.permissions", {
                defaultValue: "Checking Permissions...",
              })}
        </Text>
      </LinearGradient>
    );
  }

  // Generate HTML only when the icon is ready
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

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtmlContent }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadEnd={() => console.log("WebView Load End")}
            onMessage={(event) => {
              const messageData = event.nativeEvent.data;
              if (messageData === "MapReady") {
                console.log("RN: Map reported Ready state");
                setIsWebViewReady(true);
                // El useEffect [hasLocationPermissions, isWebViewReady] se encargará de llamar a startDynamicLocationWatcher
              } else {
                try {
                  const parsedMessage = JSON.parse(messageData);
                  if (
                    parsedMessage.type === "mapCenter" &&
                    parsedMessage.data
                  ) {
                    console.log(
                      "RN: Received mapCenter from WebView",
                      parsedMessage.data,
                    );
                    if (mapCenterPromiseResolveRef.current) {
                      mapCenterPromiseResolveRef.current(parsedMessage.data); // Resuelve la promesa en handleMarkMaterial
                      mapCenterPromiseResolveRef.current = null; // Limpia la ref para la próxima vez
                    }
                  }
                } catch (e) {
                  // console.warn("RN: Error parsing WebView message or unknown message:", messageData);
                }
              }
            }}
            onError={(syntheticEvent) => {
              /* ... (sin cambios) ... */
            }}
            scrollEnabled={true} // Permitir que el usuario mueva el mapa
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
          />

          {/* --- ✨ MODIFICADO: Icono de localizador fijo en el centro de la pantalla --- */}
          {!isMaterialMarked && ( // Solo mostrar si el material NO está marcado
            <View style={styles.centerLocatorContainer} pointerEvents="none">
              <Ionicons name="pin" size={CENTER_ICON_SIZE} color="#FF0000" />
            </View>
          )}

          {/* Button to Center on User's Current Location */}
          <TouchableOpacity
            style={styles.viewLocationButton} // New style or reuse/modify locationButton
            onPress={handleViewMyCurrentLocation}
            disabled={!isWebViewReady || activityStates.isCenteringMap}
          >
            {activityStates.isCenteringMap ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons
                name="locate"
                size={24}
                color={!isWebViewReady ? "#ccc" : "#007AFF"}
              />
            )}
          </TouchableOpacity>

          {/* Button to Mark Material / Unmark Material */}
          {exclusionRadius != null && (
            <TouchableOpacity
              style={[
                styles.markMaterialButton, // Estilo base
                isMaterialMarked && styles.unmarkMaterialButton, // Estilo cuando está marcado (ej. fondo azul)
              ]}
              onPress={
                isMaterialMarked ? handleUnmarkMaterial : handleMarkMaterial
              }
              disabled={
                // Cuando está marcado, el botón de desmarcar no debería estar deshabilitado por estas condiciones
                (isMaterialMarked
                  ? false // Lógica de deshabilitación para "Unmark" (probablemente solo !isWebViewReady)
                  : activityStates.isMarkingMaterial || !markerIconBase64) || // Lógica original para "Mark"
                !isWebViewReady // Siempre deshabilitado si el webview no está listo
              }
            >
              {/* Muestra el ActivityIndicator solo cuando se está marcando, no al desmarcar (a menos que añadas un estado para ello) */}
              {activityStates.isMarkingMaterial && !isMaterialMarked ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.markMaterialButtonText}>
                  {isMaterialMarked
                    ? t("graph.buttons.unmarkMaterial", {
                        defaultValue: "Unmark Material",
                      })
                    : t("graph.buttons.markMaterial", {
                        defaultValue: "Mark Material",
                      })}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.helpButton} // Añade este estilo en StyleSheet
            onPress={() => setIsLegendModalVisible(true)} // Acción: Abrir el modal
          >
            {/* Puedes usar Ionicons u otro set de iconos */}
            <Ionicons name="help-circle-outline" size={30} color="#006892" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}></View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={isLegendModalVisible}
          onRequestClose={() => setIsLegendModalVisible(false)} // Botón atrás Android
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentContainer}>
              <Text style={styles.modalTitle}>
                {t("graph.legend.title", "Leyenda de Zonas")}
              </Text>
              <ScrollView style={styles.modalScrollView}>
                {/* Zona Vigilada / Controlada (Verde) */}
                <View style={styles.legendItem}>
                  <Image
                    source={require("../../assets/vigilada.png")}
                    style={styles.legendSymbol}
                  />
                  <View style={styles.legendTextContainer}>
                    <Text style={styles.legendZoneName}>
                      {t(
                        "graph.legend.controlled.name",
                        "Zona Controlada (Verde)",
                      )}
                    </Text>
                    <Text style={styles.legendDescription}>
                      {t(
                        "graph.legend.controlled.desc",
                        "Límite práctico zona vigilada (>3.3 µSv/h, radio efectivo a 20 µSv/h). Acceso restringido.",
                      )}
                    </Text>
                  </View>
                </View>

                {/* Zona Permanencia Limitada (Amarillo) */}
                <View style={styles.legendItem}>
                  <Image
                    source={require("../../assets/limitada.png")}
                    style={styles.legendSymbol}
                  />
                  <View style={styles.legendTextContainer}>
                    <Text style={styles.legendZoneName}>
                      {t(
                        "graph.legend.limitedStay.name",
                        "Zona Permanencia Limitada (Amarillo)",
                      )}
                    </Text>
                    <Text style={styles.legendDescription}>
                      {t(
                        "graph.legend.limitedStay.desc",
                        "Dentro del límite de 20 µSv/h. Solo operadores.",
                      )}
                    </Text>
                  </View>
                </View>

                {/* Zona Acceso Prohibido (Rojo) */}
                <View style={styles.legendItem}>
                  <Image
                    source={require("../../assets/prohibida.png")}
                    style={styles.legendSymbol}
                  />
                  <View style={styles.legendTextContainer}>
                    <Text style={styles.legendZoneName}>
                      {t(
                        "graph.legend.prohibited.name",
                        "Zona Acceso Prohibido (Rojo)",
                      )}
                    </Text>
                    <Text style={styles.legendDescription}>
                      {t(
                        "graph.legend.prohibited.desc",
                        "> 250 µSv/h. Acceso prohibido.",
                      )}
                    </Text>
                  </View>
                </View>

                {/* Zona Telemando */}
                <View style={styles.legendItem}>
                  {/* Puedes usar un icono específico o un placeholder */}
                  <Ionicons
                    name="radio-outline"
                    size={24}
                    color="blue"
                    style={styles.legendSymbolPlaceholder}
                  />
                  <View style={styles.legendTextContainer}>
                    <Text style={styles.legendZoneName}>
                      {t(
                        "graph.legend.remoteControl.name",
                        "Zona Posicionamiento Telemando",
                      )}
                    </Text>
                    <Text style={styles.legendDescription}>
                      {t(
                        "graph.legend.remoteControl.desc",
                        "Radio de 10 metros para operación remota.",
                      )}
                    </Text>
                  </View>
                </View>
              </ScrollView>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setIsLegendModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>
                  {t("common.ok", "OK")}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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

  viewLocationButton: {
    position: "absolute",
    bottom: 90, // Position higher if there's another button below
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
  // New style for "Mark Material" button
  markMaterialButton: {
    position: "absolute",
    bottom: 25, // Original position of the old single button
    right: 20, // Or left: 20, or center it, etc.
    backgroundColor: "#FF9300", // Example color
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Example shape
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 5,
    flexDirection: "row", // To align icon and text if you use both
    alignItems: "center",
  },
  markMaterialButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  centerLocatorContainer: {
    position: "absolute",
    left: "50%",
    top: "50%",
    // Para centrar el icono exactamente, necesitas restar la mitad de su tamaño
    // Asumiendo que el icono es de 30x30 (CENTER_ICON_SIZE)
    marginLeft: -CENTER_ICON_SIZE / 2,
    marginTop: -CENTER_ICON_SIZE / 2,
    width: CENTER_ICON_SIZE,
    height: CENTER_ICON_SIZE,
    justifyContent: "center",
    alignItems: "center",
    // pointerEvents="none" se pone en el View, no en el estilo
  },

  unmarkMaterialButton: {
    position: "absolute",
    bottom: 25, // Original position of the old single button
    right: 20, // Or left: 20, or center it, etc.
    backgroundColor: "#006892", // Example color
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Example shape
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 5,
    flexDirection: "row", // To align icon and text if you use both
    alignItems: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalScrollView: {
    width: "100%",
    marginBottom: 15,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center", // Centrar símbolo y texto verticalmente
    marginBottom: 15,
    width: "100%",
  },
  legendSymbol: {
    // Estilo para tus IMÁGENES de símbolos
    width: 24, // Ajusta según el tamaño de tus imágenes
    height: 24, // Ajusta según el tamaño de tus imágenes
    marginRight: 10,
    resizeMode: "contain", // O 'cover', según prefieras
  },
  legendSymbolPlaceholder: {
    // Estilo para los placeholders si no usas imagen (como el de telemando)
    width: 24,
    height: 24,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor y border se pueden poner inline o crear estilos separados
  },
  legendTextContainer: {
    flex: 1,
  },
  legendZoneName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#444",
  },
  legendDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: "#006892",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginTop: 10,
    elevation: 2,
  },
  modalCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  helpButton: {
    position: "absolute",
    top: 20, // Distancia desde arriba
    right: 20, // Distancia desde la derecha
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Fondo semi-transparente
    padding: 8, // Espaciado interno
    borderRadius: 50, // Para hacerlo circular
    elevation: 5, // Sombra en Android
    shadowColor: "#000", // Sombra en iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 5, // Asegura que esté sobre el mapa
  },
});
