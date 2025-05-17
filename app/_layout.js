import { Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig } from "../components/CustomToastConfig";

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <Toast config={toastConfig} />
    </>
  );
}
