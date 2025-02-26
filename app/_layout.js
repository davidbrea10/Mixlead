import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }} // Sin header en el login
      />
      <Stack.Screen
        name="home"
        options={{ title: "Home", headerShown: false }} // Sin header en home
      />
      <Stack.Screen
        name="register"
        options={{ title: "Register", headerShown: false }} // Sin header en home
      />
      <Stack.Screen
        name="settings"
        options={{ title: "Settings", headerShown: false }} // Sin header en home
      />
      <Stack.Screen
        name="settings-profile"
        options={{ title: "Profile", headerShown: false }} // Sin header en home
      />
    </Stack>
  );
}
