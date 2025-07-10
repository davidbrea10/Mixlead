// Archivo: employee/timerScreen.js (o la ruta que prefieras)

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Pressable,
} from "react-native";
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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons"; // Para los iconos
import Toast from "react-native-toast-message";
import { useAudioPlayer } from "expo-audio";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const audioSource = require("../../assets/sounds/timer-alarm.mp3");

const { width } = Dimensions.get("window");
const isTablet = width >= 700;

export default function TimerScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const insets = useSafeAreaInsets();

  // Estados del temporiazador
  const [initialHours, setInitialHours] = useState("00");
  const [initialMinutes, setInitialMinutes] = useState("01"); // Default a 1 minuto
  const [initialSeconds, setInitialSeconds] = useState("00");

  const [totalSeconds, setTotalSeconds] = useState(0); // Total de segundos configurados
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isSet, setIsSet] = useState(false); // Indica si se ha configurado un tiempo

  // Estados del modal
  const [modalVisible, setModalVisible] = useState(false);
  const [dose, setDose] = useState(""); // Dose value from modal input
  const [modalTotalExposures, setModalTotalExposures] = useState(""); // Exposures from modal input

  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");

  const [startTime, setStartTime] = useState(new Date());
  const [formattedStartTime, setFormattedStartTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  const intervalRef = useRef(null);
  // Audio Player con el hook (mucho más limpio)
  const player = useAudioPlayer(audioSource);

  // Función para reproducir la alarma
  const playAlarmSound = useCallback(() => {
    // El hook maneja la carga y descarga, solo necesitamos reproducir.
    if (player.isLoaded && !player.isPlaying) {
      player.play();
    }
  }, [player]);

  // Efecto del temporizador
  useEffect(() => {
    if (isActive && remainingSeconds > 0) {
      // eslint-disable-next-line no-undef
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (remainingSeconds === 0 && isActive) {
      // --- ACCIONES CUANDO EL TIEMPO TERMINA ---
      // eslint-disable-next-line no-undef
      clearInterval(intervalRef.current);
      setIsActive(false);

      // Reproducir sonido
      playAlarmSound();

      // Rellenar los campos de duración para el modal
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setDurationHours(String(h).padStart(2, "0"));
      setDurationMinutes(String(m).padStart(2, "0"));
      setDurationSeconds(String(s).padStart(2, "0"));

      // Abrir el modal
      setModalVisible(true);
    }
    // eslint-disable-next-line no-undef
    return () => clearInterval(intervalRef.current);
  }, [isActive, remainingSeconds, t, playAlarmSound, totalSeconds]);

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
  }, [t]);

  const handleInputChange = (value, setter, max) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (
      numericValue === "" ||
      (parseInt(numericValue, 10) >= 0 && parseInt(numericValue, 10) <= max)
    ) {
      setter(numericValue);
    } else if (parseInt(numericValue, 10) > max) {
      setter(String(max));
    }
  };

  const formatInput = (value, setter) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      setter("00");
    } else {
      setter(String(num).padStart(2, "0"));
    }
  };

  const handleSetTime = () => {
    Keyboard.dismiss();
    const h = parseInt(initialHours, 10) || 0;
    const m = parseInt(initialMinutes, 10) || 0;
    const s = parseInt(initialSeconds, 10) || 0;

    const total = h * 3600 + m * 60 + s;

    if (total <= 0) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("timer.error_invalid_time"),
      });
      return;
    }
    setTotalSeconds(total);
    setRemainingSeconds(total);
    setIsSet(true);
    setIsActive(false); // El temporizador está configurado pero no iniciado
  };

  const handlePlayPause = () => {
    if (totalSeconds <= 0) return; // No hacer nada si no se ha configurado un tiempo

    // Si el tiempo terminó y se pulsa play de nuevo, reinicia el contador
    if (remainingSeconds <= 0 && !isActive) {
      setRemainingSeconds(totalSeconds);
    }
    setIsActive(!isActive);
  };

  const handleCancelReset = () => {
    // eslint-disable-next-line no-undef
    clearInterval(intervalRef.current);
    setIsActive(false);
    setIsSet(false);
    setRemainingSeconds(0);
    setTotalSeconds(0);
    // Opcional: resetear los inputs a sus valores por defecto o vacíos
    setInitialHours("00");
    setInitialMinutes("01");
    setInitialSeconds("00");
  };

  const formatDisplayTime = (timeInSeconds) => {
    const h = Math.floor(timeInSeconds / 3600);
    const m = Math.floor((timeInSeconds % 3600) / 60);
    const s = timeInSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // --- Navegación (similar a tus otras pantallas) ---
  const handleBack = () => router.back();

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

  const handleDoseChange = (text) => {
    const formattedText = text.replace(",", ".");
    setDose(formattedText);
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.fullScreenGradient}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Image
            source={require("../../assets/go-back.png")} // Ajusta la ruta
            style={styles.icon}
          />
        </TouchableOpacity>
        <Text style={styles.title}>
          {t("timer.screen_title", "Temporizador")}
        </Text>
        <TouchableOpacity onPress={handleHome} style={styles.headerButton}>
          <Image
            source={require("../../assets/icon.png")} // Ajusta la ruta
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {!isSet ? (
          // --- Vista de Configuración del Tiempo ---
          <View style={styles.setupContainer}>
            <Text style={styles.setupTitle}>
              {t("timer.set_duration_title", "Configurar Duración")}
            </Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  value={initialHours}
                  onChangeText={(val) =>
                    handleInputChange(val, setInitialHours, 99)
                  }
                  onBlur={() => formatInput(initialHours, setInitialHours)}
                  maxLength={2}
                  placeholder="HH"
                  placeholderTextColor="#bbb"
                />
                <Text style={styles.inputLabel}>
                  {t("timer.hours_short", "HH")}
                </Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  value={initialMinutes}
                  onChangeText={(val) =>
                    handleInputChange(val, setInitialMinutes, 59)
                  }
                  onBlur={() => formatInput(initialMinutes, setInitialMinutes)}
                  maxLength={2}
                  placeholder="MM"
                  placeholderTextColor="#bbb"
                />
                <Text style={styles.inputLabel}>
                  {t("timer.minutes_short", "MM")}
                </Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  value={initialSeconds}
                  onChangeText={(val) =>
                    handleInputChange(val, setInitialSeconds, 59)
                  }
                  onBlur={() => formatInput(initialSeconds, setInitialSeconds)}
                  maxLength={2}
                  placeholder="SS"
                  placeholderTextColor="#bbb"
                />
                <Text style={styles.inputLabel}>
                  {t("timer.seconds_short", "SS")}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.mainButton} onPress={handleSetTime}>
              <Text style={styles.mainButtonText}>
                {t("timer.set_time_button", "Establecer Tiempo")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // --- Vista de Cuenta Atrás ---
          <View style={styles.timerDisplayContainer}>
            <Text style={styles.remainingTimeText}>
              {formatDisplayTime(remainingSeconds)}
            </Text>
            <Text style={styles.initialTimeText}>
              {t("timer.from_time", {
                time: formatDisplayTime(totalSeconds),
              })}
            </Text>

            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleCancelReset}
              >
                <Image
                  source={require("../../assets/reiniciar.png")}
                  style={{
                    width: isTablet ? 80 : 70,
                    height: isTablet ? 80 : 70,
                  }}
                />
                <Text style={styles.controlButtonText}>
                  {t("timer.reset_button", "Reiniciar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePlayPause}
              >
                <Image
                  source={
                    isActive
                      ? require("../../assets/pausar.png")
                      : require("../../assets/iniciar.png")
                  }
                  style={{
                    width: isTablet ? 80 : 70,
                    height: isTablet ? 80 : 70,
                  }}
                />
                <Text style={styles.controlButtonText}>
                  {isActive
                    ? t("timer.pause_button", "Pausar")
                    : t("timer.play_button", "Iniciar")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
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
                onChangeText={handleDoseChange}
                keyboardType="numeric"
                placeholder={t("home.modal.enterDose")}
                placeholderTextColor={"gray"}
              />

              <Text style={styles.label}>
                {t("home.modal.numberOfExposures")}
              </Text>
              <TextInput
                style={styles.input}
                value={modalTotalExposures}
                onChangeText={setModalTotalExposures}
                keyboardType="number-pad"
                placeholder={t("home.modal.enterNumberOfExposures")}
                placeholderTextColor={"gray"}
              />

              <Text style={styles.modalLabel}>
                {t("home.modal.exposureTime", "Tiempo Exposición (HH:MM:SS)")}
              </Text>
              <View style={styles.durationContainer}>
                <TextInput
                  style={styles.durationInput}
                  value={durationHours}
                  onChangeText={(text) =>
                    setDurationHours(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="HH"
                  maxLength={2}
                  placeholderTextColor="gray"
                />
                <Text style={styles.durationSeparator}>:</Text>
                <TextInput
                  style={styles.durationInput}
                  value={durationMinutes}
                  onChangeText={(text) =>
                    setDurationMinutes(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="MM"
                  maxLength={2}
                  placeholderTextColor="gray"
                />
                <Text style={styles.durationSeparator}>:</Text>
                <TextInput
                  style={styles.durationInput}
                  value={durationSeconds}
                  onChangeText={(text) =>
                    setDurationSeconds(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="SS"
                  maxLength={2}
                  placeholderTextColor="gray"
                />
              </View>
              <Text style={styles.label}>
                {t("home.modal.startTime", "Hora Inicio")}
                <Text style={styles.optionalText}>
                  {t("home.modal.optional", "(Opcional)")}
                </Text>
              </Text>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={styles.pickerButton}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formattedStartTime && styles.pickerButtonPlaceholder,
                  ]}
                >
                  {formattedStartTime ||
                    t("home.modal.selectStartTime", "Seleccionar Hora")}
                </Text>
                <Ionicons name="time-outline" size={24} color="gray" />
              </Pressable>

              {showTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onTimeChange}
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

      {/* Footer (opcional, si lo tienes en otras pantallas) */}
      <View style={styles.footer}></View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fullScreenGradient: { flex: 1 },
  safeArea: { flex: 1 },
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
  icon: { width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 },
  title: {
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
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  setupContainer: {
    width: "100%",
    maxWidth: isTablet ? 500 : 350,
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  setupTitle: {
    fontSize: isTablet ? 26 : 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 25,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start", // Para alinear labels debajo de inputs
    justifyContent: "center",
    marginBottom: 30,
  },
  inputGroup: {
    alignItems: "center",
    marginHorizontal: 5,
  },
  timeInput: {
    fontSize: isTablet ? 40 : 32,
    fontWeight: "bold",
    color: "#005A85",
    borderBottomWidth: 2,
    borderColor: "#005A85",
    textAlign: "center",
    width: isTablet ? 80 : 60,
    paddingVertical: 5,
  },
  inputLabel: {
    fontSize: isTablet ? 14 : 12,
    color: "#555",
    marginTop: 5,
  },
  timeSeparator: {
    fontSize: isTablet ? 40 : 32,
    fontWeight: "bold",
    color: "#005A85",
    paddingHorizontal: 5,
    alignSelf: "center", // Para centrar los dos puntos con los números
    lineHeight: isTablet ? 50 : 40, // Ajustar para alinear verticalmente
  },
  mainButton: {
    backgroundColor: "#006892", // Color primario de tus otros botones
    paddingVertical: isTablet ? 18 : 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 200,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mainButtonText: {
    color: "white",
    fontSize: isTablet ? 20 : 18,
    fontWeight: "bold",
  },
  timerDisplayContainer: {
    alignItems: "center",
  },
  remainingTimeText: {
    fontSize: isTablet ? 90 : 70,
    fontWeight: "bold",
    color: "#005A85", // Un color principal
    fontVariant: ["tabular-nums"], // Para que los números no salten
    marginBottom: 5,
  },
  initialTimeText: {
    fontSize: isTablet ? 20 : 16,
    color: "#777",
    marginBottom: 40,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    maxWidth: 350,
  },
  controlButton: {
    alignItems: "center",
    padding: 10,
  },
  controlButtonText: {
    fontSize: isTablet ? 16 : 14,
    color: "#333",
    marginTop: 5,
  },
  footer: {
    // Similar al footer de tables.js
    backgroundColor: "#006892",
    paddingVertical: isTablet ? 20 : 15,
    borderTopEndRadius: isTablet ? 40 : 30,
    minHeight: isTablet ? 60 : 50,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
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
});
