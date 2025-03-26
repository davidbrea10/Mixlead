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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Home() {
  const router = useRouter();

  const [doses, setDoses] = useState([]);
  const [exposures, setExposures] = useState([]);
  const [exposureCount, setExposureCount] = useState(1);
  const [currentDoseId, setCurrentDoseId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dose, setDose] = useState("");
  const [modifiedExposureCount, setModifiedExposureCount] =
    useState(exposureCount);
  const [totalTime, setTotalTime] = useState(0);
  const [totalExposures, setTotalExposures] = useState(0);

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
    if (
      !dose.trim() || // Evita valores vacíos
      isNaN(parseFloat(dose)) ||
      parseFloat(dose) <= 0 ||
      isNaN(parseInt(totalExposures, 10)) ||
      parseInt(totalExposures, 10) <= 0 ||
      isNaN(parseInt(totalTime, 10)) ||
      parseInt(totalTime, 10) <= 0
    ) {
      Alert.alert("Error", "All fields must be filled and greater than zero.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }

    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const doseRef = doc(db, "employees", user.uid, "doses", currentDoseId);
      const doseSnap = await getDoc(doseRef);

      const saveData = async () => {
        await setDoc(doseRef, {
          dose: parseFloat(dose),
          totalExposures: parseInt(totalExposures, 10),
          totalTime: parseInt(totalTime, 10),
          day,
          month,
          year,
          timestamp: serverTimestamp(),
        });

        Alert.alert("Success", "Dose data has been saved.");
        setModalVisible(false);
      };

      if (doseSnap.exists()) {
        const existingData = doseSnap.data();

        // Si la dosis guardada en el día es 0, preguntar antes de sobrescribir
        if (
          existingData.day === day &&
          existingData.month === month &&
          existingData.year === year &&
          existingData.dose !== 0
        ) {
          Alert.alert(
            "Confirm Replacement",
            "There's already a dose you were receiving today. Do you want to replace it?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Replace", onPress: saveData },
            ],
          );
        } else {
          // Si la dosis no es 0 o es de otro día, guardar directamente
          await saveData();
        }
      } else {
        // No existe ningún dato previo, guardar directamente
        await saveData();
      }
    } catch (error) {
      console.error("❌ Error saving dose data:", error);
      Alert.alert("Error", "Could not save the dose data.");
    }
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

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View
        style={{
          paddingTop: 40,
          backgroundColor: "#FF9300",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          borderBottomStartRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
        <View style={{ flexDirection: "column", alignItems: "center" }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "white",
              letterSpacing: 2,
              textShadowColor: "black",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 1,
            }}
          >
            My Agenda
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "light",
              color: "white",
              letterSpacing: 2,
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 1,
            }}
          >
            Annual Dose Data
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
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      ></View>

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
    height: 40,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginTop: 5,
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
