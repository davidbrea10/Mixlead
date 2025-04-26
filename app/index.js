import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore"; // Importa los métodos para acceder a Firestore
import { auth, db } from "../firebase/config"; // Importación de Firebase
import { signInWithEmailAndPassword } from "firebase/auth";
import { useTranslation } from "react-i18next";
import i18n from "./locales/i18n"; // Importa la configuración de i18next

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // Estado de carga

  const flag =
    i18n.language === "es"
      ? require("../assets/es.png")
      : require("../assets/en.png");

  // Initialize i18n
  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) {
      alert(t("please_enter_credentials")); // Mensaje para campos vacíos
      return;
    }

    setLoading(true); // Mostrar indicador de carga
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        alert(t("email_not_verified")); // Mensaje para correo no verificado
        setLoading(false); // Ocultar indicador de carga
        return;
      }

      const userDocRef = doc(db, "employees", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role;

        if (userRole === "admin") {
          router.replace("/admin/home");
        } else if (userRole === "coordinator") {
          router.replace("/coordinator/home");
        } else {
          router.replace("/employee/home");
        }
        alert(t("login_successful")); // Mensaje de inicio de sesión exitoso
      } else {
        alert(t("user_not_found")); // Mensaje para datos de usuario no encontrados
      }
    } catch (error) {
      let errorMessage = t("login_failed");
      if (error.code === "auth/user-not-found") {
        errorMessage += t("user_not_found");
      } else if (error.code === "auth/wrong-password") {
        errorMessage += t("password");
      }
      alert(errorMessage);
    } finally {
      setLoading(false); // Ocultar indicador de carga
    }
  };

  const handleRegister = () => {
    router.push("/register");
  };

  const handleRecoverPassword = () => {
    router.push("/passwordReset");
  };

  const handleLanguageChange = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      {/* Language Selector */}
      <TouchableOpacity
        onPress={handleLanguageChange}
        style={{
          position: "absolute",
          top: 50,
          right: 20,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Image
          source={flag}
          style={{ width: 28, height: 28, borderRadius: 14 }}
          resizeMode="contain"
        />
        <Text style={{ marginLeft: 8, fontSize: 16 }}>
          {t("change_language")}
        </Text>
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
        {t("welcome_back")}
      </Text>

      {/* Logo */}
      <Image
        source={require("../assets/icon.png")}
        style={{ width: 193, height: 193, marginBottom: 30 }}
      />
      {/* Email Input */}
      <View style={{ position: "relative", marginBottom: 15, width: "90%" }}>
        <TextInput
          placeholder={t("enter_email")}
          value={email}
          onChangeText={setEmail}
          style={{
            height: 55,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            paddingHorizontal: 15, // Increased padding
            paddingRight: 40, // Make space for the clear button
            fontSize: 18,
            backgroundColor: "white",
            marginBottom: 10,
          }}
          // --- Email Specific Props ---
          keyboardType="email-address" // Use email keyboard layout
          autoCapitalize="none" // Don't capitalize automatically
          autoComplete="email" // Help with autofill (Android)
          textContentType="emailAddress" // Help with autofill (iOS)
          autoCorrect={false} // Disable auto-correct for emails
        />
        {email.length > 0 && (
          <TouchableOpacity
            onPress={() => setEmail("")}
            style={{
              position: "absolute",
              right: 10,
              top: 0, // Align button vertically
              height: "100%", // Make button full height of input
              justifyContent: "center", // Center icon vertically
              paddingHorizontal: 5, // Add padding for easier tap
            }}
          >
            <Ionicons name="close-circle" size={24} color="gray" />
          </TouchableOpacity>
        )}

        {/* Password Input */}
        <View style={{ position: "relative", marginBottom: 10 }}>
          <TextInput
            placeholder={t("password")}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={{
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

          {/* Recover Password Link */}
          <TouchableOpacity
            onPress={handleRecoverPassword}
            style={{ alignSelf: "flex-end", marginBottom: 20, marginTop: 10 }}
          >
            <Text style={{ color: "gray", fontSize: 16 }}>
              {t("recover_password")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign In Button */}
      <Pressable
        onPress={handleLogin}
        disabled={loading} // Disable button when loading
        style={({ pressed }) => [
          // Style based on pressed state
          {
            width: "90%",
            height: 55,
            backgroundColor: loading ? "#a0a0a0" : "#006892", // Grey out when loading
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 10,
            marginBottom: 20,
            marginTop: 10,
            flexDirection: "row", // To align text and spinner
            opacity: pressed ? 0.8 : 1, // Feedback on press
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 5 }, // Adjusted shadow
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 10, // Adjusted elevation
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#fff"
            style={{ marginRight: 10 }}
          />
        ) : null}
        <Text style={{ color: "#fff", fontSize: 19, fontWeight: "bold" }}>
          {loading ? t("signing_in") : t("sign_in")}
        </Text>
      </Pressable>

      {/* Register Link */}
      <View style={{ width: "90%", alignItems: "center" }}>
        <Text
          style={{
            marginTop: 25,
            marginHorizontal: 25,
            fontSize: 23,
            textAlign: "center",
          }}
        >
          {t("no_account")}{" "}
          <Text style={{ color: "blue" }} onPress={handleRegister}>
            {t("register_here")}
          </Text>
        </Text>
      </View>

      {/* Loading Indicator */}
    </LinearGradient>
  );
}
