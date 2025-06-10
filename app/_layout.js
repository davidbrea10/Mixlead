// app/_layout.js (CORREGIDO)

import { Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig } from "../components/CustomToastConfig";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  // Renombrado a RootLayout para mayor claridad
  // La lógica para ocultar la barra de navegación de Android va aquí ahora

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" translucent />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>

      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
