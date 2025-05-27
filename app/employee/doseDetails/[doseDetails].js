import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ActivityIndicator, // Import ActivityIndicator
  Alert, // Import Alert
  Platform, // Import Platform
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next"; // Import the translation hook
import { db, auth } from "../../../firebase/config";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc, // Import getDoc
  query,
  where,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import RNHTMLtoPDF from "react-native-html-to-pdf"; // Import PDF library
import * as Sharing from "expo-sharing"; // Import Sharing
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function DoseDetails() {
  const router = useRouter();
  const { t } = useTranslation(); // Initialize translation hook
  const params = useLocalSearchParams(); // Obtener todos los parámetros

  const employeeIdFromParams = params.employeeId; // ID del empleado (user.uid)
  const companyIdFromParams = params.companyId; // ID de la compañía del empleado
  const monthFromParams = params.month;
  const yearFromParams = params.year;

  const parsedMonth = parseInt(monthFromParams, 10);
  const parsedYear = parseInt(yearFromParams, 10);

  const [dailyDoses, setDailyDoses] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDoseIndex, setSelectedDoseIndex] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // State for PDF generation
  const [isLoading, setIsLoading] = useState(true); // State for initial data loading
  const [error, setError] = useState(null);

  // Consistent month names array
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`doseDetails.months.${i + 1}`, { defaultValue: `Month ${i + 1}` }),
  );

  useFocusEffect(
    useCallback(() => {
      // Validar parámetros antes de cargar
      if (
        employeeIdFromParams &&
        companyIdFromParams &&
        !isNaN(parsedMonth) &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        !isNaN(parsedYear)
      ) {
        console.log("DoseDetails focus: Valid params, loading doses.", {
          employeeIdFromParams,
          companyIdFromParams,
          parsedMonth,
          parsedYear,
        });
        loadDailyDoses();
      } else {
        console.error(
          "DoseDetails focus: Invalid or missing navigation parameters.",
          params,
        );
        setError(
          t(
            "errors.invalidNavParams",
            "Parámetros de navegación inválidos o faltantes.",
          ),
        );
        setIsLoading(false);
        // Considerar redirigir o mostrar un error más prominente si los params son esenciales
        // router.back();
      }
      // Limpieza opcional si es necesario
      // return () => console.log("DoseDetails lost focus");
    }, [
      employeeIdFromParams,
      companyIdFromParams,
      monthFromParams,
      yearFromParams,
    ]), // Depender de los params originales string
  );

  const loadDailyDoses = async () => {
    setIsLoading(true);
    setDailyDoses([]);
    setError(null); // Resetear error

    const user = auth.currentUser; // Confirmar que el usuario actual coincide con employeeIdFromParams (opcional)
    if (!user || user.uid !== employeeIdFromParams) {
      console.error("User mismatch or not logged in.", {
        currentUser: user?.uid,
        paramEmployeeId: employeeIdFromParams,
      });
      setError(
        t(
          "errors.authOrParamMismatch",
          "Error de autenticación o parámetros incorrectos.",
        ),
      );
      setIsLoading(false);
      return;
    }

    try {
      // --- MODIFICACIÓN: Usar companyIdFromParams y employeeIdFromParams ---
      const dosesCollectionPath = `companies/${companyIdFromParams}/employees/${employeeIdFromParams}/doses`;
      const dosesRef = collection(db, dosesCollectionPath);
      console.log("Querying doses from:", dosesCollectionPath);

      // Consulta más eficiente filtrando por mes y año en Firestore
      const q = query(
        dosesRef,
        where("month", "==", parsedMonth),
        where("year", "==", parsedYear),
      );
      const snapshot = await getDocs(q);
      // --- FIN MODIFICACIÓN ---

      let doseData = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Las validaciones de data.month y data.year ya están en la query de Firestore
        if (
          data.dose != null &&
          typeof data.dose === "number" &&
          !isNaN(data.dose) &&
          data.day
        ) {
          doseData.push({
            id: docSnap.id, // ID del documento de la dosis
            dose: data.dose,
            day: parseInt(data.day, 10),
            month: parseInt(data.month, 10), // Ya es parsedMonth
            year: parseInt(data.year, 10), // Ya es parsedYear
            totalTime: data.totalTime || 0,
            totalExposures: data.totalExposures || 0,
            startTime: data.startTime || "--:--",
          });
        }
      });

      // Ordenar por día y luego por hora de inicio
      doseData.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        const timeA = a.startTime === "--:--" ? "00:00" : a.startTime; // Tratar "--:--" como inicio del día
        const timeB = b.startTime === "--:--" ? "00:00" : b.startTime;
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;
        return 0;
      });

      setDailyDoses(doseData);
      console.log(
        `Loaded ${doseData.length} daily doses for ${parsedMonth}/${parsedYear}`,
      );
    } catch (error) {
      console.error("Error loading daily doses:", error);
      if (error.code === "failed-precondition") {
        setError(
          t(
            "errors.firestoreIndexRequiredDoses",
            "Se necesita configurar la base de datos para esta vista. Contacte a soporte.",
          ),
        ); // Nueva traducción
      } else {
        setError(t("errors.loadDosesFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpandRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const formatDate = (day, month, year) => {
    // Use locale-aware formatting if possible, otherwise fallback
    try {
      const date = new Date(year, month - 1, day); // Month is 0-indexed in Date
      // Basic check for invalid date components
      if (isNaN(date.getTime())) {
        return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
      }
      // Example using basic formatting, replace with locale-aware if needed
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
      // return date.toLocaleDateString(i18n.language); // Requires i18n instance passed or globally available
    } catch (e) {
      // Fallback for safety
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
    }
  };

  const totalMonthlyDose = () => {
    // Calculate based on current dailyDoses state
    return dailyDoses.reduce((total, item) => total + (item.dose || 0), 0);
  };

  const formatTime = (totalSeconds) => {
    if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) {
      return "00:00:00";
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60); // Use floor for seconds
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleOpenDeleteModal = (index) => {
    // Nueva función para abrir el modal
    setSelectedDoseIndex(index);
    setIsModalVisible(true);
  };

  const handleConfirmDecline = async () => {
    // Recibir el ID de la dosis específica
    // const doseToDelete = dailyDoses[selectedDoseIndex]; // Lógica antigua, no se usa selectedDoseIndex
    // const docId = doseToDelete.id; // Lógica antigua

    if (
      selectedDoseIndex === null ||
      typeof selectedDoseIndex !== "number" ||
      !dailyDoses[selectedDoseIndex]
    ) {
      console.error("Invalid selectedDoseIndex:", selectedDoseIndex);
      Toast.show({
        type: "error",
        text1: t("errors.error"),
        text2: t(
          "errors.noDoseSelectedForDeletion",
          "Ninguna dosis seleccionada para eliminar.",
        ),
        position: "bottom",
      });
      setIsModalVisible(false); // Cerrar modal si hay error
      return;
    }

    const doseToDelete = dailyDoses[selectedDoseIndex];
    const doseEntryId = doseToDelete.id; // Obtener el ID de la dosis del estado

    console.log(
      "Attempting to delete dose. Retrieved doseEntryId:",
      doseEntryId,
    );
    console.log("Current params from route: ", {
      employeeIdFromParams,
      companyIdFromParams,
    });

    // 1. Validar doseEntryId (ahora obtenido de doseToDelete.id)
    if (typeof doseEntryId !== "string" || !doseEntryId.trim()) {
      console.error(
        "Invalid or missing doseEntryId from selected dose:",
        doseEntryId,
      );
      Toast.show({
        type: "error",
        text1: t("errors.error"),
        text2: t(
          "errors.deleteFailedMissingDoseId",
          "ID de dosis inválido o faltante.",
        ),
        position: "bottom",
      });
      setIsModalVisible(false);
      return;
    }

    // 2. Validar employeeIdFromParams
    if (
      typeof employeeIdFromParams !== "string" ||
      !employeeIdFromParams.trim()
    ) {
      console.error(
        "Invalid or missing employeeIdFromParams:",
        employeeIdFromParams,
      );
      Toast.show({
        type: "error",
        text1: t("errors.error"),
        text2: t(
          "errors.deleteFailedMissingEmployeeId",
          "ID de empleado inválido o faltante.",
        ),
        position: "bottom",
      });
      setIsModalVisible(false);
      return;
    }

    // 3. Validar companyIdFromParams
    if (
      typeof companyIdFromParams !== "string" ||
      !companyIdFromParams.trim()
    ) {
      console.error(
        "Invalid or missing companyIdFromParams:",
        companyIdFromParams,
      );
      Toast.show({
        type: "error",
        text1: t("errors.error"),
        text2: t(
          "errors.deleteFailedMissingCompanyId",
          "ID de compañía inválido o faltante.",
        ),
        position: "bottom",
      });
      setIsModalVisible(false);
      return;
    }

    setIsModalVisible(false); // Cerrar el modal ANTES de la operación asíncrona
    // Considera añadir un ActivityIndicator específico para la operación de borrado si es necesario

    try {
      const doseDocRef = doc(
        db,
        "companies",
        companyIdFromParams,
        "employees",
        employeeIdFromParams,
        "doses",
        doseEntryId,
      );
      console.log("Attempting to delete dose at path:", doseDocRef.path);
      await deleteDoc(doseDocRef);

      setDailyDoses(
        (prevDoses) =>
          prevDoses.filter((dose, index) => index !== selectedDoseIndex), // Filtrar por índice o por ID
      );
      // O mejor, filtrar por ID si `doseEntryId` es fiable:
      // setDailyDoses((prevDoses) => prevDoses.filter((dose) => dose.id !== doseEntryId));

      Toast.show({
        type: "success",
        text1: t("doseDetails.deleteSuccessTitle", "Éxito"),
        text2: t(
          "doseDetails.deleteSuccessMessage",
          "Dosis eliminada correctamente.",
        ),
        position: "bottom",
      });
      // No es necesario resetear selectedDoseIndex aquí si el modal ya está cerrado
      // y la lista se actualiza.
    } catch (error) {
      console.error("Error deleting dose in try-catch:", error);
      Toast.show({
        type: "error",
        text1: t("errors.error"),
        text2: t("errors.deleteFailed") + `: ${error.message}`,
        position: "bottom",
      });
    } finally {
      setSelectedDoseIndex(null); // Resetear el índice seleccionado después de todo
    }
  };

  // --- PDF Generation Function ---
  const generateMonthlyPdf = async () => {
    if (isGeneratingPdf) return;
    if (dailyDoses.length === 0) {
      /* ... (validación sin cambios) ... */
      Alert.alert(
        t("employeesAgenda.pdf.errorTitle"),
        t("employeesAgenda.pdf.errorNoDataToExport"),
      );
      return;
    }
    if (
      isNaN(parsedMonth) ||
      isNaN(parsedYear) ||
      !employeeIdFromParams ||
      !companyIdFromParams
    ) {
      /* ... */
      Alert.alert(t("errors.error"), t("errors.invalidParamsOrUserInfo")); // Nueva traducción
      return;
    }

    setIsGeneratingPdf(true);
    // const user = auth.currentUser; // Ya tenemos employeeIdFromParams y companyIdFromParams

    try {
      let employeeName = t("employeesAgenda.pdf.unknownEmployee");
      let fetchedCompanyName = t("employeesAgenda.pdf.unknownCompany"); // Renombrado para evitar conflicto

      // --- MODIFICACIÓN: Usar companyIdFromParams y employeeIdFromParams para obtener datos del empleado ---
      const empDocRef = doc(
        db,
        "companies",
        companyIdFromParams,
        "employees",
        employeeIdFromParams,
      );
      console.log("Fetching employee data for PDF from path:", empDocRef.path);
      // --- FIN MODIFICACIÓN ---
      const empDocSnap = await getDoc(empDocRef);

      if (empDocSnap.exists()) {
        const empData = empDocSnap.data();
        employeeName =
          `${empData.firstName || ""} ${empData.lastName || ""}`.trim() ||
          employeeName;
        // El companyId del empleado (empData.companyId) debería coincidir con companyIdFromParams
        // Si no, hay una inconsistencia, pero usaremos companyIdFromParams para el nombre de la compañía
      } else {
        console.warn(
          "Employee document not found for PDF generation with path:",
          empDocRef.path,
        );
      }

      // Obtener nombre de la compañía (usando companyIdFromParams)
      if (companyIdFromParams) {
        const companyDocRef = doc(db, "companies", companyIdFromParams);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          fetchedCompanyName =
            companyDocSnap.data().Name ||
            companyDocSnap.data().name ||
            fetchedCompanyName;
        } else {
          console.warn(
            `Company document for PDF not found with ID: ${companyIdFromParams}`,
          );
        }
      }

      // 3. Generate HTML Table for Daily Data
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
      // 4. Calculate Total Monthly Dose (reuse function)
      const monthlyTotal = totalMonthlyDose();

      // 5. Construct Full HTML
      // Using monthNames array (0-indexed)
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
          <div class="header-title">${fetchedCompanyName}</div>
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
                <th>${t("employeesAgenda.pdf.tableMonthly.startTime", { defaultValue: "Start Time" })}</th>
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

      // 6. Configure PDF Options (Consider A4 Portrait)
      const fileName = `MonthlyDoseReport_${currentMonthName}_${parsedYear}_${employeeName.replace(/\s+/g, "_")}`;
      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === "android" ? "Download" : "Documents",
        width: 595, // A4 width in points
        height: 842, // A4 height in points
      };

      // 7. Generate PDF
      const pdfFile = await RNHTMLtoPDF.convert(options);
      console.log("Monthly PDF generated:", pdfFile.filePath);

      // 8. Share PDF
      const fileUri =
        Platform.OS === "android"
          ? `file://${pdfFile.filePath}`
          : pdfFile.filePath;

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          t("employeesAgenda.pdf.shareErrorTitle"),
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
              textAlign: "center",
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
                    {t("doseDetails.expanded.startTime", {
                      defaultValue: "Start Time: ",
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
        <TouchableOpacity
          style={[
            styles.downloadButton,
            // Disable if generating or no data or loading
            (isGeneratingPdf || dailyDoses.length === 0 || isLoading) &&
              styles.downloadButtonDisabled,
          ]}
          onPress={generateMonthlyPdf}
          disabled={isGeneratingPdf || dailyDoses.length === 0 || isLoading}
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
