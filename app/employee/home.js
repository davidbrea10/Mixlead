import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet, // Import StyleSheet
  Platform, // Import Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { auth } from "../../firebase/config"; // Importa la configuración de Firebase
import { signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // Import Toast

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth); // Cierra sesión en Firebase
      // Optional: Show success toast
      Toast.show({
        type: "success",
        text1: t("adminHome.logoutSuccessTitle"), // Use generic or add specific employee key
        text2: t("adminHome.logoutSuccessMessage"),
        visibilityTime: 1500,
      });
      // Add delay before navigating
      setTimeout(() => {
        router.replace("/"); // Redirige al login
      }, 500);
    } catch (error) {
      // Replace alert with error toast
      console.error("Logout Error:", error);
      Toast.show({
        type: "error",
        text1: t("adminHome.logoutErrorTitle"), // Use generic or add specific employee key
        text2: t("adminHome.logoutErrorMessage"),
        visibilityTime: 3000,
      });
    }
  };

  const handleMyAgenda = () => router.push("/employee/myAgenda");
  const handleCalculation = () => router.push("/employee/calculation");
  const handleSettings = () => router.push("/employee/settings");

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.gradient} // Use StyleSheet
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Apply style */}
        <Image
          source={require("../../assets/icon.png")}
          style={styles.headerIcon} // Use StyleSheet
        />
        <Text style={styles.headerTitle}>
          {/* Use StyleSheet */}
          {/* Consider a specific title key like employeeHome.title */}
          {t("adminHome.title")}
        </Text>
        <Pressable onPress={handleLogout}>
          <Image
            source={require("../../assets/logout.png")}
            style={styles.headerIcon} // Use StyleSheet
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Apply style */}
        <Pressable
          onPress={handleMyAgenda} // Add onPress handler
          style={styles.actionButton} // Use StyleSheet
        >
          <Image
            source={require("../../assets/myAgenda.png")}
            style={styles.actionButtonIcon} // Use StyleSheet
          />
          <View style={styles.actionButtonTextContainer}>
            <Text style={styles.actionButtonText}>
              {/* Use StyleSheet */}
              {/* Ensure this key exists and is correct */}
              {t("home.header.title")}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={handleCalculation} // Add onPress handler
          style={[styles.actionButton, styles.lastActionButton]} // Use StyleSheet, remove bottom margin
        >
          <Image
            source={require("../../assets/calculation.png")}
            style={styles.actionButtonIcon} // Use StyleSheet
          />
          <View style={styles.actionButtonTextContainer}>
            <Text style={styles.actionButtonText}>
              {/* Use StyleSheet */}
              {t("radiographyCalculator.buttonTitle")}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Apply style */}
        <Pressable onPress={handleSettings}>
          <Image
            source={require("../../assets/gear-icon.png")}
            style={styles.footerIcon} // Use StyleSheet
          />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// Add StyleSheet below the component
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.select({
      // Apply platform-specific padding
      ios: 60, // More padding on iOS
      android: 40, // Base padding on Android
    }),
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomStartRadius: 40,
    borderBottomEndRadius: 40, // Round both bottom corners
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  headerIcon: {
    width: 50,
    height: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  mainContent: {
    flex: 1, // Take remaining space
    justifyContent: "center", // Center buttons vertically
    alignItems: "center", // Center buttons horizontally
    paddingHorizontal: "5%", // Add horizontal padding
  },
  actionButton: {
    width: "90%", // Relative width
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(4, 4, 4, 0.6)",
    borderRadius: 50,
    borderColor: "white",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 68, // Maintain specific spacing from original code
  },
  lastActionButton: {
    marginBottom: 0, // Remove margin from the last button
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    marginRight: 15, // Space between icon and text
  },
  actionButtonTextContainer: {
    flex: 1, // Allow text container to take remaining space
  },
  actionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#006892",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "flex-end", // Align icon to the right
    borderTopEndRadius: 40,
    borderTopStartRadius: 40, // Round both top corners
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  footerIcon: {
    width: 50,
    height: 50,
  },
});
