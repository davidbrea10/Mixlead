import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet, // Import StyleSheet
  Platform, // Import Platform
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { auth } from "../../firebase/config"; // Importa la configuración de Firebase
import { signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { useState } from "react";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function Home() {
  const router = useRouter();

  const { t } = useTranslation();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    setIsLogoutModalVisible(true); // <-- Solo abre el modal
  };

  const performLogout = async () => {
    setIsLogoutModalVisible(false); // Cierra el modal primero
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

      <Modal
        animationType="fade" // O 'slide'
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={() => setIsLogoutModalVisible(false)} // Para el botón atrás de Android
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentContainer}>
            <Text style={styles.modalTitle}>
              {t("adminHome.logoutConfirmTitle")}
            </Text>
            <Text style={styles.modalMessage}>
              {t("adminHome.logoutConfirmMessage")}
            </Text>
            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setIsLogoutModalVisible(false)} // Solo cierra el modal
              >
                <Text style={styles.modalButtonText}>
                  {t("adminHome.logoutCancel")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={performLogout} // Llama a la función que hace el logout
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalConfirmButtonText,
                  ]}
                >
                  {t("adminHome.logoutConfirm")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// Add StyleSheet below the component
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    backgroundColor: "#FF9300",
    flexDirection: "row",
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
  },
  headerIcon: {
    width: isTablet ? 70 : 50,
    height: isTablet ? 70 : 50,
  },
  headerTitle: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  scrollContentContainer: {
    // Style for ScrollView content
    flexGrow: 1, // Allows content to take height and center if less than screen
    justifyContent: "center", // Center content vertically if less than screen height
    paddingBottom: 20, // Add some padding at the bottom inside scrollview
    paddingTop: 20, // Add some padding at the top inside scrollview
  },
  mainContent: {
    flex: 1, // Removed as ScrollView handles flex
    justifyContent: "center", // Handled by ScrollView container
    alignItems: "center",
    paddingHorizontal: "5%",
  },
  actionButton: {
    width: "90%",
    minHeight: isTablet ? 100 : 76,
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
    paddingHorizontal: isTablet ? 30 : 20,
    paddingVertical: isTablet ? 18 : 10,
    marginBottom: isTablet ? 40 : 30,
  },
  lastActionButton: {
    marginBottom: 0, // Remove margin from the last button if inside ScrollView
  },
  actionButtonIcon: {
    width: isTablet ? 60 : 40,
    height: isTablet ? 60 : 40,
    marginRight: isTablet ? 25 : 15,
  },
  actionButtonTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    color: "white",
    fontSize: isTablet ? 22 : 18,
    fontWeight: "500",
    textAlign: "center",
  },
  footer: {
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 16 : 40,
    paddingHorizontal: 20,
    backgroundColor: "#006892",
    alignItems: "flex-end",
    borderTopEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  footerIcon: {
    width: isTablet ? 70 : 50,
    height: isTablet ? 70 : 50,
  },

  // --- Estilos del Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Fondo semitransparente oscuro
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentContainer: {
    width: "85%", // Ancho del modal
    backgroundColor: "#2D2D2D", // Fondo oscuro para el contenido del modal (ajusta si prefieres blanco)
    borderRadius: 15, // Bordes redondeados
    padding: 25, // Padding interno
    alignItems: "center",
    // Sombra sutil (opcional)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: isTablet ? 26 : 20,
    fontWeight: "bold",
    color: "#FFFFFF", // Texto blanco
    marginBottom: 15,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: isTablet ? 20 : 16,
    color: "#E0E0E0", // Texto gris claro
    textAlign: "center",
    marginBottom: 30, // Más espacio antes de los botones
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around", // O 'space-between' si quieres que toquen los bordes
    width: "100%",
  },
  modalButton: {
    borderRadius: 10,
    width: "45%",
    paddingVertical: isTablet ? 16 : 12,
    minHeight: isTablet ? 55 : 45,
    // O un valor fijo como 120 si prefieres
    alignItems: "center", // Mantiene el texto centrado horizontalmente DENTRO del botón
    justifyContent: "center", // <-- AÑADE ESTO para centrar verticalmente si el texto se va a 2 líneas
  },
  modalCancelButton: {
    backgroundColor: "#555555",
  },
  modalConfirmButton: {
    backgroundColor: "#C32427",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: isTablet ? 18 : 16,
    fontWeight: "600",
    textAlign: "center", // <-- AÑADE ESTO para asegurar centrado si hay 2 líneas
  },
  modalConfirmButtonText: {
    color: "#FFFFFF", // Puedes mantenerlo blanco o cambiarlo si es necesario
  },
});
