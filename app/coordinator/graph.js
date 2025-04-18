import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";

export default function Graph() {
  const { t } = useTranslation(); // Inicializar traducciones
  const router = useRouter();

  // HTML para renderizar el mapa en el WebView
  const mapHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t("graph.header.title")}</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <style>
        #map { height: 100vh; width: 100vw; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        var map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        L.marker([51.505, -0.09]).addTo(map)
          .bindPopup('<b>${t("graph.map.markerPopup")}</b>').openPopup();
      </script>
    </body>
    </html>
  `;

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
          <Pressable onPress={() => router.replace("/employee/home")}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </View>

        {/* Mapa dentro del WebView */}
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}></View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 40,
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomStartRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  icon: { width: 50, height: 50 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  mapContainer: {
    flex: 1,
    padding: 16,
  },
  map: {
    width: Dimensions.get("window").width - 32,
    height: Dimensions.get("window").height - 200,
    overflow: "hidden",
  },
  footer: {
    backgroundColor: "#006892",
    padding: 40,
    alignItems: "flex-end",
    borderTopEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
});
