import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView, // Importa SafeAreaView
  StyleSheet, // Importa StyleSheet para una mejor organización
  Platform, // Importa Platform para ajustes específicos si fueran necesarios
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useTranslation } from "react-i18next";
import i18n from "./locales/i18n";
import Toast from "react-native-toast-message";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const flag =
    i18n.language === "es"
      ? require("../assets/es.png")
      : require("../assets/en.png");

  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) {
      // Use Error Toast for validation
      Toast.show({
        type: "error",
        text1: t("error_title"), // e.g., "Oh snap!"
        text2: t("please_enter_credentials"),
        visibilityTime: 3000, // Optional: duration in ms
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        // Use Error Toast for email verification
        Toast.show({
          type: "error",
          text1: t("error_title"),
          text2: t("email_not_verified"),
          visibilityTime: 4000,
        });
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "employees", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role;

        // Show Success Toast just before navigating
        Toast.show({
          type: "success",
          text1: t("success_title"), // e.g., "Well done!"
          text2: t("login_successful"),
          visibilityTime: 2000, // Shorter duration as navigation follows
        });

        if (userRole === "admin") {
          router.replace("/admin/home");
        } else if (userRole === "coordinator") {
          router.replace("/coordinator/home");
        } else {
          router.replace("/employee/home");
        }
      } else {
        Toast.show({
          type: "error",
          text1: t("error_title"),
          text2: t("user_not_found"),
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      let errorMessage = t("login_failed");
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential"
      ) {
        errorMessage = t("invalid_credentials");
      } else if (error.code === "auth/wrong-password") {
        errorMessage = t("invalid_credentials"); // Corrected: also invalid credentials
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = t("too_many_attempts");
      } else if (error.code === "auth/invalid-email") {
        errorMessage = t("invalid_email_format");
      }

      // Remove or comment out this line to hide logs from the console:
      // console.error("Login Error:", error.code, error.message);

      // The Toast will still show the user-friendly message in the app:
      Toast.show({
        type: "error",
        text1: t("error_title"),
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
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
    // 1. Make LinearGradient the outermost container
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.fullScreenGradient} // Use a style that ensures it fills the screen
    >
      {/* 2. Place SafeAreaView INSIDE the gradient */}
      <SafeAreaView style={styles.safeArea}>
        {/* Nuevo contenedor para encabezado */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={handleLanguageChange}
            style={styles.languageSelector}
          >
            <Image
              source={flag}
              style={styles.flagImage}
              resizeMode="contain"
            />
            <Text style={styles.languageText}>{t("change_language")}</Text>
          </TouchableOpacity>
        </View>

        {/* Contenedor principal del contenido */}
        <View style={styles.contentContainer}>
          {/* Welcome Text */}
          <Text style={styles.welcomeText}>{t("welcome_back")}</Text>

          {/* Logo */}
          <Image source={require("../assets/icon.png")} style={styles.logo} />

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder={t("enter_email")}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
              />
              {email.length > 0 && (
                <TouchableOpacity
                  onPress={() => setEmail("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder={t("password")}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
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
              style={styles.recoverPasswordButton}
            >
              <Text style={styles.recoverPasswordText}>
                {t("recover_password")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.signInButtonBase,
              loading && styles.signInButtonLoading,
              pressed && !loading && styles.signInButtonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.spinner}
              />
            ) : null}
            <Text style={styles.signInButtonText}>
              {loading ? t("signing_in") : t("sign_in")}
            </Text>
          </Pressable>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              {t("no_account")}{" "}
              <Text style={styles.registerLink} onPress={handleRegister}>
                {t("register_here")}
              </Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Define los estilos usando StyleSheet
const styles = StyleSheet.create({
  // New style for the gradient to ensure it covers the whole screen

  fullScreenGradient: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  headerContainer: {
    /* ... */ width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : 20,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 15,
  },
  flagImage: { width: 28, height: 28, borderRadius: 14 },
  languageText: { marginLeft: 8, fontSize: 16, color: "#333" },
  contentContainer: {
    flex: 1,
    width: "90%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#444B59",
    textAlign: "center",
  },
  logo: { width: 150, height: 150, marginBottom: 30, resizeMode: "contain" },
  inputContainer: { width: "100%", marginBottom: 15 },
  inputWrapper: { position: "relative", width: "100%", marginBottom: 15 },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    backgroundColor: "white",
    paddingRight: 50,
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: 0,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    top: 0,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  recoverPasswordButton: {
    alignSelf: "flex-end",
    marginTop: -5,
    marginBottom: 10,
  },
  recoverPasswordText: { color: "gray", fontSize: 16 },
  signInButtonBase: {
    width: "100%",
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  signInButtonLoading: { backgroundColor: "#a0a0a0" },
  signInButtonPressed: { opacity: 0.8 },
  spinner: { marginRight: 10 },
  signInButtonText: { color: "#fff", fontSize: 19, fontWeight: "bold" },
  registerContainer: { alignItems: "center", marginTop: 40 },
  registerText: {
    fontSize: 18,
    textAlign: "center",
    color: "#444B59",
    lineHeight: 24,
  },
  registerLink: { color: "#006892", fontWeight: "bold" },
});
