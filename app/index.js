import { View, Text, TextInput, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (email && password) {
      router.replace("/home"); // Redirige al Home reemplazando el Login
    } else {
      alert("Please enter email and password");
    }
  };

  const handleRegister = () => {
    alert("Redirect to Register Screen");
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      {/* Welcome Text */}
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        WELCOME BACK!
      </Text>

      {/* Logo */}
      <Image
        source={require("../assets/icon.png")}
        style={{ width: 150, height: 150, marginBottom: 30 }}
      />

      {/* Email Input */}
      <TextInput
        placeholder="Enter Email"
        value={email}
        onChangeText={setEmail}
        style={{
          width: 300,
          height: 50,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          paddingHorizontal: 10,
          marginBottom: 15,
        }}
      />

      {/* Password Input */}
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          width: 300,
          height: 50,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          paddingHorizontal: 10,
          marginBottom: 10,
        }}
      />

      {/* Sign In Button */}
      <Pressable
        onPress={handleLogin}
        style={{
          width: 300,
          height: 50,
          backgroundColor: "#006892",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18 }}>Sign In</Text>
      </Pressable>

      {/* Register Link */}
      <Text>
        If you don’t have an account{" "}
        <Text style={{ color: "blue" }} onPress={handleRegister}>
          Register here!
        </Text>
      </Text>
    </LinearGradient>
  );
}
