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
    </Stack>
  );
}
