import { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator, // 1. Import ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import i18n from "../locales/i18n";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

export default function PasswordResetScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false); // 2. Add loading state
  const { t } = useTranslation();
  const auth = getAuth();

  const handleLanguageChange = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  const flag =
    i18n.language === "es"
      ? require("../../assets/es.png")
      : require("../../assets/en.png");

  const handlePasswordReset = async () => {
    if (!email) {
      Toast.show({
        type: "error",
        text1: t("passwordReset.errorTitle"),
        text2: t("passwordReset.emptyEmail"),
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true); // 3. Set loading true
    try {
      await sendPasswordResetEmail(auth, email);
      Toast.show({
        type: "success",
        text1: t("passwordReset.successTitle"),
        text2: t("passwordReset.successMessage"),
        visibilityTime: 4000,
      });
      // Optional: Navigate back after success (consider if user needs to see success message first)
      // router.back();
    } catch (error) {
      let errorMessage = error.message;
      if (error.code === "auth/invalid-email") {
        errorMessage = t(
          "passwordReset.invalidEmailError",
          "Invalid email format.",
        );
      } else if (error.code === "auth/user-not-found") {
        errorMessage = t(
          "passwordReset.userNotFoundError",
          "No user found with this email.",
        );
      } else {
        errorMessage = t(
          "passwordReset.genericError",
          "Could not send reset email. Please try again.",
        );
        console.error("Password Reset Error:", error.code, error.message);
      }

      Toast.show({
        type: "error",
        text1: t("passwordReset.errorTitle"),
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false); // 4. Set loading false in finally block
    }
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          {/* Header content... */}
          <View style={styles.headerIconsContainer}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Ionicons name="arrow-back" size={28} color="black" />
            </TouchableOpacity>
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
          <Text style={styles.headerTitle}>{t("passwordReset.title")}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.instructions}>
            {t("passwordReset.instructions")}
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t("passwordReset.emailPlaceholder")}
              placeholderTextColor={"gray"}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            {email.length > 0 && (
              <TouchableOpacity
                onPress={() => setEmail("")}
                style={styles.clearIcon}
              >
                <Ionicons name="close-circle" size={24} color="gray" />
              </TouchableOpacity>
            )}
          </View>
          {/* 5. Modify Pressable */}
          <Pressable
            onPress={handlePasswordReset}
            style={({ pressed }) => [
              // Add pressed state feedback
              styles.button,
              loading && styles.buttonLoading, // Style when loading
              pressed && !loading && styles.buttonPressed, // Style when pressed (optional)
            ]}
            disabled={loading} // Disable when loading
          >
            {/* 6. Conditionally render ActivityIndicator */}
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.spinner} // Add margin for spinner
              />
            ) : null}
            {/* 7. Conditionally change Text */}
            <Text style={styles.buttonText}>
              {
                loading
                  ? t("passwordReset.sendingButton") // Text when loading
                  : t("passwordReset.sendButton") // Text when not loading
              }
            </Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

// Use StyleSheet for better organization and performance
// Use StyleSheet for better organization and performance
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  header: {
    backgroundColor: "#FF9300",
    paddingTop: Platform.OS === "android" ? 40 : 60, // Base padding for the whole header
    paddingBottom: 30, // Bottom padding remains the same
    paddingHorizontal: 16,
    borderBottomStartRadius: 40,
    borderBottomEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    minHeight: 180, // Keep minimum height
    justifyContent: "flex-end", // Keep aligning title towards bottom padding
  },
  headerIconsContainer: {
    position: "absolute",
    top: Platform.OS === "android" ? 20 : 55, // Position icons below status bar
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerButton: { padding: 5 },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  flagImage: { width: 28, height: 28, borderRadius: 14 },
  languageText: { marginLeft: 8, fontSize: 16, color: "#333" },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    color: "#000000",
    // Add platform-specific padding OR margin top here
    // Option 1: Using paddingTop (adds space within the text element's box)
    paddingTop: Platform.select({
      ios: 40, // Add extra padding above the text on iOS
      android: 0, // No extra padding needed on Android (or a smaller value if desired)
    }),
    // Option 2: Using marginTop (pushes the whole text element down)
    // marginTop: Platform.select({
    //     ios: 15,     // Add extra margin above the text on iOS
    //     android: 0   // No extra margin needed on Android
    // }),
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  instructions: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
    marginHorizontal: 10,
    color: "#444B59",
    lineHeight: 24,
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    backgroundColor: "white",
    paddingRight: 50,
  },
  clearIcon: {
    position: "absolute",
    right: 10,
    top: 0,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  button: {
    width: "100%",
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    flexDirection: "row",
  },
  buttonLoading: {
    backgroundColor: "#a0a0a0",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  spinner: {
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "bold",
  },
});
