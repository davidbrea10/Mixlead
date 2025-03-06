import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebase/config"; // Importación de Firebase
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("Logged in:", userCredential.user);
      alert("Login Successful");
      router.replace("employee/home"); // Redirige al home después del login
    } catch (error) {
      alert("Login Failed: " + error.message);
    }
  };

  const handleRegister = () => {
    router.push("/register");
  };

  const handleRecoverPassword = () => {
    alert("Redirect to Recover Password Screen");
  };

  const handleLanguageChange = () => {
    alert("Change Language");
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      {/* Language Selector */}
      <TouchableOpacity
        onPress={handleLanguageChange}
        style={{ position: "absolute", top: 50, right: 20 }}
      >
        <Ionicons name="globe-outline" size={28} color="black" />
      </TouchableOpacity>

      {/* Welcome Text */}
      <Text
        style={{
          fontSize: 32,
          fontWeight: "bold",
          marginBottom: 20,
          color: "#444B59",
        }}
      >
        WELCOME BACK!
      </Text>

      {/* Logo */}
      <Image
        source={require("../assets/icon.png")}
        style={{ width: 193, height: 193, marginBottom: 30 }}
      />

      {/* Email Input */}
      <View style={{ position: "relative", marginBottom: 15 }}>
        <TextInput
          placeholder="Enter Email"
          value={email}
          onChangeText={setEmail}
          style={{
            width: 366,
            height: 55,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            paddingHorizontal: 10,
            fontSize: 18,
            backgroundColor: "white",
          }}
        />
        {email.length > 0 && (
          <TouchableOpacity
            onPress={() => setEmail("")}
            style={{ position: "absolute", right: 10, top: 15 }}
          >
            <Ionicons name="close-circle" size={24} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      {/* Password Input */}
      <View style={{ position: "relative", marginBottom: 10 }}>
        <TextInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={{
            width: 366,
            height: 55,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            paddingHorizontal: 10,
            fontSize: 18,
            backgroundColor: "white",
          }}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{ position: "absolute", right: 10, top: 15 }}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="gray"
          />
        </TouchableOpacity>
      </View>

      {/* Recover Password Link */}
      <TouchableOpacity
        onPress={handleRecoverPassword}
        style={{ alignSelf: "flex-end", marginRight: 24, marginBottom: 20 }}
      >
        <Text style={{ color: "gray", fontSize: 16 }}>Recover Password?</Text>
      </TouchableOpacity>

      {/* Sign In Button */}
      <Pressable
        onPress={handleLogin}
        style={{
          width: 366,
          height: 55,
          backgroundColor: "#006892",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 10,
          marginBottom: 20,
          marginTop: 10,
          fontSize: 18,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 20,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 19 }}>Sign In</Text>
      </Pressable>

      {/* Register Link */}
      <Text
        style={{
          marginTop: 25,
          marginHorizontal: 25,
          fontSize: 23,
          textAlign: "center",
        }}
      >
        If you don’t have an account {""}
        <Text style={{ color: "blue" }} onPress={handleRegister}>
          Register here
        </Text>
        !
      </Text>
    </LinearGradient>
  );
}
