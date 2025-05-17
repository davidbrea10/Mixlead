import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, Platform } from "react-native"; // Asegúrate de importar Platform si lo usas en useEffect
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import * as NavigationBar from "expo-navigation-bar";

export default function App() {
  useEffect(() => {
    // Esta configuración solo aplica en Android
    if (Platform.OS === "android") {
      const configureNavigationBar = async () => {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setBehaviorAsync("inset-swipe");
          await NavigationBar.setBackgroundColorAsync("#ffffff"); // O un color que combine
        } catch (e) {
          console.warn("Failed to configure navigation bar", e);
        }
      };

      configureNavigationBar();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar hidden />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
