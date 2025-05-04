import {
    View,
    Text,
    Pressable,
    Image,
    StyleSheet, // Import StyleSheet
    Platform, // Import Platform
    Modal,
  } from "react-native";
  import { LinearGradient } from "expo-linear-gradient";
  import { useNavigation } from '@react-navigation/native';
  import { auth } from "../../firebase/config"; // Importa la configuración de Firebase
  import { signOut } from "firebase/auth";
  import { useTranslation } from "react-i18next";
  import Toast from "react-native-toast-message";
  import { useState } from "react";
  
  export default function Home() {
    const navigation = useNavigation();
  
    const { t } = useTranslation();
    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  
    const handleLogout = () => {
      setIsLogoutModalVisible(true); // <-- Solo abre el modal
    };
  
    const performLogout = async () => {
        setIsLogoutModalVisible(false); // Cierra el modal primero
        try {
          await signOut(auth); // Cierra sesión en Firebase
      
          // Muestra un Toast de éxito DESPUÉS de que signOut sea exitoso
          Toast.show({
            type: "success",
            text1: t("adminHome.logoutSuccessTitle"),
            text2: t("adminHome.logoutSuccessMessage"),
            visibilityTime: 1500, // Duración suficiente para ser visible
            position: "bottom",
          });
      
          // >>>>> ELIMINA ESTA SECCIÓN <<<<<
          // // Add a small delay so user sees the toast before screen changes
          // // eslint-disable-next-line no-undef
          // setTimeout(() => {
          //   router.replace("/"); // <--- QUITA ESTA LÍNEA
          // }, 500);
          // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
      
          // ¡No hay navegación explícita aquí!
          // La lógica en App.js detectará que el usuario ha salido y cambiará al AuthStack.
      
        } catch (error) {
          console.error("Logout Error:", error);
          // Manejo de errores con Toast
          Toast.show({
            type: "error",
            text1: t("adminHome.logoutErrorTitle"),
            text2: t("adminHome.logoutErrorMessage"), // O un mensaje genérico del error si lo manejas
            visibilityTime: 3000,
            position: "bottom",
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
      marginBottom: 20,
      paddingTop: Platform.select({
        // Apply platform-specific padding
        ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
        android: 40, // Base padding on Android (adjust value as needed)
      }),
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
      paddingVertical: 16,
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
      width: 50,
      height: 50,
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
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFFFFF", // Texto blanco
      marginBottom: 15,
      textAlign: "center",
    },
    modalMessage: {
      fontSize: 16,
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
      paddingVertical: 12,
      // paddingHorizontal: 20, // Quita o ajusta si usas width
      // flex: 1, // <-- QUITA ESTA LÍNEA
      // marginHorizontal: 8, // Quita o ajusta si usas space-around/between
      width: "45%", // <-- AÑADE UN ANCHO (ej. 45% para dejar espacio entre ellos)
      // O un valor fijo como 120 si prefieres
      alignItems: "center", // Mantiene el texto centrado horizontalmente DENTRO del botón
      justifyContent: "center", // <-- AÑADE ESTO para centrar verticalmente si el texto se va a 2 líneas
      minHeight: 45, // Opcional: asegura una altura mínima si el texto es corto
    },
    modalCancelButton: {
      backgroundColor: "#555555",
    },
    modalConfirmButton: {
      backgroundColor: "#C32427",
    },
    modalButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center", // <-- AÑADE ESTO para asegurar centrado si hay 2 líneas
    },
    modalConfirmButtonText: {
      color: "#FFFFFF", // Puedes mantenerlo blanco o cambiarlo si es necesario
    },
  });
  