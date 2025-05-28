import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet, // Import StyleSheet
  Platform, // Import Platform
  ScrollView, // Import ScrollView if content might overflow on smaller screens
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { auth } from "../../firebase/config"; // Importa la configuración de Firebase
import { signOut } from "firebase/auth";
import { useTranslation } from "react-i18next"; // Import i18n hook
import Toast from "react-native-toast-message"; // Import Toast
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  collectionGroup,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function Home() {
  const { t } = useTranslation(); // Initialize translation hook
  const router = useRouter();

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
  const [warningMessages, setWarningMessages] = useState([]);

  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);

  const handleLogout = () => {
    setIsLogoutModalVisible(true); // <-- Solo abre el modal
  };

  const performLogout = async () => {
    setIsLogoutModalVisible(false); // Cierra el modal primero
    try {
      await signOut(auth);
      Toast.show({
        type: "success",
        text1: t("adminHome.logoutSuccessTitle", "Sesión Cerrada"),
        text2: t(
          "adminHome.logoutSuccessMessage",
          "Has cerrado sesión correctamente.",
        ),
        visibilityTime: 1500,
        position: "bottom", // Añadir posición si se prefiere
      });
      // eslint-disable-next-line no-undef
      setTimeout(() => {
        router.replace("/");
      }, 500); // Delay para que el toast sea visible
    } catch (error) {
      console.error("Logout Error:", error);
      Toast.show({
        type: "error",
        text1: t("adminHome.logoutErrorTitle", "Error al Salir"),
        text2: t(
          "adminHome.logoutErrorMessage",
          "No se pudo cerrar la sesión. Inténtalo de nuevo.",
        ),
        visibilityTime: 3000,
        position: "bottom", // Añadir posición si se prefiere
      });
    }
  };

  useEffect(() => {
    const checkDoseLimits = async () => {
      const user = auth.currentUser;
      if (!user) return; // No hacer nada si no hay usuario

      // --- Definir límites y umbral de aviso (80%) ---
      const limits = {
        year: 20, // mSv
        month: 1.67, // mSv
        day: 80, // μSv
      };
      const WARNING_THRESHOLD = 0.8; // 80%

      try {
        // 1. Encontrar el companyId del empleado
        const employeesRef = collectionGroup(db, "employees");
        const q = query(employeesRef, where("email", "==", user.email));
        const employeeSnapshot = await getDocs(q);

        if (employeeSnapshot.empty) {
          console.log("Documento de empleado no encontrado.");
          return;
        }
        const employeeData = employeeSnapshot.docs[0].data();
        const companyId = employeeData.companyId;

        if (!companyId) {
          console.log("El empleado no tiene companyId.");
          return;
        }

        // 2. Obtener dosis del año, mes y día actual
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const dosesRef = collection(
          db,
          "companies",
          companyId,
          "employees",
          user.uid,
          "doses",
        );

        const yearQuery = query(dosesRef, where("year", "==", currentYear));
        const yearDosesSnap = await getDocs(yearQuery);
        let totalYearlyDose = 0;
        yearDosesSnap.forEach((doc) => {
          totalYearlyDose += doc.data().dose;
        });

        // Filtramos en el cliente para el mes y día para ahorrar lecturas
        let totalMonthlyDose = 0;
        let totalDailyDose = 0;
        yearDosesSnap.docs.forEach((doc) => {
          const doseData = doc.data();
          if (doseData.month === currentMonth) {
            totalMonthlyDose += doseData.dose;
            if (doseData.day === currentDay) {
              totalDailyDose += doseData.dose;
            }
          }
        });

        // 3. Comprobar límites y generar mensajes
        const messages = [];

        // Comprobación Anual
        if (totalYearlyDose / 1000 >= limits.year * WARNING_THRESHOLD) {
          messages.push(
            t("home.doseWarning.yearlyMessage", {
              // Clave de traducción
              currentDose: (totalYearlyDose / 1000).toFixed(3), // Variable para el valor actual
              limitDose: limits.year, // Variable para el límite
            }),
          );
        }

        // Comprobación Mensual
        if (totalMonthlyDose / 1000 >= limits.month * WARNING_THRESHOLD) {
          messages.push(
            t("home.doseWarning.monthlyMessage", {
              // Clave de traducción
              currentDose: (totalMonthlyDose / 1000).toFixed(3),
              limitDose: limits.month,
            }),
          );
        }

        // Comprobación Diaria
        if (totalDailyDose >= limits.day * WARNING_THRESHOLD) {
          messages.push(
            t("home.doseWarning.dailyMessage", {
              // Clave de traducción
              currentDose: totalDailyDose.toFixed(3),
              limitDose: limits.day,
            }),
          );
        }

        // 4. Mostrar el modal si hay advertencias
        if (messages.length > 0) {
          setWarningMessages(messages);
          setIsWarningModalVisible(true);
        }
      } catch (error) {
        console.error("Error al verificar los límites de dosis:", error);
        Toast.show({
          type: "error",
          text1: "Error de Dosis",
          text2: "No se pudieron verificar los límites de dosis.",
        });
      }
    };

    checkDoseLimits();
  }, []);

  const handleMyAgenda = () => router.push("/employee/myAgenda");
  const handleCalculation = () => router.push("/employee/calculation");
  const handleSettings = () => router.push("/employee/settings");
  const handleTimer = () => router.push("/employee/timer");
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
          <Pressable onPress={handleCalculation} style={[styles.actionButton]}>
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
          <Pressable
            onPress={handleTimer} // Add onPress handler
            style={[styles.actionButton, styles.lastActionButton]} // Use StyleSheet, remove bottom margin
          >
            <Image
              source={require("../../assets/temporizador.png")}
              style={styles.actionButtonIcon} // Use StyleSheet
            />
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonText}>
                {/* Use StyleSheet */}
                {t("timer.screen_title")}
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

      {/* --- MODAL DE ADVERTENCIA DE LÍMITES DE DOSIS --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isWarningModalVisible}
        onRequestClose={() => setIsWarningModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.warningModalContent}>
            {/* --- BOTÓN DE AYUDA EN LA ESQUINA --- */}
            <Pressable
              style={styles.helpButton}
              onPress={() => {
                setIsWarningModalVisible(false); // <-- 1. Cierra el modal actual
                setIsHelpModalVisible(true); // <-- 2. Abre el nuevo modal
              }}
            >
              <Ionicons name="help-circle-outline" size={32} color="#006892" />
            </Pressable>
            {/* -------------------------------------- */}

            <Image
              source={require("../../assets/alert.png")}
              style={styles.warningIcon}
            />
            <Text style={styles.warningModalTitle}>
              {t("home.doseWarning.title")}
            </Text>
            {warningMessages.map((msg, index) => (
              <Text key={index} style={styles.warningModalMessage}>
                {msg}
              </Text>
            ))}
            <Pressable
              style={styles.warningModalCloseButton}
              onPress={() => setIsWarningModalVisible(false)}
            >
              <Text style={styles.warningModalCloseButtonText}>
                {t("home.doseWarning.close")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE INFORMACIÓN DE AYUDA --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isHelpModalVisible}
        onRequestClose={() => setIsHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.helpModalContent}>
            <Text style={styles.helpModalTitle}>
              {t("home.helpModal.title")}
            </Text>

            <View style={styles.helpModalList}>
              <Text style={styles.helpModalListItem}>
                {t("home.helpModal.fiveYearLimit")}
              </Text>
              <Text style={styles.helpModalListItem}>
                {t("home.helpModal.yearlyLimit")}
              </Text>
              <Text style={styles.helpModalListItem}>
                {t("home.helpModal.monthlyLimit")}
              </Text>
              <Text style={styles.helpModalListItem}>
                {t("home.helpModal.dailyLimit")}
              </Text>
              <Text style={styles.helpModalListItem}>
                {t("home.helpModal.hourlyLimit")}
              </Text>
            </View>

            <Pressable
              style={styles.warningModalCloseButton} // Reutilizamos el estilo del botón
              onPress={() => {
                setIsHelpModalVisible(false); // <-- 1. Cierra el modal de ayuda
                setIsWarningModalVisible(true); // <-- 2. Vuelve a abrir el de advertencia
              }}
            >
              <Text style={styles.warningModalCloseButtonText}>
                {t("home.helpModal.closeButton")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE CONFIRMACIÓN DE LOGOUT --- */}
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
    // flex: 1, // Removed as ScrollView handles flex
    // justifyContent: "center", // Handled by ScrollView container
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

  warningModalContent: {
    width: "85%",
    backgroundColor: "#fff", // Fondo blanco para la alerta
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  warningIcon: {
    width: isTablet ? 80 : 60,
    height: isTablet ? 80 : 60,
    marginBottom: 15,
  },
  warningModalTitle: {
    fontSize: isTablet ? 26 : 21,
    fontWeight: "bold",
    color: "#D32F2F", // Color rojo para el título
    marginBottom: 15,
    textAlign: "center",
  },
  warningModalMessage: {
    fontSize: isTablet ? 20 : 16,
    color: "#333", // Texto oscuro para legibilidad
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 24,
  },
  warningModalCloseButton: {
    backgroundColor: "#007AFF", // Un color primario para el botón de cerrar
    borderRadius: 10,
    paddingVertical: isTablet ? 16 : 12,
    paddingHorizontal: 40,
    marginTop: 20,
  },
  warningModalCloseButtonText: {
    color: "#FFFFFF",
    fontSize: isTablet ? 18 : 16,
    fontWeight: "600",
  },

  helpButton: {
    position: "absolute", // Clave para posicionarlo en la esquina
    top: 10,
    right: 15,
    zIndex: 10, // Para asegurar que esté por encima de otros elementos
  },
  helpModalContent: {
    width: "90%",
    backgroundColor: "#F0F4F8", // Un fondo claro para la información
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
  },
  helpModalTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: "bold",
    color: "#005A85", // Color principal
    marginBottom: 20,
    textAlign: "center",
  },
  helpModalList: {
    alignSelf: "flex-start", // Alinea el contenedor de la lista a la izquierda
    marginBottom: 25,
  },
  helpModalListItem: {
    fontSize: isTablet ? 18 : 15,
    color: "#333",
    marginBottom: 12,
    lineHeight: 22,
  },
});
