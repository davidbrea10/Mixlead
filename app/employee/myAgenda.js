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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
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

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/employee/home");
  };

  const handleDoseData = () => {
    router.push("/employee/doseData");
  };

  const handleSaveDose = async () => {
    // --- Inicio de validaciones de input (sin cambios) ---
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
        text2: t(
          "home.alerts.emptyFieldsOrTimeOrDuration",
          "Por favor, completa todos los campos correctamente.",
        ),
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
        text2: t(
          "home.alerts.emptyFieldsOrTimeOrDuration",
          "Por favor, completa todos los campos correctamente.",
        ),
        position: "bottom",
      });
      return;
    }
    // --- Fin de validaciones de input ---

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

    // Podrías querer un estado de carga específico para esta operación si se vuelve lenta
    // setLoading(true); // O un estado como setIsSavingDose(true);

    let userCompanyId = null;

    try {
      // --- PASO 1: Obtener el documento del empleado actual para sacar su companyId ---
      console.log(
        `Workspaceing employee data for user ${user.uid} to get companyId...`,
      );
      const employeesGroupRef = collectionGroup(db, "employees");
      const employeeQuery = query(
        employeesGroupRef,
        where("email", "==", user.email),
      ); // Asumiendo que el email es un identificador fiable
      const employeeQuerySnapshot = await getDocs(employeeQuery);

      if (employeeQuerySnapshot.empty) {
        console.error(
          `Could not find employee document for email ${user.email} to retrieve companyId.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t(
            "errors.userDataNotFoundForDose",
            "No se encontraron datos del usuario para guardar la dosis.",
          ), // Nueva traducción
          position: "bottom",
        });
        // setLoading(false); // O setIsSavingDose(false);
        return;
      }

      const employeeData = employeeQuerySnapshot.docs[0].data();
      userCompanyId = employeeData.companyId; // Obtenemos el companyId desde el documento del empleado

      if (!userCompanyId) {
        console.error(
          `Employee document for ${user.email} is missing companyId.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t(
            "errors.companyInfoMissingForDose",
            "El usuario no está asignado a una empresa. No se puede guardar la dosis.",
          ), // Nueva traducción
          position: "bottom",
        });
        // setLoading(false); // O setIsSavingDose(false);
        return;
      }
      console.log(`Found companyId: ${userCompanyId} for user ${user.uid}`);
      // --- FIN PASO 1 ---

      // --- PASO 2: Guardar la dosis con el companyId obtenido ---
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const dosesCollectionRef = collection(
        db,
        "companies",
        userCompanyId, // Usar el companyId obtenido
        "employees",
        user.uid,
        "doses",
      );

      console.log(
        `Adding new manual dose for employee ${user.uid} in company ${userCompanyId} on ${day}/${month}/${year}`,
      );
      await addDoc(dosesCollectionRef, {
        dose: parseFloat(dose),
        totalExposures: parseInt(modalTotalExposures, 10),
        totalTime: totalSecondsFromHHMMSS,
        day,
        month,
        year,
        startTime: formattedStartTime || null,
        timestamp: serverTimestamp(), // Asegúrate que serverTimestamp esté importado
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
      setStartTime(new Date()); // Asume que estas funciones de estado existen
      // --- FIN PASO 2 ---
    } catch (error) {
      console.error("❌ Error saving dose data:", error);
      if (error.code === "failed-precondition") {
        // Error específico de Firestore si falta un índice para la collectionGroup query
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
      // setLoading(false); // O setIsSavingDose(false);
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
            style={{ width: 50, height: 50 }}
          />
        </Pressable>

        {/* Contenedor centrado */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              letterSpacing: 2,
              textShadowColor: "black",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 1,
            }}
          >
            {t("home.header.title")}
          </Text>
        </View>

        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
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
            height: 76,
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 68,
            backgroundColor: "rgba(4, 4, 4, 0.6)",
            borderRadius: 50,
            alignItems: "center",
            borderColor: "white",
            borderWidth: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 20,
            paddingLeft: 20,
          }}
        >
          <Image
            source={require("../../assets/doseData.png")}
            style={{
              width: 40,
              height: 40,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                textAlign: "center",
                paddingHorizontal: 10,
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
            height: 76,
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 68,
            backgroundColor: "rgba(4, 4, 4, 0.6)",
            borderRadius: 50,
            alignItems: "center",
            borderColor: "white",
            borderWidth: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 20,
            paddingLeft: 20,
          }}
        >
          <Image
            source={require("../../assets/addDoseManually.png")}
            style={{
              width: 40,
              height: 40,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                textAlign: "center",
                paddingHorizontal: 10,
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
