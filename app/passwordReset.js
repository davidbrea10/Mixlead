import { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  View,
  Alert,
  Image,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import i18n from "./locales/i18n"; // Importa la configuración de i18next
import { useRouter } from "expo-router";

export default function PasswordResetScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const { t } = useTranslation();
  const auth = getAuth();

  const handleLanguageChange = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  const flag =
    i18n.language === "es"
      ? require("../assets/es.png")
      : require("../assets/en.png");

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert(t("passwordReset.errorTitle"), t("passwordReset.emptyEmail"));
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        t("passwordReset.successTitle"),
        t("passwordReset.successMessage"),
      );
    } catch (error) {
      Alert.alert(t("passwordReset.errorTitle"), error.message);
    }
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            backgroundColor: "#FF9300",
            padding: 16,
            borderBottomStartRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          {/* Header with Back and Language Buttons */}
          <View style={styles.headerIcons}>
            {/* Back Button */}
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color="black" />
            </TouchableOpacity>

            {/* Language Selector */}
            <TouchableOpacity
              onPress={handleLanguageChange}
              style={{
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
          </View>

          <Text
            style={{
              marginTop: 20,
              fontSize: 32,
              fontWeight: "bold",
              textAlign: "center",
              paddingTop: 60,
              color: "#000000",
            }}
          >
            {t("passwordReset.title")}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              textAlign: "center",
              marginBottom: 40,
              marginHorizontal: 10,
            }}
          >
            {t("passwordReset.instructions")}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t("passwordReset.emailPlaceholder")}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Pressable onPress={handlePasswordReset} style={styles.button}>
            <Text style={{ color: "#fff", fontSize: 18 }}>
              {t("passwordReset.sendButton")}
            </Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = {
  headerIcons: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },

  label: {
    fontSize: 18,
    marginBottom: 5,
  },

  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },

  input: {
    width: "100%",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 18,
    backgroundColor: "white",
    justifyContent: "center",
  },
  clearIcon: {
    position: "absolute",
    right: 10,
    top: 15,
  },
  button: {
    width: "100%",
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,
  },
};
