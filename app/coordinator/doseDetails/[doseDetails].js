import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator, // Import ActivityIndicator
  Alert, // Import Alert
  Platform, // Import Platform
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { db } from "../../../firebase/config";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  where,
  query,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import RNHTMLtoPDF from "react-native-html-to-pdf"; // Import PDF library
import * as Sharing from "expo-sharing"; // Import Sharing

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function DoseDetails() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  const viewedEmployeeId = params.employeeId; // UID del empleado cuyos detalles se están viendo
  const viewedCompanyId = params.companyId; // CompanyID de la empresa de ese empleado
  const monthFromParams = params.month;
  const yearFromParams = params.year;

  const parsedMonth = parseInt(monthFromParams, 10);
  const parsedYear = parseInt(yearFromParams, 10);

  // Validar parámetros al inicio del componente
  const isValidParams =
    viewedEmployeeId &&
    viewedCompanyId &&
    !isNaN(parsedMonth) &&
    !isNaN(parsedYear);

  const [dailyDoses, setDailyDoses] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [employeeName, setEmployeeName] = useState(
    t("employeesAgenda.pdf.unknownEmployee"),
  );
  const [companyName, setCompanyName] = useState(
    t("employeesAgenda.pdf.unknownCompany"),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState(null); // Estado para errores de carga

  // Consistent month names array
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`doseDetails.months.${i + 1}`, { defaultValue: `Month ${i + 1}` }),
  );

  const loadEmployeeDetails = useCallback(
    async (employeeId, companyId) => {
      // No establece isLoading aquí, lo hace el orquestador
      try {
        const employeeRef = doc(
          db,
          "companies",
          companyId,
          "employees",
          employeeId,
        );
        console.log("loadEmployeeDetails: Fetching from", employeeRef.path);
        const docSnap = await getDoc(employeeRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const fullName =
            `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
            t("employeesAgenda.pdf.unknownEmployee");
          setEmployeeName(fullName);

          const companyRefInner = doc(db, "companies", companyId); // Usa el companyId pasado
          const companySnapInner = await getDoc(companyRefInner);
          if (companySnapInner.exists()) {
            setCompanyName(
              companySnapInner.data().Name ||
                companySnapInner.data().name ||
                t("employeesAgenda.pdf.unknownCompany"),
            );
          } else {
            console.warn(`Company doc not found for ID: ${companyId}`);
            setCompanyName(t("employeesAgenda.pdf.unknownCompany"));
          }
        } else {
          console.warn(`Employee doc not found at ${employeeRef.path}`);
          setEmployeeName(t("employeesAgenda.pdf.unknownEmployee"));
          setCompanyName(t("employeesAgenda.pdf.unknownCompany"));
          setError((prevErr) => prevErr || t("errors.employeeDataNotFound"));
        }
      } catch (err) {
        console.error("Error in loadEmployeeDetails:", err);
        setEmployeeName(t("employeesAgenda.pdf.unknownEmployee"));
        setCompanyName(t("employeesAgenda.pdf.unknownCompany"));
        setError((prevErr) => prevErr || t("errors.loadEmployeeDetailsFailed"));
      }
    },
    [t],
  ); // Solo 't' es una dependencia externa que podría cambiar y afectar la función

  const loadDailyDoses = useCallback(
    async (employeeId, companyId, monthToLoad, yearToLoad) => {
      setDailyDoses([]); // Limpiar antes de cargar
      try {
        const dosesCollectionPath = `companies/${companyId}/employees/${employeeId}/doses`;
        const dosesRef = collection(db, dosesCollectionPath);
        const q = query(
          dosesRef,
          where("month", "==", monthToLoad),
          where("year", "==", yearToLoad),
        );
        const snapshot = await getDocs(q);
        let doseData = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            data.dose != null &&
            typeof data.dose === "number" &&
            !isNaN(data.dose) &&
            data.day
          ) {
            doseData.push({
              id: docSnap.id,
              dose: data.dose,
              day: parseInt(data.day, 10),
              month: parseInt(data.month, 10),
              year: parseInt(data.year, 10),
              totalTime: data.totalTime || 0,
              totalExposures: data.totalExposures || 0,
              startTime: data.startTime || "--:--",
            });
          }
        });
        doseData.sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          const timeA = a.startTime === "--:--" ? "00:00" : a.startTime;
          const timeB = b.startTime === "--:--" ? "00:00" : b.startTime;
          return timeA.localeCompare(timeB);
        });
        setDailyDoses(doseData);
      } catch (err) {
        console.error("Error in loadDailyDoses:", err);
        if (err.code === "failed-precondition") {
          setError(
            (prevErr) => prevErr || t("errors.firestoreIndexRequiredDoses"),
          );
        } else {
          setError((prevErr) => prevErr || t("errors.loadDosesFailed"));
        }
      }
    },
    [t],
  ); // Solo 't' es una dependencia externa

  // --- Función orquestadora que será llamada por useFocusEffect ---
  const fetchDataOnFocus = useCallback(async () => {
    // Validar los parámetros usando las constantes desestructuradas del scope del componente
    const localIsValid =
      viewedEmployeeId &&
      typeof viewedEmployeeId === "string" &&
      viewedEmployeeId.trim() !== "" &&
      viewedCompanyId &&
      typeof viewedCompanyId === "string" &&
      viewedCompanyId.trim() !== "" &&
      !isNaN(parsedMonth) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12 &&
      !isNaN(parsedYear);

    console.log(
      "DoseDetails fetchDataOnFocus. Current Params (desestructurados):",
      { viewedEmployeeId, viewedCompanyId, monthFromParams, yearFromParams },
      "Evaluated isValid:",
      localIsValid,
    );

    if (!localIsValid) {
      console.error(
        "DoseDetails: Invalid or missing navigation parameters during actual fetchDataOnFocus execution.",
        { viewedEmployeeId, viewedCompanyId, monthFromParams, yearFromParams },
      );
      setError(t("errors.invalidNavParams"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadEmployeeDetails(viewedEmployeeId, viewedCompanyId),
        loadDailyDoses(
          viewedEmployeeId,
          viewedCompanyId,
          parsedMonth,
          parsedYear,
        ),
      ]);
    } catch (generalError) {
      console.error(
        "DoseDetails: Error during parallel data fetch on focus:",
        generalError,
      );
      setError((prevErr) => prevErr || t("errors.loadDataFailed"));
    } finally {
      setIsLoading(false);
    }
    // Dependencias de fetchDataOnFocus: ahora son los valores primitivos desestructurados
    // y las funciones memoizadas.
  }, [
    viewedEmployeeId,
    viewedCompanyId,
    parsedMonth, // Ya está parseado y se deriva de monthFromParams
    parsedYear, // Ya está parseado y se deriva de yearFromParams
    loadEmployeeDetails,
    loadDailyDoses,
    t,
    // No necesitamos `params` aquí si usamos los valores desestructurados/parseados
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchDataOnFocus();
      // Opcional: función de limpieza
      // return () => { /* ... */ };
    }, [fetchDataOnFocus]), // La dependencia es la función orquestadora memoizada
  );

  const handleExpandRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the specific index
    }));
  };

  const formatDate = (day, month, year) => {
    try {
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
      }
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
    } catch (e) {
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
    }
  };

  const totalMonthlyDose = () => {
    return dailyDoses.reduce((total, item) => total + (item.dose || 0), 0);
  };

  const formatTime = (totalSeconds) => {
    if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) {
      return "00:00:00";
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // --- PDF Generation Function (Adapted for Coordinator View) ---
  const generateMonthlyPdf = async () => {
    if (isGeneratingPdf) return;
    if (dailyDoses.length === 0) {
      Alert.alert(
        t("employeesAgenda.pdf.errorTitle"),
        t("employeesAgenda.pdf.errorNoDataToExport"),
      );
      return;
    }
    if (!isValidParams) {
      Alert.alert(t("errors.error"), t("errors.invalidParams"));
      return;
    }

    setIsGeneratingPdf(true);

    // No need to check auth.currentUser here, coordinator is viewing other's data

    try {
      // 1. Employee Name and Company Name are already in state (`employeeName`, `companyName`)

      // 2. Data is already in `dailyDoses` state

      // 3. Generate HTML Table (same as employee version)
      let tableHtml = "";
      dailyDoses.forEach((item) => {
        tableHtml += `
          <tr>
            <td class="day">${item.day}</td>
            <td class="dose">${item.dose.toFixed(2)} μSv</td>
            <td class="time">${item.startTime || "--:--"}</td>
            <td class="time">${formatTime(item.totalTime)}</td>
            <td class="exposures">${item.totalExposures}</td>
          </tr>
        `;
      });

      // 4. Calculate Total Monthly Dose
      const monthlyTotal = totalMonthlyDose();

      // 5. Construct Full HTML (same as employee version)
      const currentMonthName =
        monthNames[parsedMonth - 1] || `Month ${parsedMonth}`;
      const htmlContent = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica', sans-serif; font-size: 10px; }
            .header-title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 5px; }
            .header-subtitle { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 15px; }
            .info-section { font-size: 11px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 5px; text-align: center; vertical-align: middle;}
            th { background-color: #e9e9e9; font-weight: bold; font-size: 11px; }
            td.day { text-align: center; }
            td.dose { text-align: right; }
            td.time { text-align: center; }
            td.exposures { text-align: center; }
            .footer-total { margin-top: 20px; text-align: right; font-size: 12px; font-weight: bold; padding-right: 10px; }
          </style>
        </head>
        <body>
          <div class="header-title">${companyName}</div>
          <div class="header-subtitle">${t("employeesAgenda.pdf.monthlyReportTitle")}</div>

          <div class="info-section">
            <div><strong>${t("employeesAgenda.pdf.employeeLabel")}:</strong> ${employeeName}</div>
            <div><strong>${t("employeesAgenda.pdf.monthLabel")}:</strong> ${currentMonthName}</div>
            <div><strong>${t("employeesAgenda.pdf.yearLabel")}:</strong> ${parsedYear}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${t("employeesAgenda.pdf.tableMonthly.day")}</th>
                <th>${t("employeesAgenda.pdf.tableMonthly.dose")} (μSv)</th>
                <th>${t("employeesAgenda.pdf.tableMonthly.startTime")}</th>
                <th>${t("employeesAgenda.pdf.tableMonthly.time")} (HH:MM:SS)</th>
                <th>${t("employeesAgenda.pdf.tableMonthly.exposures")}</th>
              </tr>
            </thead>
            <tbody>
              ${tableHtml}
            </tbody>
          </table>
          <div class="footer-total">
              ${t("employeesAgenda.pdf.monthlyTotalLabel")}: ${monthlyTotal.toFixed(2)} μSv
          </div>
        </body>
        </html>
      `;

      // 6. Configure PDF Options (A4 Portrait)
      const fileName = `MonthlyDoseReport_${currentMonthName}_${parsedYear}_${employeeName.replace(/\s+/g, "_")}`;
      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === "android" ? "Download" : "Documents",
        width: 595,
        height: 842,
      };

      // 7. Generate PDF
      const pdfFile = await RNHTMLtoPDF.convert(options);
      console.log("Coordinator - Monthly PDF generated:", pdfFile.filePath);

      // 8. Share PDF
      const fileUri =
        Platform.OS === "android"
          ? `file://${pdfFile.filePath}`
          : pdfFile.filePath;

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          t("employeesAgenda.shareErrorTitle"),
          t("employeesAgenda.pdf.shareErrorMsg"),
        );
        setIsGeneratingPdf(false);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: t("employeesAgenda.pdf.shareDialogTitle"),
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      console.error("--- PDF GENERATION ERROR ---", error);
      Alert.alert(
        t("errors.error"),
        t("errors.pdfGenerationFailed") +
          `: ${error.message || "Unknown error"}`,
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View // Contenedor Principal de la Cabecera
        style={{
          backgroundColor: "#FF9300",
          flexDirection: "row", // Organiza los hijos en una fila: IconoIzquierdo - ContenedorDeTextos - IconoDerecho
          alignItems: "center", // Centra los hijos verticalmente
          padding: 16, // Espaciado general dentro del header
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
        }}
      >
        {/* Contenedor Izquierdo (Ancho Fijo) */}
        <View style={{ width: isTablet ? 70 : 50, alignItems: "center" }}>
          <Pressable onPress={() => router.back()}>
            <Image
              source={require("../../../assets/go-back.png")}
              style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }} // Tamaño del icono
            />
          </Pressable>
        </View>

        {/* ✨ Contenedor Central del Texto (Flexible) ✨ */}
        <View
          style={{
            flex: 1, // Ocupa el espacio sobrante entre los lados
            alignItems: "center", // Centra los Text hijos horizontalmente
            justifyContent: "center", // Centra los Text hijos verticalmente
          }}
        >
          <Text
            style={{
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
        {/* FIN Contenedor Central */}

        {/* Contenedor Derecho (Ancho Fijo IGUAL al izquierdo) */}
        <View style={{ width: 50 }} />
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
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#006892" }}>
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
                    {t("doseDetails.expanded.startTime", {
                      defaultValue: "Start Time:",
                    })}
                    {item.startTime}
                  </Text>

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
        <TouchableOpacity
          style={[
            styles.downloadButton,
            (isGeneratingPdf ||
              dailyDoses.length === 0 ||
              isLoading ||
              !isValidParams) &&
              styles.downloadButtonDisabled,
          ]}
          onPress={generateMonthlyPdf}
          disabled={
            isGeneratingPdf ||
            dailyDoses.length === 0 ||
            isLoading ||
            !isValidParams
          }
        >
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.downloadButtonText}>
              {t("doseDetails.monthlySummary.download")}
            </Text>
          )}
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
  // Estilos de Tabla
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1, // Línea más fina
    borderColor: "#eee", // Color más suave
  },
  headerRow: {
    backgroundColor: "#f8f8f8", // Fondo ligero para cabecera
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  headerCell: {
    fontSize: 16, // Tamaño de cabecera
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    paddingVertical: 14, // Más padding vertical
  },
  cell: {
    fontSize: 15, // Tamaño de celda de datos
    textAlign: "center",
    paddingVertical: 14,
    color: "#444",
  },
  cellBorder: {
    borderRightWidth: 1,
    borderColor: "#eee", // Color más suave
  },
  eyeButton: {
    alignItems: "center",
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16, // Tamaño adecuado para mensaje
    color: "#888", // Gris más oscuro
    marginTop: 40, // Más espacio superior
    paddingHorizontal: 20,
  },
  expandedRow: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  expandedText: {
    color: "#666",
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center", // Añadido para centrar el texto
  },
  annualDoseValue: {
    fontSize: 18,
    color: "#000000",
    textAlign: "center", // Añadido para centrar el texto
    backgroundColor: "#fff",
  },
  // Estilos Botón Descarga
  downloadButton: {
    width: "80%", // Un poco más ancho
    backgroundColor: "#C32427", // Rojo
    paddingVertical: 14, // Padding vertical
    borderRadius: 25, // Muy redondeado
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  downloadButtonText: {
    color: "white",
    fontSize: 16, // Tamaño de texto
    fontWeight: "bold",
    textAlign: "center",
  },
});
