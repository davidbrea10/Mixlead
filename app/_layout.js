import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }} // Sin header en el login
      />
      <Stack.Screen
        name="register"
        options={{ title: "Register", headerShown: false }} // Sin header en register
      />
      <Stack.Screen
        name="settings/settings"
        options={{ title: "Settings", headerShown: false }} // Sin header en settings
      />
      <Stack.Screen
        name="settings/settings-profile"
        options={{ title: "Profile", headerShown: false }} // Sin header en profile
      />
      <Stack.Screen
        name="employee/home"
        options={{ title: "Home", headerShown: false }} // Sin header en home
      />
    </Stack>
  );
}
