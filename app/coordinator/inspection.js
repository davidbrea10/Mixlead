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
import { useState, useRef, useEffect } from "react";
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
} from "firebase/firestore";

export default function Calculation() {
  const [doses, setDoses] = useState([]);
  const [exposures, setExposures] = useState([]);
  const [lastInspectionDate, setLastInspectionDate] = useState(null);
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
  const [paused, setPaused] = useState(false); // Estado para manejar la pausa

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
      exposuresList.push({
        id: docSnap.id, // 🔥 Agregar el id del documento
        ...data,
      });
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

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchExposures = async () => {
      const querySnapshot = await getDocs(collection(db, "exposures"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id, // <-- Asegúrate de incluir el ID del documento
        ...doc.data(),
      }));
      setExposures(data);
    };

    fetchExposures();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

  const handleRefresh = () => {
    router.replace("/coordinator/home"); // 🔄 Simula una recarga
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (running && paused) {
      // Si está pausado, solo reanudamos el contador
      setPaused(false);
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    } else if (!running) {
      // Si no está corriendo, iniciamos desde 0
      setRunning(true);
      setPaused(false);
      setTime(0);
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
  };

  const handlePause = () => {
    if (running) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setPaused(true);
    }
  };

  const handleStop = async () => {
    if (!running || !currentDoseId) return;

    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No authenticated user");
      return;
    }

    const employeeID = user.uid;
    const doseRef = doc(db, "employees", employeeID, "doses", currentDoseId);
    const exposuresRef = collection(doseRef, "exposures");

    try {
      // 📌 Obtener el contador de exposiciones desde Firestore
      const doseSnap = await getDoc(doseRef);
      let exposureCounter = 1;

      if (doseSnap.exists() && doseSnap.data().exposureCounter) {
        exposureCounter = doseSnap.data().exposureCounter;
      }

      // 📌 Agregar la exposición con un número único
      await addDoc(exposuresRef, {
        exposureNumber: exposureCounter,
        time: time,
        timestamp: serverTimestamp(),
      });

      Alert.alert(
        "Éxito",
        `Exposición ${exposureCounter} registrada: ${formatTime(time)}`,
      );

      // 📌 Incrementar el contador en Firestore
      await updateDoc(doseRef, { exposureCounter: exposureCounter + 1 });

      // 📌 Restablecer valores en el estado
      setTime(0);

      // 🚀 Cargar datos actualizados de exposiciones
      await loadExposures(currentDoseId);
    } catch (error) {
      console.error("Error al guardar exposición:", error);
      Alert.alert("Error", "The exhibition could not be saved.");
    }
  };

  const confirmDeleteExposure = (userId, doseId, exposureId) => {
    Alert.alert(
      "Confirm deletion",
      "Are you sure you want to delete this exposure?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => handleDeleteExposure(userId, doseId, exposureId),
          style: "destructive",
        },
      ],
    );
  };

  const handleDeleteExposure = async (userId, doseId, exposureId) => {
    try {
      if (!userId || !doseId || !exposureId) {
        Alert.alert("Error", "Insufficient data to eliminate exposure.");
        return;
      }

      const exposureRef = doc(
        db,
        "employees",
        userId,
        "doses",
        doseId,
        "exposures",
        exposureId,
      );

      await deleteDoc(exposureRef);

      // Actualizar la lista de exposiciones después de eliminar
      await loadExposures(doseId);

      Alert.alert("Success", "The exhibit has been successfully removed.");
    } catch (error) {
      console.error("Error al eliminar la exposición:", error);
      Alert.alert("Error", "Could not delete the exhibit.");
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
        "You must enter a dose before completing the inspection.",
      );
      return;
    }

    const doseNumber = parseFloat(dose);
    if (isNaN(doseNumber) || doseNumber <= 0) {
      Alert.alert(
        "Error",
        "You must enter a valid dose before completing the inspection.",
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
        "Inspection completed,",
        "The data has been updated and the exhibits removed.",
      );

      // 🚀 Redirigir al menú principal después de finalizar la inspección
      router.replace("/coordinator/home");
    } catch (error) {
      console.error("❌ Error al finalizar la inspección:", error);
      Alert.alert("Error", "The inspection could not be completed.");
    }
  };

  const checkOldExposures = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

      const dosesRef = collection(db, "employees", user.uid, "doses");
      const querySnapshot = await getDocs(dosesRef);
      let oldExposuresDeleted = false;

      // 🔍 Buscar si ya existe una dosis de hoy

      // 🗑️ Borrar exposiciones de días anteriores
      for (const doseDoc of querySnapshot.docs) {
        const doseId = doseDoc.id;
        const doseData = doseDoc.data();

        if (doseData.date !== todayStr) {
          const exposuresRef = collection(
            db,
            "employees",
            user.uid,
            "doses",
            doseId,
            "exposures",
          );

          const exposuresSnapshot = await getDocs(exposuresRef);
          if (!exposuresSnapshot.empty) {
            oldExposuresDeleted = true;
          }

          const deletePromises = exposuresSnapshot.docs.map((exposureDoc) =>
            deleteDoc(doc(exposuresRef, exposureDoc.id)),
          );
          await Promise.all(deletePromises);

          console.log(`🗑️ Exposiciones eliminadas de la dosis ${doseId}`);
        }
      }

      // 🔄 Recargar la página si se eliminaron exposiciones antiguas
      if (oldExposuresDeleted) {
        console.log("🔄 Recargando página para actualizar la vista...");
      }
    } catch (error) {
      console.error("❌ Error al gestionar dosis diarias:", error);
    }
  };

  // Llamar a la función al iniciar
  useEffect(() => {
    checkOldExposures();
  }, []);

  useEffect(() => {
    loadCurrentDose();
  }, []);

  useEffect(() => {
    setExposureCount(totalExposures + 1);
  }, [totalExposures]);

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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Pressable style={styles.button} onPress={() => setModalVisible(true)}>
          <Text style={{ color: "white", fontSize: 18 }}>End Inspection</Text>
        </Pressable>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(time)}</Text>

          {!running ? (
            <Pressable style={styles.startButton} onPress={handleStart}>
              <Image
                source={require("../../assets/play.png")}
                style={styles.icon}
              />
            </Pressable>
          ) : paused ? (
            <Pressable style={styles.startButton} onPress={handleStart}>
              <Image
                source={require("../../assets/play.png")}
                style={styles.icon}
              />
            </Pressable>
          ) : (
            <Pressable style={styles.startButton} onPress={handlePause}>
              <Image
                source={require("../../assets/pause.png")}
                style={styles.icon}
              />
            </Pressable>
          )}

          {running && (
            <Pressable style={styles.stopButton} onPress={handleStop}>
              <Image
                source={require("../../assets/stop.png")}
                style={styles.icon}
              />
            </Pressable>
          )}
        </View>

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

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Pressable
                  style={[styles.cancelButton, { flex: 1, marginRight: 5 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 18,
                      textAlign: "center",
                    }}
                  >
                    Continue Inspection
                  </Text>
                </Pressable>

                <TouchableOpacity
                  style={[styles.modalButton, { flex: 1, marginLeft: 5 }]}
                  onPress={handleEndInspection}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 18,
                      textAlign: "center",
                    }}
                  >
                    Finish Inspection
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <View
          style={{
            marginTop: 20,
            width: "90%",
            maxHeight: 200,
            height: 200,
            marginBottom: 20,
          }}
        >
          {/* Encabezados de la tabla */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 25,
              borderBottomWidth: 2,
              borderColor: "#006892",
              paddingBottom: 5,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                flex: 1,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Exposure
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                flex: 1,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Time
            </Text>

            <TouchableOpacity
              style={{ flex: 0.5, alignItems: "center" }}
            ></TouchableOpacity>
          </View>

          {/* Lista de exposiciones con desplazamiento */}
          <ScrollView style={{ maxHeight: 275, height: 275 }}>
            {[...exposures]
              .sort((a, b) => a.exposureNumber - b.exposureNumber) // Orden ascendente
              .map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: "#ddd",
                  }}
                >
                  <Text style={{ fontSize: 20, flex: 1, textAlign: "center" }}>
                    {item.exposureNumber}
                  </Text>
                  <Text style={{ fontSize: 20, flex: 1, textAlign: "center" }}>
                    {formatTime(item.time)}
                  </Text>

                  {/* Botón para eliminar */}
                  <TouchableOpacity
                    style={{ flex: 0.5, alignItems: "center" }}
                    onPress={() =>
                      confirmDeleteExposure(
                        auth.currentUser.uid,
                        currentDoseId,
                        item.id,
                      )
                    }
                  >
                    <Text style={{ fontSize: 20, color: "red" }}>❌</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </ScrollView>
        </View>
      </ScrollView>
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
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "90%",
    marginBottom: 20,
  },
  timerText: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#000000",
    marginRight: 20, // Espacio entre el tiempo y el botón
  },
  exposureText: {
    fontSize: 20,
    marginBottom: 20,
  },
  startButton: {
    width: "30%",
    height: 55,
    backgroundColor: "#242424",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
  },
  stopButton: {
    width: "30%",
    height: 55,
    backgroundColor: "#242424",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
  },
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 50,
  },

  button: {
    width: "90%",
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 40,
    marginTop: 50,

    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Elevación para Android
    elevation: 5,
  },

  modalButton: {
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
    width: "90%",
    height: 55,
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

  icon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
};
