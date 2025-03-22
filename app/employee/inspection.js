import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useRef } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";

export default function Calculation() {
  const [exposures, setExposures] = useState("");
  const [exposureCount, setExposureCount] = useState(1);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false); // 🔥 Reemplaza con el ID del usuario autenticado
  const [currentDoseId, setCurrentDoseId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dose, setDose] = useState("");
  const [modifiedExposureCount, setModifiedExposureCount] =
    useState(exposureCount);
  const [modifiedTime, setModifiedTime] = useState(time);
  const [doseModalVisible, setDoseModalVisible] = useState(false);
  const [doseValue, setDoseValue] = useState("");
  const [totalTime, setTotalTime] = useState(0);
  const [totalExposures, setTotalExposures] = useState(0);
  const intervalRef = useRef(null);
  const router = useRouter();

  const fetchDoseData = async () => {
    try {
      const doseRef = doc(
        db,
        "employees",
        auth.currentUser.uid,
        "doses",
        currentDoseId,
      );

      const doseSnap = await getDoc(doseRef, { source: "server" }); // 🔥 Forzar lectura desde el servidor

      if (doseSnap.exists()) {
        console.log("📥 Datos de dosis obtenidos:", doseSnap.data());
      } else {
        console.log("⚠️ No se encontró la dosis en Firestore.");
      }
    } catch (error) {
      console.error("❌ Error al obtener la dosis:", error);
    }
  };

  const loadExposures = async (doseId) => {
    const user = auth.currentUser;
    if (!user) return;

    const exposuresRef = collection(
      db,
      "employees",
      user.uid,
      "doses",
      doseId,
      "exposures",
    );
    const snapshot = await getDocs(exposuresRef);

    let totalExposures = 0;
    let totalTime = 0;
    let exposuresList = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      exposuresList.push(data);
      totalExposures += 1;
      totalTime += data.time;
    });

    setExposures(exposuresList);
    setTotalExposures(totalExposures);
    setTotalTime(totalTime);

    // 📌 Ajustar el número de exposición
    setExposureCount(totalExposures + 1);
  };

  const loadCurrentDose = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const dosesRef = collection(db, "employees", user.uid, "doses");
    const snapshot = await getDocs(dosesRef);
    let existingDose = null;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.year === year && data.month === month && data.day === day) {
        existingDose = { id: docSnap.id, ...data };
      }
    }

    if (existingDose) {
      setCurrentDoseId(existingDose.id);
      setTotalExposures(existingDose.totalExposures || 0);
      setExposureCount((existingDose.totalExposures || 0) + 1); // Ajustar exposición al siguiente número
      await loadExposures(existingDose.id);
    } else {
      const newDoseRef = await addDoc(dosesRef, {
        year,
        month,
        day,
        totalTime: 0,
        totalExposures: 0,
        dose: 0,
        createdAt: serverTimestamp(),
      });
      setCurrentDoseId(newDoseRef.id);
      setTotalExposures(0);
      setExposureCount(1); // Empezar en 1 si no hay exposiciones previas
    }
  };

  // Se ejecuta al abrir la pantalla
  useState(() => {
    loadCurrentDose();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/employee/home");
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const handleStart = () => {
    setRunning(true);
    setTime(0);

    // Iniciar el cronómetro
    intervalRef.current = setInterval(() => {
      setTime((prevTime) => prevTime + 1);
    }, 1000);
  };

  const handleStop = async () => {
    if (!running || !currentDoseId) return;

    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No hay usuario autenticado");
      return;
    }

    const employeeID = user.uid;
    const exposuresRef = collection(
      db,
      "employees",
      employeeID,
      "doses",
      currentDoseId,
      "exposures",
    );

    try {
      await addDoc(exposuresRef, {
        exposureNumber: exposureCount,
        time: time,
        timestamp: serverTimestamp(),
      });

      Alert.alert(
        "Éxito",
        `Exposición ${exposureCount} registrada: ${formatTime(time)}`,
      );

      setExposureCount(exposureCount + 1); // Incrementar exposición para la próxima vez
      setTime(0);

      // 🚀 Cargar datos actualizados de exposiciones y dosis
      await loadExposures(currentDoseId);
    } catch (error) {
      console.error("Error al guardar exposición:", error);
      Alert.alert("Error", "No se pudo guardar la exposición.");
    }
  };

  const handleEndInspection = async () => {
    console.log("🚀 Botón Confirm presionado");

    if (!currentDoseId) {
      console.error("❌ No hay currentDoseId");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      console.error("❌ No hay usuario autenticado");
      return;
    }

    console.log("📊 Valor actual de dose:", dose); // Debugging

    // 🔥 Validar que se haya ingresado una dosis válida
    if (dose.trim() === "") {
      Alert.alert(
        "Error",
        "Debes ingresar una dosis antes de finalizar la inspección.",
      );
      return;
    }

    const doseNumber = parseFloat(dose);
    if (isNaN(doseNumber) || doseNumber <= 0) {
      Alert.alert(
        "Error",
        "Debes ingresar una dosis válida antes de finalizar la inspección.",
      );
      return;
    }

    try {
      const doseRef = doc(db, "employees", user.uid, "doses", currentDoseId);

      // 📥 Obtener la dosis actual antes de actualizarla
      const doseSnap = await getDoc(doseRef);

      if (!doseSnap.exists()) {
        console.error("❌ No se encontró la dosis actual en Firestore.");
        return;
      }

      const existingData = doseSnap.data();

      // 🧮 Sumar los valores nuevos a los existentes
      const newTotalExposures = existingData.totalExposures + totalExposures;
      const newTotalTime = existingData.totalTime + totalTime;
      const newDose = existingData.dose + doseNumber;

      // 📤 Actualizar Firestore con los valores sumados
      await updateDoc(doseRef, {
        totalTime: newTotalTime,
        totalExposures: newTotalExposures,
        dose: newDose,
      });

      console.log("✅ Inspección finalizada y datos actualizados");

      // 🚨 Eliminar todas las exposiciones asociadas
      const exposuresRef = collection(
        db,
        "employees",
        user.uid,
        "doses",
        currentDoseId,
        "exposures",
      );
      const snapshot = await getDocs(exposuresRef);

      const deletePromises = snapshot.docs.map((docSnap) =>
        deleteDoc(docSnap.ref),
      );
      await Promise.all(deletePromises);

      console.log("🗑️ Todas las exposiciones han sido eliminadas.");

      // 🔄 Limpiar datos locales
      setExposures([]);
      setTotalExposures(0);
      setTotalTime(0);
      setDose("");
      setDoseModalVisible(false);
      setModalVisible(false);

      Alert.alert(
        "Inspección finalizada",
        "Los datos han sido actualizados y las exposiciones eliminadas.",
      );

      // 🚀 Redirigir al menú principal después de finalizar la inspección
      router.replace("/employee/home");
    } catch (error) {
      console.error("❌ Error al finalizar la inspección:", error);
      Alert.alert("Error", "No se pudo finalizar la inspección.");
    }
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingTop: 40,
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
              Inspection
            </Text>
          </View>

          <Pressable onPress={handleHome}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 50, height: 50 }}
            />
          </Pressable>
        </View>
      </View>
      {/* Cronómetro */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          Registro de Exposición
        </Text>

        <Text style={styles.timerText}>⏱️ Tiempo: {formatTime(time)}</Text>

        <Text style={styles.exposureText}>📌 Exposición: {exposureCount}</Text>

        {!running ? (
          <Pressable style={styles.startButton} onPress={handleStart}>
            <Text style={{ color: "white", fontSize: 18 }}>▶️ Iniciar</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.stopButton} onPress={handleStop}>
            <Text style={{ color: "white", fontSize: 18 }}>⏹️ Detener</Text>
          </Pressable>
        )}

        <Pressable style={styles.button} onPress={() => setModalVisible(true)}>
          <Text style={{ color: "white", fontSize: 18 }}>End Inspection</Text>
        </Pressable>

        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.label}>Dose (µSv)</Text>
              <TextInput
                style={styles.input}
                value={dose}
                onChangeText={setDose}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Number of Exposures</Text>
              <TextInput
                style={styles.input}
                value={String(totalExposures)}
                keyboardType="numeric"
                editable={false}
              />

              <Text style={styles.label}>Exposure Time (s)</Text>
              <TextInput
                style={styles.input}
                value={String(totalTime)}
                keyboardType="numeric"
                editable={false}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleEndInspection}
              >
                <Text style={{ color: "white", fontSize: 18 }}>Confirm</Text>
              </TouchableOpacity>

              <Pressable
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "white", fontSize: 18 }}>
                  Continue Inspection
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
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
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 20,
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

  cancelButton: {
    backgroundColor: "#555",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
};
