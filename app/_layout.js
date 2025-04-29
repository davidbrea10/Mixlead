// app/_layout.js (Example Recap)
import { Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig } from "../components/CustomToastConfig"; // Adjust path if needed

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Other screens */}
      </Stack>
      {/* Ensure Toast is here with the config */}
      <Toast config={toastConfig} />
    </>
  );
}

// ... (rest of your layout file)
