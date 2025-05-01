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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();

  const [modalVisible, setModalVisible] = useState(false);
  const [dose, setDose] = useState(""); // Dose value from modal input
  const [modalTotalExposures, setModalTotalExposures] = useState(""); // Exposures from modal input
  const [modalTotalTime, setModalTotalTime] = useState(""); // Time from modal input

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
    // Validation using MODAL state variables
    const doseValue = parseFloat(dose.replace(/,/g, ".")); // Replace comma before parsing
    const exposuresValue = parseInt(modalTotalExposures, 10);
    const timeValue = parseInt(modalTotalTime, 10);

    if (
      !dose.trim() ||
      isNaN(doseValue) ||
      doseValue < 0 ||
      !modalTotalExposures.trim() ||
      isNaN(exposuresValue) ||
      exposuresValue <= 0 ||
      !modalTotalTime.trim() ||
      isNaN(timeValue) ||
      timeValue <= 0
    ) {
      // Replace Alert with Toast for validation error
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("home.alerts.emptyOrInvalidFields"),
        position: "bottom", // Or 'top'
      });
      return; // Keep the return
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
        dose: doseValue,
        totalExposures: exposuresValue,
        totalTime: timeValue,
        day,
        month,
        year,
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
      setModalTotalTime("");
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
                />

                <Text style={styles.label}>
                  {t("home.modal.exposureTime")} (s)
                </Text>
                <TextInput
                  style={styles.input}
                  value={modalTotalTime} // Use modal state
                  onChangeText={setModalTotalTime} // Use modal state
                  keyboardType="number-pad" // Better for integers (seconds)
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
};
