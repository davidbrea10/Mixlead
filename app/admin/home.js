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
import Toast from "react-native-toast-message";

export default function Home() {
  const router = useRouter();

  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await signOut(auth); // Cierra sesión en Firebase
      // Optionally show a success toast before replacing
      Toast.show({
        type: "success", // Or 'success'
        text1: t("adminHome.logoutSuccessTitle"), // Add translation
        text2: t("adminHome.logoutSuccessMessage"), // Add translation
        visibilityTime: 1500,
      });
      // Add a small delay so user sees the toast before screen changes
      // eslint-disable-next-line no-undef
      setTimeout(() => {
        router.replace("/"); // Redirige al login
      }, 500);
    } catch (error) {
      // Replace alert with error toast
      console.error("Logout Error:", error); // Log the full error for debugging
      Toast.show({
        type: "error",
        text1: t("adminHome.logoutErrorTitle"), // Add translation
        text2: t("adminHome.logoutErrorMessage"), // Add generic message translation
        // text2: t("adminHome.logoutError") + error.message, // Avoid showing raw error message
        visibilityTime: 3000,
      });
    }
  };

  const handleSettings = () => {
    router.push("/admin/settings");
  };

  const handleCompanies = () => {
    router.push("/admin/companies");
  };

  const handleEmployees = () => {
    router.push("/admin/employees");
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.gradient} // Use StyleSheet
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Apply style from StyleSheet */}
        <Image
          source={require("../../assets/icon.png")}
          style={styles.headerIcon} // Use StyleSheet
        />
        <Text style={styles.headerTitle}>
          {/* Use StyleSheet */}
          {t("adminHome.title")}
        </Text>
        <Pressable onPress={handleLogout}>
          <Image
            source={require("../../assets/logout.png")}
            style={styles.headerIcon} // Use StyleSheet (assuming same size)
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Apply style */}
        <Pressable
          onPress={handleCompanies}
          style={styles.actionButton} // Use StyleSheet
        >
          <Image
            source={require("../../assets/companies.png")}
            style={styles.actionButtonIcon} // Use StyleSheet
          />
          <View style={styles.actionButtonTextContainer}>
            <Text style={styles.actionButtonText}>
              {/* Use StyleSheet */}
              {t("adminHome.companiesButton")}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={handleEmployees}
          style={styles.actionButton} // Use StyleSheet
        >
          <Image
            source={require("../../assets/employees.png")}
            style={styles.actionButtonIcon} // Use StyleSheet
          />
          <View style={styles.actionButtonTextContainer}>
            <Text style={styles.actionButtonText}>
              {/* Use StyleSheet */}
              {t("adminHome.employeesButton")}
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
      ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
      android: 40, // Base padding on Android (adjust value as needed)
    }),
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16, // Keep horizontal padding consistent
    paddingBottom: 16, // Add bottom padding for balance
    borderBottomStartRadius: 40,
    // Consider rounding both bottom corners for symmetry:
    borderBottomEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 }, // Slightly softer shadow
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
    letterSpacing: 1.5, // Adjusted letter spacing
    textShadowColor: "rgba(0, 0, 0, 0.5)", // Slightly softer shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    // Allow title to take up available space and center text within it
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10, // Add space between icons and title edges
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: "5%", // Add horizontal padding to the content area
  },
  actionButton: {
    width: "90%", // Relative width
    minHeight: 76, // Use minHeight to allow content to expand if needed
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(4, 4, 4, 0.6)",
    borderRadius: 50,
    borderColor: "white",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 }, // Adjusted shadow
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 15, // Adjusted elevation
    paddingHorizontal: 20, // Padding inside the button
    paddingVertical: 10, // Vertical padding inside button
    marginBottom: 50, // Increased spacing between buttons
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
    fontWeight: "500", // Medium weight
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#006892",
    paddingVertical: 16, // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
    alignItems: "flex-end", // Align icon to the right
    borderTopEndRadius: 40,
    borderTopStartRadius: 40, // Round both top corners
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 }, // Adjusted shadow
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  footerIcon: {
    width: 50,
    height: 50,
  },
});
