import { Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

export default function EmailConfirmationScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBackToHome = () => {
    router.replace("/"); // Redirect to the login page
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        {t("emailConfirmation.title")}
      </Text>
      <Text
        style={{
          fontSize: 16,
          textAlign: "center",
          marginBottom: 40,
          marginHorizontal: 40,
        }}
      >
        {t("emailConfirmation.message")}
      </Text>
      <Pressable onPress={handleBackToHome} style={styles.button}>
        <Text style={{ color: "#fff", fontSize: 18 }}>
          {t("emailConfirmation.backToLogin")}
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = {
  button: {
    width: 200,
    height: 50,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
};
