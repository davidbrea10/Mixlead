// Archivo: employee/timerScreen.js (o la ruta que prefieras)

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons"; // Para los iconos
import Toast from "react-native-toast-message";
import { useAudioPlayer } from "expo-audio";

const audioSource = require("../../assets/sounds/timer-alarm.mp3");

const { width } = Dimensions.get("window");
const isTablet = width >= 700;

export default function TimerScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [initialHours, setInitialHours] = useState("00");
  const [initialMinutes, setInitialMinutes] = useState("01"); // Default a 1 minuto
  const [initialSeconds, setInitialSeconds] = useState("00");

  const [totalSeconds, setTotalSeconds] = useState(0); // Total de segundos configurados
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isSet, setIsSet] = useState(false); // Indica si se ha configurado un tiempo

  const intervalRef = useRef(null);
  const soundObjectRef = useRef(null);
  const player = useAudioPlayer(audioSource);

  // 4. FUNCIÓN PARA REPRODUCIR LA ALARMA
  const playAlarmSound = useCallback(async () => {
    try {
      if (soundObjectRef.current) {
        await soundObjectRef.current.unloadAsync(); // Descarga el sonido anterior si existe
      }
      player.play();
    } catch (error) {
      console.error("Failed to play alarm sound", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("timer.error_playing_sound"),
      });
    }
  }, [t]);

  // 5. EFECTO DEL TEMPORIZADOR MODIFICADO PARA LLAMAR AL SONIDO
  useEffect(() => {
    if (isActive && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (remainingSeconds === 0 && isActive) {
      clearInterval(intervalRef.current);
      setIsActive(false);
      Toast.show({
        type: "info",
        text1: t("timer.time_up_title"),
        text2: t("timer.time_up_message"),
      });
      playAlarmSound(); // <-- Llamada a la función de sonido
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, remainingSeconds, t, playAlarmSound]);

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
  const handleHome = () => {
    // Aquí necesitarías la lógica para determinar a qué home ir (employee, coordinator, etc.)
    // Por ahora, lo dejo como un placeholder. Puedes reusar _fetchActiveUserData si es necesario.
    router.replace("/employee/home"); // Ajusta según sea necesario
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.fullScreenGradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
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
                    onBlur={() =>
                      formatInput(initialMinutes, setInitialMinutes)
                    }
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
                    onBlur={() =>
                      formatInput(initialSeconds, setInitialSeconds)
                    }
                    maxLength={2}
                    placeholder="SS"
                    placeholderTextColor="#bbb"
                  />
                  <Text style={styles.inputLabel}>
                    {t("timer.seconds_short", "SS")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.mainButton}
                onPress={handleSetTime}
              >
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
                  <Ionicons
                    name="stop-circle-outline"
                    size={isTablet ? 80 : 70}
                    color="#FF6347"
                  />
                  <Text style={styles.controlButtonText}>
                    {t("timer.reset_button", "Reiniciar")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handlePlayPause}
                >
                  <Ionicons
                    name={
                      isActive ? "pause-circle-outline" : "play-circle-outline"
                    }
                    size={isTablet ? 80 : 70}
                    color="#007AFF"
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
        {/* Footer (opcional, si lo tienes en otras pantallas) */}
        <View style={styles.footer}></View>
      </SafeAreaView>
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
    paddingTop: Platform.select({
      ios: 60,
      android: 40,
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
    padding: 20,
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
});
