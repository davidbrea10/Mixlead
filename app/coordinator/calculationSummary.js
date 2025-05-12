import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next"; // Importar el hook de traducción
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

export default function CalculationSummary() {
  const router = useRouter();
  const { t } = useTranslation(); // Inicializar traducción
  const params = useLocalSearchParams();

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
    router.replace("/coordinator/home");
  };

  const handleGraph = () => {
    // Pasar el resultado y también indicar la unidad (metros)
    console.log("params", params);
    router.push({
      pathname: "/coordinator/graph", // O la ruta correcta a tu pantalla Graph
      params: {
        latitude: null, // Aún no tenemos lat/lon aquí, se marcarán en Graph
        longitude: null,
        radiusControlled: params.distanceForControlled, // El resultado del cálculo (asumimos que está en metros)
        radiusLimited: params.distanceForLimited, // El resultado del cálculo (asumimos que está en metros)
        radiusProhibited: params.distanceForProhibited, // El resultado del cálculo (asumimos que está en metros)
        radiusUnit: "m", // Especificar la unidad
      },
    });
  };

  const handleTable = () => {
    router.push("/coordinator/tables");
  };

  const handleSaveDose = async () => {
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
        text1: t("errors.errorTitle"),
        text2: t("errors.invalidDurationFormat", "Formato HH:MM:SS inválido."),
        position: "bottom",
      });
      return;
    }
    // Calcular segundos totales
    const totalSecondsFromHHMMSS = hours * 3600 + minutes * 60 + seconds;
    // --- Fin Validación HH:MM:SS ---

    // Validación de los otros campos (dose, exposures, startTime)
    if (
      !dose.trim() ||
      isNaN(parseFloat(dose)) ||
      parseFloat(dose) <= 0 ||
      !modalTotalExposures.trim() ||
      isNaN(parseInt(modalTotalExposures, 10)) ||
      parseInt(modalTotalExposures, 10) <= 0 ||
      // Ya no validamos el input original de totalTime
      totalSecondsFromHHMMSS <= 0
    ) {
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        // Mensaje de error más genérico o específico
        text2: t(
          "home.alerts.emptyFields",
          "Por favor, completa todos los campos correctamente.",
        ),
        position: "bottom",
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      // Replace Alert with Toast for authentication error
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("home.alerts.userNotAuthenticated"),
        position: "bottom",
      });
      return; // Keep the return
    }

    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const dosesCollectionRef = collection(db, "employees", user.uid, "doses");

      console.log(
        `Adding new manual dose for employee ${user.uid} on ${day}/${month}/${year}`,
      );
      await addDoc(dosesCollectionRef, {
        dose: parseFloat(dose),
        totalExposures: parseInt(modalTotalExposures, 10),
        totalTime: totalSecondsFromHHMMSS, // <-- ✨ GUARDAR SEGUNDOS CALCULADOS
        day,
        month,
        year,
        startTime: formattedStartTime || null, // Guardar hora de inicio HH:mm
        timestamp: serverTimestamp(),
        entryMethod: "manual",
      });

      // Replace Alert with Toast for success
      Toast.show({
        type: "success",
        text1: t("home.alerts.success.title"),
        text2: t("home.alerts.success.doseSaved"),
        position: "bottom",
      });

      setModalVisible(false);
      setDose("");
      setModalTotalExposures("");
      setDurationHours(""); // Resetear duración
      setDurationMinutes("");
      setDurationSeconds("");
      setFormattedStartTime(""); // Resetear hora inicio
      setStartTime(new Date());
    } catch (error) {
      console.error("❌ Error saving dose data:", error);
      // Replace Alert with Toast for saving error
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("home.alerts.error.couldNotSave"),
        position: "bottom",
      });
    }
  };

  // Determinar si el valor ingresado es distancia o espesor
  const isDistance = params.calculationType === "distance"; // Asumiendo que se pasa un tipo de cálculo

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
      <View style={{ flex: 1 }}>
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
                marginHorizontal: 10,
              }}
            >
              {t("calculationSummary.title", {
                type: isDistance
                  ? t("calculationSummary.distance")
                  : t("calculationSummary.thickness"),
              })}
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={{ fontSize: 18, fontWeight: "bold", margin: 15 }}>
            {t("calculationSummary.resultsFor")}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.isotope")}</Text>
            <Text style={styles.textLabel}>{params.isotope?.toString()}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>
              {t("calculationSummary.collimator")}
            </Text>
            <Text style={styles.textLabel}>
              {params.collimator?.toString()}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>
              {isDistance
                ? t("calculationSummary.thickness")
                : t("calculationSummary.distance")}
            </Text>
            <Text style={styles.textLabel}>
              {params.value?.toString()} {isDistance ? "mm" : "m"}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.activity")}</Text>
            <Text style={styles.textLabel}>
              {params.activity?.toString()} {t("calculationSummary.ci")}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.material")}</Text>
            <Text style={styles.textLabel}>{params.material?.toString()}</Text>
          </View>
          {params.material === "Other" && (
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.label}>
                {t("calculationSummary.attenuation")}
              </Text>
              <Text style={styles.textLabel}>
                {params.attenuation?.toString()}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.limit")}</Text>
            <Text style={styles.textLabel}>{params.limit?.toString()}</Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {isDistance
              ? t("calculationSummary.resultDistance", {
                  result: params.result?.toString(),
                })
              : t("calculationSummary.resultThickness", {
                  result: params.result?.toString(),
                })}
          </Text>

          {/* Buttons */}
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              marginTop: 40,
            }}
          >
            <Pressable onPress={handleGraph} style={styles.button}>
              <Text style={{ color: "#fff", fontSize: 19 }}>
                {t("calculationSummary.graph")}
              </Text>
            </Pressable>
            <Pressable onPress={handleTable} style={styles.button}>
              <Text style={{ color: "#fff", fontSize: 19 }}>
                {t("calculationSummary.table")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.buttonAddDose}
            >
              <Text style={{ color: "#fff", fontSize: 19 }}>
                {t("home.addDataManually")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
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
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>{t("home.modal.dose")}</Text>
              <TextInput
                style={styles.input}
                value={dose}
                onChangeText={setDose}
                keyboardType="numeric"
                placeholder={t("home.modal.enterDose")}
                placeholderTextColor={"gray"}
              />

              <Text style={styles.modalLabel}>
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
                  placeholderTextColor={"gray"}
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

              <Text style={styles.modalLabel}>
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
                  <Text style={styles.buttonText}>{t("home.modal.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </LinearGradient>
  );
}

const styles = {
  scrollContainer: {
    paddingVertical: 20,
  },

  label: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
    marginLeft: 80,
  },

  textLabel: {
    fontSize: 18,
    marginBottom: 10,
    marginLeft: 10,
  },

  button: {
    width: "90%",
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,

    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Elevación para Android
    elevation: 5,
  },
  buttonAddDose: {
    width: "90%",
    height: 55,
    backgroundColor: "#169200",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,

    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Elevación para Android
    elevation: 5,
  },

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
  modalLabel: {
    fontSize: 16,
    fontWeight: "bold",
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
};
