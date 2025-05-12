import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

export default function Graph() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image
              source={require("../../assets/go-back.png")}
              style={styles.icon}
            />
          </Pressable>
          <Text style={styles.title}>{t("tables.header.title")}</Text>
          <Pressable onPress={() => router.replace("/coordinator/home")}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </View>

        <View style={styles.mainContainer}></View>

        {/* Footer */}
        <View style={styles.footer}></View>
      </View>
    </LinearGradient>
  );
}

// --- Styles --- (Keep the existing styles, maybe adjust padding/margins if needed)
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
    textAlign: "center", // Center text
  },

  mainContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#e0e0e0",
  },

  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  header: {
    paddingTop: Platform.select({
      ios: 60,
      android: 40,
    }),
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomStartRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  icon: { width: 45, height: 45 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginHorizontal: 10,
    flexShrink: 1, // Allow title to shrink if needed
  },

  footer: {
    backgroundColor: "#006892",
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "flex-end",
    borderTopEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
    minHeight: 50, // Ensure footer has some height
  },
});
