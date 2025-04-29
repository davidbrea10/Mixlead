import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet, // Import StyleSheet
  Platform, // Import Platform
  ScrollView, // Import ScrollView if content might overflow on smaller screens
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { auth } from "../../firebase/config"; // Importa la configuración de Firebase
import { signOut } from "firebase/auth";
import { useTranslation } from "react-i18next"; // Import i18n hook
import Toast from "react-native-toast-message"; // Import Toast

export default function Home() {
  const { t } = useTranslation(); // Initialize translation hook
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth); // Cierra sesión en Firebase
      // Optional: Show success toast
      Toast.show({
        type: "success", // Or 'success'
        text1: t("adminHome.logoutSuccessTitle"), // Add translation
        text2: t("adminHome.logoutSuccessMessage"), // Add translation
        visibilityTime: 1500,
      });
      // Add a small delay so user sees the toast before screen changes
      setTimeout(() => {
        router.replace("/"); // Redirige al login
      }, 500);
    } catch (error) {
      // Replace alert with error toast
      console.error("Logout Error:", error); // Log the full error
      Toast.show({
        type: "error",
        text1: t("adminHome.logoutErrorTitle"), // Add translation
        text2: t("adminHome.logoutErrorMessage"), // Add translation
        visibilityTime: 3000,
      });
    }
  };

  const handleMyAgenda = () => router.push("/coordinator/myAgenda");
  const handleCalculation = () => router.push("/coordinator/calculation");
  const handleSettings = () => router.push("/coordinator/settings");
  const handleApplications = () => router.push("/coordinator/applications");
  const handleEmployees = () => router.push("/coordinator/myEmployees");
  const handleEmployeeAgenda = () =>
    router.push("/coordinator/employeesAgenda");

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
          {/* Using adminHome.title, consider a specific coordinatorHome.title key */}
          {t("adminHome.title")}
        </Text>
        <Pressable onPress={handleLogout}>
          <Image
            source={require("../../assets/logout.png")}
            style={styles.headerIcon} // Use StyleSheet
          />
        </Pressable>
      </View>

      {/* Use ScrollView if the number of buttons might exceed screen height */}
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Applications Button */}
          <Pressable onPress={handleApplications} style={styles.actionButton}>
            <Image
              source={require("../../assets/applications.png")}
              style={styles.actionButtonIcon}
            />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonText}>
                {t("applications.appTitle")}
              </Text>
            </View>
          </Pressable>

          {/* Employees Button */}
          <Pressable onPress={handleEmployees} style={styles.actionButton}>
            <Image
              source={require("../../assets/employees.png")}
              style={styles.actionButtonIcon}
            />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonText}>
                {t("myEmployees.title")}
              </Text>
            </View>
          </Pressable>

          {/* Employees Agenda Button */}
          <Pressable onPress={handleEmployeeAgenda} style={styles.actionButton}>
            <Image
              source={require("../../assets/employeesAgenda.png")}
              style={styles.actionButtonIcon}
            />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonText}>
                {t("employeesAgenda.header.title")}
              </Text>
            </View>
          </Pressable>

          {/* My Agenda Button */}
          <Pressable onPress={handleMyAgenda} style={styles.actionButton}>
            <Image
              source={require("../../assets/myAgenda.png")}
              style={styles.actionButtonIcon}
            />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonText}>
                {t("home.header.title")}
              </Text>
            </View>
          </Pressable>

          {/* Calculation Button */}
          <Pressable
            onPress={handleCalculation}
            style={[styles.actionButton, styles.lastActionButton]}
          >
            {/* Remove bottom margin for last button */}
            <Image
              source={require("../../assets/calculation.png")}
              style={styles.actionButtonIcon}
            />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonText}>
                {t("radiographyCalculator.buttonTitle")}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

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
  scrollContentContainer: {
    // Style for ScrollView content
    flexGrow: 1, // Allows content to take height and center if less than screen
    justifyContent: "center", // Center content vertically if less than screen height
    paddingBottom: 20, // Add some padding at the bottom inside scrollview
    paddingTop: 20, // Add some padding at the top inside scrollview
  },
  mainContent: {
    // flex: 1, // Removed as ScrollView handles flex
    // justifyContent: "center", // Handled by ScrollView container
    alignItems: "center",
    paddingHorizontal: "5%",
  },
  actionButton: {
    width: "90%",
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
    marginBottom: 30, // Consistent spacing between buttons
  },
  lastActionButton: {
    marginBottom: 0, // Remove margin from the last button if inside ScrollView
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  actionButtonTextContainer: {
    flex: 1,
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
    alignItems: "flex-end",
    borderTopEndRadius: 40,
    borderTopStartRadius: 40,
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
