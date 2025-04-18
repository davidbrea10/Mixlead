import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next"; // Import the translation hook
import { db, auth } from "../../../firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function DoseDetails() {
  const router = useRouter();
  const { t } = useTranslation(); // Initialize translation hook
  const { month, year } = useLocalSearchParams();
  const parsedMonth = parseInt(month, 10);
  const parsedYear = parseInt(year, 10);
  const [dailyDoses, setDailyDoses] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDoseIndex, setSelectedDoseIndex] = useState(null);

  useEffect(() => {
    loadDailyDoses();
  }, [month, year]);

  const loadDailyDoses = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const dosesRef = collection(db, "employees", user.uid, "doses");
      const snapshot = await getDocs(dosesRef);

      let doseData = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Incluye el id del documento
        if (
          data.dose &&
          data.day &&
          parseInt(data.month) === parsedMonth &&
          parseInt(data.year) === parsedYear
        ) {
          doseData.push({
            id: docSnap.id, // El id único del documento
            dose: data.dose,
            day: data.day,
            month: data.month,
            year: data.year,
            totalTime: data.totalTime,
            totalExposures: data.totalExposures,
          });
        }
      });

      doseData.sort((a, b) => a.day - b.day); // Ordena por día
      setDailyDoses(doseData);
    } catch (error) {
      console.error("Error loading daily doses:", error);
    }
  };

  const handleExpandRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const formatDate = (day, month, year) => {
    return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
  };

  const totalMonthlyDose = () => {
    return dailyDoses.reduce((total, item) => total + item.dose, 0);
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleConfirmDecline = async () => {
    if (selectedDoseIndex === null) return;

    const user = auth.currentUser;
    if (!user) return;

    const dose = dailyDoses[selectedDoseIndex];
    const docId = dose.id; // Usa el id directamente

    try {
      // Elimina el documento de Firestore usando el id único
      await deleteDoc(doc(db, "employees", user.uid, "doses", docId));

      // Actualiza el estado local eliminando la dosis
      const updatedDoses = [...dailyDoses];
      updatedDoses.splice(selectedDoseIndex, 1);
      setDailyDoses(updatedDoses);
    } catch (error) {
      console.error("Error deleting dose:", error);
    }

    setIsModalVisible(false); // Cierra el modal
    setSelectedDoseIndex(null); // Restablece el índice seleccionado
  };

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
        <Pressable onPress={() => router.back()}>
          <Image
            source={require("../../../assets/go-back.png")}
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
            {t("doseDetails.title")}
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
            {t("doseDetails.monthLabel", {
              month: t(`doseDetails.months.${parsedMonth}`),
              year: parsedYear,
            })}
          </Text>
        </View>
        <Pressable onPress={() => router.replace("/employee/home")}>
          <Image
            source={require("../../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      {/* Table Header */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("doseDetails.table.dose")}
        </Text>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("doseDetails.table.date")}
        </Text>
        <Text style={[styles.headerCell, { flex: 0.5 }]}>
          {t("doseDetails.table.view")}
        </Text>
      </View>
      <ScrollView style={{ minWidth: "100%" }}>
        {/* Data */}
        {dailyDoses.length === 0 ? (
          <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
            {t("doseDetails.table.noData")}
          </Text>
        ) : (
          dailyDoses.map((item, index) => (
            <View key={index}>
              <View
                style={[
                  styles.row,
                  { backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" },
                ]}
              >
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {item.dose.toFixed(2)} μSv
                </Text>
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {formatDate(item.day, item.month, item.year)}
                </Text>
                <TouchableOpacity
                  style={[styles.cell, styles.eyeButton, { flex: 0.5 }]}
                  onPress={() => handleExpandRow(index)}
                >
                  <Ionicons
                    name={expandedRows[index] ? "eye-off" : "eye"}
                    size={22}
                    color="#007AFF"
                  />
                </TouchableOpacity>
              </View>
              {expandedRows[index] && (
                <View style={[styles.expandedRow]}>
                  <Text style={[styles.expandedText, { marginBottom: 10 }]}>
                    {t("doseDetails.expanded.totalTime")}
                    {formatTime(item.totalTime)}
                  </Text>
                  <Text style={styles.expandedText}>
                    {t("doseDetails.expanded.totalExposures")}
                    {item.totalExposures}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDoseIndex(index);
                      setIsModalVisible(true);
                    }}
                    style={{
                      marginTop: 10,
                      alignSelf: "flex-end",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: "#FF4D4D",
                      borderRadius: 50,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="trash-bin" size={16} color="#fff" />
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      ✖
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        transparent
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <View
            style={{
              backgroundColor: "#1F1F1F",
              padding: 24,
              borderRadius: 20,
              width: 300,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {t("doseDetails.modal.message")}
            </Text>

            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={{
                  backgroundColor: "#2D2D2D",
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "white", fontSize: 16 }}>
                  {t("doseDetails.modal.no")}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmDecline}
                style={{
                  backgroundColor: "#2B4B76",
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "white", fontSize: 16 }}>
                  {t("doseDetails.modal.yes")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Monthly Dose Summary */}
      <View
        style={{
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <View style={styles.annualDoseContainer}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.annualDoseText}>
              {t("doseDetails.monthlySummary.label")}
            </Text>
          </View>
          <View style={styles.annualDoseContainerText}>
            <Text style={styles.annualDoseValue}>
              {t("doseDetails.monthlySummary.value", {
                dose: totalMonthlyDose().toFixed(2),
              })}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.downloadButton} onPress={() => {}}>
          <Text style={styles.downloadButtonText}>
            {t("doseDetails.monthlySummary.download")}
          </Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  headerRow: {
    backgroundColor: "white",
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  headerCell: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    paddingVertical: 12,
  },
  cell: {
    fontSize: 20,
    textAlign: "center",
    paddingVertical: 12,
    color: "#444",
  },
  cellBorder: {
    borderRightWidth: 1,
    borderColor: "#ddd",
  },
  eyeButton: {
    alignItems: "center",
  },
  expandedRow: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  expandedText: {
    color: "#666",
    fontSize: 18,
    textAlign: "center",
  },
  annualDoseContainer: {
    flexDirection: "row", // Cambiado de "row" a "column"
    justifyContent: "center", // Cambiado de "space-between" a "center"
    alignItems: "center", // Añadido para centrar el contenido
    padding: 16,
  },
  annualDoseContainerText: {
    justifyContent: "center", // Cambiado de "space-between" a "center"
    alignItems: "center", // Añadido para centrar el contenido
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
  },
  annualDoseText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center", // Añadido para centrar el texto
  },
  annualDoseValue: {
    fontSize: 18,
    color: "#000000",
    textAlign: "center", // Añadido para centrar el texto
    backgroundColor: "#fff",
  },
  downloadButton: {
    width: "70%",
    backgroundColor: "#C32427",
    padding: 15,
    borderRadius: 5,
  },
  downloadButtonText: {
    color: "white",
    fontSize: 20,
    textAlign: "center",
  },
});
