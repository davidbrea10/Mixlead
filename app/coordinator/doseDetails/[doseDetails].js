import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db, auth } from "../../../firebase/config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function DoseDetails() {
  const router = useRouter();
  const { t } = useTranslation();
  const { uid, month, year } = useLocalSearchParams();
  const parsedMonth = parseInt(month, 10);
  const parsedYear = parseInt(year, 10);
  const [dailyDoses, setDailyDoses] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [employeeName, setEmployeeName] = useState("");

  const loadEmployeeName = async () => {
    try {
      const employeeRef = doc(db, "employees", uid);
      const docSnap = await getDoc(employeeRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const fullName = `${data.firstName} ${data.lastName}`;
        setEmployeeName(fullName);
      }
    } catch (error) {
      console.error("Error loading employee name:", error);
    }
  };

  const loadDailyDoses = async () => {
    if (!uid) return;

    try {
      const dosesRef = collection(db, "employees", uid, "doses");
      const snapshot = await getDocs(dosesRef);

      let doseData = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log("Raw data:", data); // Muestra los datos sin modificaciones

        console.log(
          `Comparing: month=${data.month} (${typeof data.month}) vs ${month} (${typeof month}), 
           year=${data.year} (${typeof data.year}) vs ${year} (${typeof year})`,
        );

        if (
          data.dose &&
          data.day &&
          parseInt(data.month) === parsedMonth &&
          parseInt(data.year) === parsedYear
        ) {
          doseData.push({
            dose: data.dose,
            day: data.day,
            month: data.month,
            year: data.year,
            totalTime: data.totalTime,
            totalExposures: data.totalExposures,
          });
        }
      });

      doseData.sort((a, b) => a.day - b.day); // Ordena los datos por día

      console.log(doseData);
      setDailyDoses(doseData);
    } catch (error) {
      console.error("Error loading daily doses:", error);
    }
  };

  useEffect(() => {
    if (uid) {
      loadDailyDoses();
      loadEmployeeName(); // Aquí lo agregas
    }
  }, [uid, month, year]);

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
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
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
              year,
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
      <View
        style={{
          margin: 20,
          padding: 16,
          backgroundColor: "#fff",
          borderRadius: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "600", color: "#006892" }}>
          {employeeName}
        </Text>
      </View>

      {/* Cabecera de la tabla */}
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
        {/* Datos */}
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
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Equivalente dosis anual */}
      {/* Equivalente dosis mensual */}
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
              {totalMonthlyDose().toFixed(2)} μSv
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
