import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  collectionGroup,
  where,
  query,
  getDocs,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();

  const [modalVisible, setModalVisible] = useState(false);
  const [dose, setDose] = useState(""); // Dose value from modal input
  const [modalTotalExposures, setModalTotalExposures] = useState(""); // Exposures from modal input

  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");

  const [startTime, setStartTime] = useState(new Date());
  const [formattedStartTime, setFormattedStartTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Inside your Home component, typically after other hooks

  const _fetchActiveUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user authenticated for _fetchActiveUserData.");
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", { defaultValue: "Error" }),
        text2: t("errors.userNotLoggedIn", {
          defaultValue: "User not logged in.",
        }),
        position: "bottom",
      });
      return null;
    }

    try {
      const employeesQueryRef = collectionGroup(db, "employees");
      // Assuming user's role and companyId are stored in a document
      // accessible via their email in an 'employees' collection group.
      const q = query(employeesQueryRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDocSnap = querySnapshot.docs[0];
        const userData = userDocSnap.data();
        const result = { companyId: null, role: null };

        if (userData.companyId) {
          result.companyId = userData.companyId;
        } else {
          console.warn(
            `User (email: ${user.email}) document is missing companyId.`,
          );
        }

        // Assuming the role is stored under a field named 'role'
        if (userData.role) {
          result.role = userData.role;
        } else {
          console.warn(`User (email: ${user.email}) document is missing role.`);
        }

        if (!result.companyId && !result.role) {
          console.warn(
            `User (email: ${user.email}) document is missing both companyId and role.`,
          );
        }
        return result; // Contains { companyId: '...', role: '...' } or with nulls
      } else {
        console.warn(
          `Could not find employee document for email ${user.email}.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", { defaultValue: "Error" }),
          text2: t("errors.userDataNotFound", {
            defaultValue: "User data not found.",
          }), // Ensure this translation key exists
          position: "bottom",
        });
        return null;
      }
    } catch (error) {
      console.error("Error fetching active user data:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", { defaultValue: "Error" }),
        text2: t("errors.fetchActiveUserDataError", {
          defaultValue: "Failed to fetch user data.",
        }), // Ensure this translation key exists
        position: "bottom",
      });
      return null;
    }
  }, [t]); // auth and db are stable module imports. t is from useTranslation.

  const handleBack = () => {
    router.back();
  };

  const handleHome = useCallback(async () => {
    const activeUserData = await _fetchActiveUserData(); // Fetch user data including role

    if (activeUserData && activeUserData.role) {
      const userRole = activeUserData.role.toLowerCase(); // Normalize role for comparison
      if (userRole === "coordinator") {
        router.replace("/coordinator/home");
      } else if (userRole === "employee") {
        router.replace("/employee/home"); // Current behavior if role is employee
      } else {
        // Fallback for unknown roles
        console.warn(
          `Unknown user role: '${activeUserData.role}'. Defaulting to employee home.`,
        );
        Toast.show({
          type: "warning",
          text1: t("warnings.roleUnknownTitle", {
            defaultValue: "Unknown Role",
          }),
          text2: t("warnings.defaultEmployeeNavigationUnknownRole", {
            defaultValue: `Role '${activeUserData.role}' is not recognized. Navigating to default home.`,
          }), // Ensure this translation key exists
          position: "bottom",
        });
        router.replace("/employee/home");
      }
    } else {
      // Fallback if role couldn't be determined (e.g., user not logged in, data missing)
      console.warn(
        "Could not determine user role or user data incomplete. Defaulting to employee home.",
      );
      if (!auth.currentUser) {
        // _fetchActiveUserData would have shown a toast.
      } else if (!activeUserData) {
        // _fetchActiveUserData might have shown a toast.
      } else {
        Toast.show({
          type: "error",
          text1: t("errors.roleFetchErrorTitle", {
            defaultValue: "Role Error",
          }),
          text2: t("errors.defaultEmployeeNavigationRoleError", {
            defaultValue:
              "Failed to determine role. Navigating to default home.",
          }), // Ensure this translation key exists
          position: "bottom",
        });
      }
      router.replace("/employee/home"); // Default navigation
    }
  }, [_fetchActiveUserData, router, t]); // Dependencies for useCallback

  const handleDoseData = () => {
    router.push("/employee/doseData");
  };

  const handleSaveDose = async () => {
    // --- Validaciones de input (sin cambios) ---
    const hours = parseInt(durationHours || "0", 10);
    const minutes = parseInt(durationMinutes || "0", 10);
    const seconds = parseInt(durationSeconds || "0", 10);

    if (
      isNaN(hours) ||
      hours < 0 ||
      isNaN(minutes) ||
      minutes < 0 ||
      minutes > 59 ||
      isNaN(seconds) ||
      seconds < 0 ||
      seconds > 59
    ) {
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("errors.invalidDurationFormat", "Formato HH:MM:SS inválido."),
        position: "bottom",
      });
      return;
    }
    const totalSecondsFromHHMMSS = hours * 3600 + minutes * 60 + seconds;

    if (
      !dose.trim() ||
      isNaN(parseFloat(dose)) ||
      parseFloat(dose) <= 0 ||
      !modalTotalExposures.trim() ||
      isNaN(parseInt(modalTotalExposures, 10)) ||
      parseInt(modalTotalExposures, 10) <= 0 ||
      totalSecondsFromHHMMSS <= 0
    ) {
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("home.alerts.emptyFieldsOrTimeOrDuration"),
        position: "bottom",
      });
      return;
    }
    // --- Fin validaciones de input ---

    const user = auth.currentUser;
    if (!user) {
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("home.alerts.userNotAuthenticated"),
        position: "bottom",
      });
      return;
    }

    // Considera un estado de carga específico para el guardado, ej: setIsSaving(true)
    let userCompanyId = null;

    try {
      // PASO 1: Obtener el companyId del empleado actual
      console.log(
        `Workspaceing employee data for user ${user.uid} to get companyId...`,
      );
      const employeesGroupRef = collectionGroup(db, "employees");
      const employeeQuery = query(
        employeesGroupRef,
        where("email", "==", user.email),
      );
      const employeeQuerySnapshot = await getDocs(employeeQuery);

      if (employeeQuerySnapshot.empty) {
        console.error(
          `Could not find employee document for email ${user.email} to retrieve companyId.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.userDataNotFoundForDose"),
          position: "bottom",
        });
        // setIsSaving(false);
        return;
      }

      const employeeData = employeeQuerySnapshot.docs[0].data();
      userCompanyId = employeeData.companyId;

      if (!userCompanyId) {
        console.error(
          `Employee document for ${user.email} is missing companyId.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.companyInfoMissingForDose"),
          position: "bottom",
        });
        // setIsSaving(false);
        return;
      }
      console.log(`Found companyId: ${userCompanyId} for user ${user.uid}`);

      // Definir fecha actual para la nueva dosis Y para la consulta de límite
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1; // Meses en JS son 0-indexados
      const year = today.getFullYear();

      // --- NUEVA VALIDACIÓN: Límite de dosis diarias ---
      const dosesCollectionPath = collection(
        db,
        "companies",
        userCompanyId,
        "employees",
        user.uid,
        "doses",
      );
      const dosesForTodayQuery = query(
        dosesCollectionPath,
        where("day", "==", day),
        where("month", "==", month),
        where("year", "==", year),
      );

      const dosesTodaySnapshot = await getDocs(dosesForTodayQuery);
      console.log(
        `Found ${dosesTodaySnapshot.size} doses already saved for ${day}/${month}/${year}.`,
      );

      if (dosesTodaySnapshot.size >= 15) {
        Toast.show({
          type: "error",
          text1: t("home.alerts.error.title"),
          text2: t(
            "home.alerts.error.dailyDoseLimitReached",
            "Has alcanzado el límite de 15 dosis diarias.",
          ), // Nueva traducción
          position: "bottom",
        });
        // setIsSaving(false);
        return;
      }
      // --- FIN NUEVA VALIDACIÓN ---

      // PASO 2: Guardar la dosis (usando dosesCollectionPath que ya definimos)
      console.log(
        `Adding new manual dose for employee ${user.uid} in company ${userCompanyId} on ${day}/${month}/${year}`,
      );
      await addDoc(dosesCollectionPath, {
        // Reutilizar dosesCollectionPath
        dose: parseFloat(dose),
        totalExposures: parseInt(modalTotalExposures, 10),
        totalTime: totalSecondsFromHHMMSS,
        day, // ya definidos arriba
        month, // ya definidos arriba
        year, // ya definidos arriba
        startTime: formattedStartTime || null,
        timestamp: serverTimestamp(),
        entryMethod: "manual",
      });

      Toast.show({
        type: "success",
        text1: t("home.alerts.success.title"),
        text2: t("home.alerts.success.doseSaved"),
        position: "bottom",
      });

      // Resetear campos del modal
      setModalVisible(false);
      setDose("");
      setModalTotalExposures("");
      setDurationHours("");
      setDurationMinutes("");
      setDurationSeconds("");
      setFormattedStartTime("");
      setStartTime(new Date());
    } catch (error) {
      console.error("❌ Error saving dose data:", error);
      if (error.code === "failed-precondition") {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.firestoreIndexRequired"),
          position: "bottom",
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("home.alerts.error.title"),
          text2: t("home.alerts.error.couldNotSave"),
          position: "bottom",
        });
      }
    } finally {
      // setIsSaving(false);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    // Siempre ocultar el picker después de la interacción en Android
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }

    // Si se seleccionó una hora ('set') y no se canceló
    if (event.type === "set" && selectedTime) {
      const currentTime = selectedTime || startTime; // Usa la hora seleccionada o la actual si algo falla

      // Actualizar el estado Date para el picker
      setStartTime(currentTime);

      // Formatear la hora como "HH:mm" para mostrar y guardar
      const formatted = format(currentTime, "HH:mm");
      setFormattedStartTime(formatted);

      // Ocultar el picker en iOS después de seleccionar
      if (Platform.OS === "ios") {
        setShowTimePicker(false);
      }
    } else {
      // El usuario canceló la selección (Android) o cerró el spinner (iOS)
      setShowTimePicker(false);
    }
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
        }}
      >
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>

        {/* Contenedor centrado */}

        <Text
          style={{
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
          }}
        >
          {t("home.header.title")}
        </Text>

        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.label}>{t("home.modal.dose")}</Text>
                <TextInput
                  style={styles.input}
                  value={dose}
                  onChangeText={setDose}
                  keyboardType="numeric"
                  placeholder={t("home.modal.enterDose")}
                  placeholderTextColor={"gray"}
                />

                <Text style={styles.label}>
                  {t("home.modal.numberOfExposures")}
                </Text>
                <TextInput
                  style={styles.input}
                  value={modalTotalExposures} // Use modal state
                  onChangeText={setModalTotalExposures} // Use modal state
                  keyboardType="number-pad" // Better for integers
                  placeholder={t("home.modal.enterNumberOfExposures")}
                  placeholderTextColor={"gray"}
                />

                <Text style={styles.modalLabel}>
                  {t("home.modal.exposureTime", "Tiempo Exposición (HH:MM:SS)")}
                </Text>
                <View style={styles.durationContainer}>
                  {/* Horas */}
                  <TextInput
                    style={styles.durationInput}
                    value={durationHours}
                    onChangeText={(text) =>
                      setDurationHours(text.replace(/[^0-9]/g, ""))
                    } // Solo números
                    keyboardType="number-pad"
                    placeholder="HH"
                    maxLength={2} // O más si necesitas > 99 horas
                    placeholderTextColor="gray"
                  />
                  <Text style={styles.durationSeparator}>:</Text>
                  {/* Minutos */}
                  <TextInput
                    style={styles.durationInput}
                    value={durationMinutes}
                    onChangeText={(text) =>
                      setDurationMinutes(text.replace(/[^0-9]/g, ""))
                    } // Solo números
                    keyboardType="number-pad"
                    placeholder="MM"
                    maxLength={2}
                    placeholderTextColor="gray"
                  />
                  <Text style={styles.durationSeparator}>:</Text>
                  {/* Segundos */}
                  <TextInput
                    style={styles.durationInput}
                    value={durationSeconds}
                    onChangeText={(text) =>
                      setDurationSeconds(text.replace(/[^0-9]/g, ""))
                    } // Solo números
                    keyboardType="number-pad"
                    placeholder="SS"
                    maxLength={2}
                    placeholderTextColor="gray"
                  />
                </View>

                <Text style={styles.label}>
                  {t("home.modal.startTime", "Hora Inicio")}
                  {t("home.modal.optional", "Opcional")}
                </Text>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={styles.pickerButton} // Reutiliza o crea un estilo similar al de Register.js
                >
                  <Text
                    style={[
                      styles.pickerButtonText, // Estilo base
                      !formattedStartTime && styles.pickerButtonPlaceholder, // Estilo si no hay hora seleccionada
                    ]}
                  >
                    {/* Muestra la hora formateada o un placeholder */}
                    {formattedStartTime ||
                      t("home.modal.selectStartTime", "Seleccionar Hora")}
                  </Text>
                  <Ionicons name="time-outline" size={24} color="gray" />
                </Pressable>

                {/* Picker de Hora (condicional) */}
                {showTimePicker && (
                  <DateTimePicker
                    value={startTime} // Usa el estado Date
                    mode="time" // <-- MODO HORA
                    is24Hour={true} // Formato 24h (o false para AM/PM según preferencia)
                    display="default" // O "spinner" en iOS si prefieres
                    onChange={onTimeChange} // Función handler que crearemos
                  />
                )}

                <View style={styles.buttonContainer}>
                  <Pressable
                    style={[styles.cancelButton, { flex: 1, marginRight: 5 }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>
                      {t("home.modal.cancel")}
                    </Text>
                  </Pressable>

                  <TouchableOpacity
                    style={[styles.modalButton, { flex: 1, marginLeft: 5 }]}
                    onPress={handleSaveDose}
                  >
                    <Text style={styles.buttonText}>
                      {t("home.modal.save")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Pressable
          onPress={handleDoseData}
          style={{
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
          }}
        >
          <Image
            source={require("../../assets/doseData.png")}
            style={{
              width: isTablet ? 60 : 40,
              height: isTablet ? 60 : 40,
              marginRight: isTablet ? 25 : 15,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: isTablet ? 22 : 18,
                fontWeight: "500",
                textAlign: "center",
              }}
            >
              {t("home.doseData")}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setModalVisible(true)}
          style={{
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
          }}
        >
          <Image
            source={require("../../assets/addDoseManually.png")}
            style={{
              width: isTablet ? 60 : 40,
              height: isTablet ? 60 : 40,
              marginRight: isTablet ? 25 : 15,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: isTablet ? 22 : 18,
                fontWeight: "500",
                textAlign: "center",
              }}
            >
              {t("home.addDataManually")}
            </Text>
          </View>
        </Pressable>
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

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "gray",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: "#006892",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 55, // O la altura de tus otros inputs
    borderWidth: 1,
    borderColor: "gray", // O '#ccc'
    borderRadius: 5, // O 10
    paddingHorizontal: 10, // O 15
    backgroundColor: "white",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10, // O el margen que uses
  },
  pickerButtonText: {
    fontSize: 16, // O 18
    color: "black",
  },
  pickerButtonPlaceholder: {
    color: "gray",
  },

  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%", // O el ancho que necesites
    justifyContent: "space-around", // O 'flex-start' con márgenes
    marginBottom: 10,
    marginTop: 5,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    textAlign: "center",
    width: "25%", // Ajusta el ancho según necesites
    color: "black",
  },
  durationSeparator: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 5,
  },
  modalLabel: {
    // Copiado de tu código anterior
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    // Puede que quieras quitar alignSelf si durationContainer es width: '100%'
    // alignSelf: "flex-start",
    marginBottom: 5,
  },
};
