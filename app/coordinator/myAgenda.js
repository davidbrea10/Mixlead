import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  doc,
  addDoc, // Necesario para handleSaveDose
  getDocs, // Puede ser necesario si aún cargas algo
  getDoc,
  setDoc, // Ya no sería necesario si solo usas addDoc
  serverTimestamp,
  query, // Añade query y where si necesitas buscar datos del día
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();

  // Elimina estados que ya no necesitas si loadCurrentDose cambia drásticamente
  // const [currentDoseId, setCurrentDoseId] = useState(null); // <-- Probablemente ya no necesario en este contexto
  // const [exposures, setExposures] = useState([]); // <-- ¿A qué dosis pertenecen ahora? ¿Necesitas cargarlas aquí?
  // const [exposureCount, setExposureCount] = useState(1); // <-- ¿Cómo se determina ahora?
  // const [totalTime, setTotalTime] = useState(0); // <-- ¿Suma de qué? Quizás se calcula en otra pantalla
  // const [totalExposures, setTotalExposures] = useState(0); // <-- ¿Suma de qué?

  const [modalVisible, setModalVisible] = useState(false);
  // Estados para el modal (estos sí son necesarios)
  const [dose, setDose] = useState("");
  const [modalTotalExposures, setModalTotalExposures] = useState(""); // Renombrado para claridad
  const [modalTotalTime, setModalTotalTime] = useState(""); // Renombrado para claridad

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

  const handleDoseData = () => {
    router.push("/coordinator/doseData");
  };

  // --- Lógica de Guardado (Correcta para tu nuevo requisito) ---
  const handleSaveDose = async () => {
    // Validación usando los estados del modal
    if (
      !dose.trim() ||
      isNaN(parseFloat(dose)) ||
      parseFloat(dose) <= 0 || // Permitir cero si es válido, si no, mantener > 0
      !modalTotalExposures.trim() || // Usa el estado del modal
      isNaN(parseInt(modalTotalExposures, 10)) ||
      parseInt(modalTotalExposures, 10) <= 0 ||
      !modalTotalTime.trim() || // Usa el estado del modal
      isNaN(parseInt(modalTotalTime, 10)) ||
      parseInt(modalTotalTime, 10) <= 0
    ) {
      Alert.alert(t("home.alerts.error.title"), t("home.alerts.emptyFields")); // Asegúrate que las keys de traducción sean correctas
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert(
        t("home.alerts.error.title"),
        t("home.alerts.userNotAuthenticated"),
      );
      return;
    }

    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Ruta correcta: la colección de dosis del usuario LOGUEADO (que es el coordinador en este caso?)
      // OJO: ¿Estás seguro que quieres guardar la dosis en la colección del *coordinador* (user.uid)?
      // ¿O deberías tener una forma de seleccionar a qué *empleado* se le asigna esta dosis manual?
      // ********************************************************************************
      // !!!! ASUNCIÓN PELIGROSA: Asumo que el user.uid corresponde al EMPLEADO !!!!
      // Si esta pantalla es para el COORDINADOR añadiendo dosis a OTROS, necesitas
      // un selector de empleado aquí y usar el UID del empleado seleccionado.
      // ********************************************************************************
      const employeeUidToSave = user.uid; // <--- ¡¡REVISA ESTO!! ¿Debería ser seleccionable?

      const dosesCollectionRef = collection(
        db,
        "employees",
        employeeUidToSave, // <--- Usar el UID correcto
        "doses",
      );

      console.log(
        `Adding new dose for employee ${employeeUidToSave} on ${day}/${month}/${year}`,
      );
      await addDoc(dosesCollectionRef, {
        dose: parseFloat(dose),
        totalExposures: parseInt(modalTotalExposures, 10), // Usa el estado del modal
        totalTime: parseInt(modalTotalTime, 10), // Usa el estado del modal
        day,
        month,
        year,
        timestamp: serverTimestamp(), // O usa createdAt
        entryMethod: "manual", // Opcional: para saber que fue entrada manual
      });

      Alert.alert(
        t("home.alerts.success.title"),
        t("home.alerts.success.doseSaved"),
      );
      setModalVisible(false);
      // Limpiar los campos del modal después de guardar
      setDose("");
      setModalTotalExposures("");
      setModalTotalTime("");
    } catch (error) {
      console.error("❌ Error saving dose data:", error);
      Alert.alert(
        t("home.alerts.error.title"),
        t("home.alerts.error.couldNotSave"),
      );
    }
  };
  /*
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

  useEffect(() => {
    loadCurrentDose();
  }, []);
  */

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
                  value={dose} // Correcto
                  onChangeText={setDose} // Correcto
                  keyboardType="numeric"
                  placeholder={t("home.modal.enterDose")}
                />

                <Text style={styles.label}>
                  {t("home.modal.numberOfExposures")}
                </Text>
                <TextInput
                  style={styles.input}
                  value={modalTotalExposures} // Usa el estado del modal
                  onChangeText={setModalTotalExposures} // Usa el estado del modal
                  keyboardType="numeric"
                  placeholder={t("home.modal.enterNumberOfExposures")}
                />

                <Text style={styles.label}>{t("home.modal.exposureTime")}</Text>
                <TextInput
                  style={styles.input}
                  value={modalTotalTime} // Usa el estado del modal
                  onChangeText={setModalTotalTime} // Usa el estado del modal
                  keyboardType="numeric"
                  placeholder={t("home.modal.enterExposureTime")}
                />

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
                    onPress={handleSaveDose} // Correcto
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
            paddingLeft: 20, // Asegura que el icono no quede pegado al borde
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
                paddingHorizontal: 10, // Evita que el texto toque los bordes
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
            paddingLeft: 20, // Asegura que el icono no quede pegado al borde
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
                paddingHorizontal: 10, // Evita que el texto toque los bordes
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
};
