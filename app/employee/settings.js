import { View, Text, Pressable, Image, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next"; // Importar el hook de traducción

export default function Settings() {
  const router = useRouter();
  const { t } = useTranslation(); // Inicializar traducción

  const handleBack = () => {
    router.back(); // Vuelve a la pantalla anterior
  };

  const handleHome = () => {
    router.replace("/employee/home"); // Vuelve al Home reemplazando el Settings
  };

  const handleProfile = () => {
    router.push("/employee/settings-profile"); // Redirige al Profile
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: "#FF9300",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          borderBottomStartRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10,
          paddingTop: Platform.select({
            // Apply platform-specific padding
            ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
            android: 40, // Base padding on Android (adjust value as needed)
          }),
        }}
      >
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "white",
            letterSpacing: 2,
            textShadowColor: "black",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 1,
          }}
        >
          {t("adminSettings.title")}
        </Text>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, padding: 20 }}>
        {/* Profile Option */}
        <Pressable
          onPress={handleProfile}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 20,
          }}
        >
          <Image
            source={require("../../assets/profile.png")}
            style={{ width: 40, height: 40, marginRight: 10 }}
          />
          <Text style={{ fontSize: 20, fontWeight: "500", marginLeft: 20 }}>
            {t("adminSettings.profile")}
          </Text>
        </Pressable>
        <View style={{ height: 1, backgroundColor: "black" }} />

        {/* Help & FAQ Option */}
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 20,
          }}
        >
          <Image
            source={require("../../assets/help.png")}
            style={{ width: 40, height: 40, marginRight: 10 }}
          />
          <Text style={{ fontSize: 20, fontWeight: "500", marginLeft: 20 }}>
            {t("adminSettings.helpFaq")}
          </Text>
        </Pressable>
        <View style={{ height: 1, backgroundColor: "black" }} />
      </View>

      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
          padding: 40,
          alignItems: "flex-end",
          borderTopEndRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10,
        }}
      ></View>
    </LinearGradient>
  );
}
