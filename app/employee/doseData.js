import {
  View,
  Text,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator, // Import ActivityIndicator
  Alert, // Import Alert
  Platform, // Import Platform
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  getDocs,
  doc, // Import doc
  getDoc, // Import getDoc
  query, // Import query
  where, // Import where
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import { useTranslation } from "react-i18next"; // Import the translation hook
import RNHTMLtoPDF from "react-native-html-to-pdf"; // Import PDF library
import * as Sharing from "expo-sharing"; // Import Sharing

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const [monthlyDoses, setMonthlyDoses] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null); // <-- Initialize to null for placeholder
  const [availableYears, setAvailableYears] = useState([]);
  const [totalAnnualDose, setTotalAnnualDose] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Consistent month names array (assuming keys like 'months.1', 'months.2' etc.)
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`doseDetails.months.${i + 1}`, { defaultValue: `Month ${i + 1}` }),
  ); // Add defaultValue

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/employee/home");
  };

  useFocusEffect(
    useCallback(() => {
      loadDataOnFocus(); // Call the renamed loading function
      // Optional cleanup function
      // return () => console.log("Home screen lost focus");
    }, []), // Empty dependency array for useCallback is usually correct here
  );

  useEffect(() => {
    // Recalculate total only if a year is selected
    if (selectedYear !== null) {
      calculateTotalAnnualDose();
    } else {
      setTotalAnnualDose(0); // Reset if no year is selected
    }
  }, [monthlyDoses, selectedYear]);

  const loadDataOnFocus = async () => {
    console.log("Executing loadDataOnFocus..."); // For debugging
    setIsLoading(true);
    setMonthlyDoses([]);
    setAvailableYears([]);
    // Don't reset selectedYear here, try to preserve it below

    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      Alert.alert(t("errors.error"), t("errors.notLoggedIn"));
      return;
    }

    // Store current selected year to try preserving it
    const previousSelectedYear = selectedYear;

    try {
      const dosesRef = collection(db, "employees", user.uid, "doses");
      const snapshot = await getDocs(dosesRef);

      let doseData = {};
      let yearsSet = new Set();
      let hasData = false;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const yearValue =
          typeof data.year === "number" ? data.year : parseInt(data.year, 10);
        const monthValue =
          typeof data.month === "number"
            ? data.month
            : parseInt(data.month, 10);
        const doseValue =
          typeof data.dose === "number"
            ? data.dose
            : parseFloat(data.dose || 0);

        if (!isNaN(yearValue)) {
          yearsSet.add(yearValue);
          if (
            !isNaN(monthValue) &&
            monthValue >= 1 &&
            monthValue <= 12 &&
            !isNaN(doseValue)
          ) {
            hasData = true;
            const key = `${yearValue}-${monthValue}`;
            if (!doseData[key]) {
              doseData[key] = {
                totalDose: 0,
                month: monthValue,
                year: yearValue,
              };
            }
            doseData[key].totalDose += doseValue;
          }
        }
      });

      const years = [...yearsSet].sort((a, b) => b - a);
      setAvailableYears(years);

      // Logic to set selectedYear: preserve if possible, else default
      if (years.includes(previousSelectedYear)) {
        setSelectedYear(previousSelectedYear); // Preserve previous selection
      } else if (years.length > 0) {
        setSelectedYear(years[0]); // Default to the most recent year
      } else {
        const currentYear = new Date().getFullYear();
        if (!years.includes(currentYear)) {
          // Add current year if not present
          setAvailableYears((prev) =>
            [...prev, currentYear].sort((a, b) => b - a),
          );
        }
        setSelectedYear(currentYear); // Fallback to current year
      }

      setMonthlyDoses(Object.values(doseData));
    } catch (error) {
      console.error("Error loading monthly doses:", error);
      Alert.alert(t("errors.error"), t("errors.loadDosesFailed"));
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]); // Fallback on error
      setSelectedYear(currentYear); // Fallback on error
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalAnnualDose = () => {
    const total = monthlyDoses
      .filter((item) => item.year === selectedYear)
      .reduce((sum, item) => sum + (item.totalDose || 0), 0); // Use || 0 for safety
    setTotalAnnualDose(total);
  };

  const handleViewDetails = (month, year) => {
    if (month && year && auth.currentUser) {
      // Also check if user exists
      router.push({
        pathname: "/employee/doseDetails/[doseDetails]",
        // Pass uid for consistency, even if details screen might re-fetch it
        params: {
          uid: auth.currentUser.uid,
          month: month.toString(),
          year: year.toString(),
        },
      });
    } else {
      console.warn(
        "Attempted to view details with invalid month, year, or user",
      );
      Alert.alert(t("errors.error"), t("errors.navigationParamsMissing"));
    }
  };

  // --- PDF Generation Function ---
  const generateEmployeePdf = async () => {
    if (isGeneratingPdf) return;
    if (!selectedYear) {
      Alert.alert(
        t("errors.error"),
        t("employeesAgenda.pdf.errorNoYearSelected"),
      );
      return;
    }

    setIsGeneratingPdf(true);

    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t("errors.error"), t("errors.notLoggedIn"));
      setIsGeneratingPdf(false);
      return;
    }

    try {
      // 1. Get Employee Info (Name, Company ID)
      let employeeName = t("employeesAgenda.pdf.unknownEmployee");
      let companyId = null;
      let companyName = t("employeesAgenda.pdf.unknownCompany");

      const empDocRef = doc(db, "employees", user.uid);
      const empDocSnap = await getDoc(empDocRef);

      if (empDocSnap.exists()) {
        const empData = empDocSnap.data();
        employeeName =
          `${empData.firstName || ""} ${empData.lastName || ""}`.trim() ||
          employeeName;
        companyId = empData.companyId;
      } else {
        console.warn("Employee document not found for PDF generation.");
        // Proceed without name/company if needed, or alert user
      }

      // 2. Get Company Name (if companyId found)
      if (companyId) {
        const companyDocRef = doc(db, "companies", companyId);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          companyName = companyDocSnap.data().Name || companyName;
        } else {
          console.warn(`Company document not found for ID: ${companyId}`);
        }
      }

      // 3. Fetch Employee's DAILY Doses for the selected year
      const dosesRef = collection(db, "employees", user.uid, "doses");
      const q = query(dosesRef, where("year", "==", selectedYear));
      const snapshot = await getDocs(q);

      const dailyDoses = []; // Array of { month, day, dose }
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const doseValue =
          typeof data.dose === "number"
            ? data.dose
            : parseFloat(data.dose || 0);
        if (
          data.month &&
          data.day &&
          !isNaN(doseValue) &&
          data.year === selectedYear // Double-check year
        ) {
          dailyDoses.push({
            month: data.month,
            day: data.day,
            dose: doseValue,
          });
        }
      });

      // 4. Structure data for HTML (single employee)
      const monthlyEmployeeDoses = {}; // { month: { days: {day: dose}, monthlyTotal } }
      // Initialize structure for ALL months
      for (let month = 1; month <= 12; month++) {
        monthlyEmployeeDoses[month] = {
          days: {}, // Store dose for each day { 1: 0.5, 5: 1.2, ... }
          monthlyTotal: 0,
        };
      }

      // Populate with actual doses and calculate totals
      let overallTotalDose = 0;
      dailyDoses.forEach((dose) => {
        const { month, day, dose: doseValue } = dose;
        // Basic validation
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          if (!monthlyEmployeeDoses[month].days[day]) {
            monthlyEmployeeDoses[month].days[day] = 0;
          }
          monthlyEmployeeDoses[month].days[day] += doseValue;
          monthlyEmployeeDoses[month].monthlyTotal += doseValue;
          overallTotalDose += doseValue; // Accumulate overall total
        }
      });

      // 5. Generate HTML Table
      let tableHtml = "";
      for (let month = 1; month <= 12; month++) {
        const monthData = monthlyEmployeeDoses[month];
        // Use the consistent monthNames array (0-indexed)
        let rowHtml = `<tr><td class="month-name">${monthNames[month - 1]}</td>`;

        // Generate cells for 31 days
        for (let day = 1; day <= 31; day++) {
          const dailyDose = monthData.days?.[day] || 0;
          // Format dose to 2 decimal places if > 0, otherwise empty cell
          const cellContent = dailyDose > 0 ? dailyDose.toFixed(2) : "";
          rowHtml += `<td class="dose-value">${cellContent}</td>`;
        }

        // Add monthly total cell
        const formattedTotal = monthData.monthlyTotal.toFixed(2);
        rowHtml += `<td class="dose-total">${formattedTotal} μSv</td></tr>`;

        tableHtml += rowHtml;
      }

      // 6. Construct Full HTML
      const htmlContent = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            /* Basic styling, same as coordinator's employee PDF */
            body { font-family: 'Helvetica', sans-serif; font-size: 8px; }
            .header-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 5px; }
            .header-subtitle { font-size: 12px; font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 15px; padding: 0 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 3px; text-align: center; vertical-align: middle;}
            th { background-color: #e9e9e9; font-weight: bold; font-size: 8px; }
            td.month-name { text-align: left; font-size: 9px; font-weight: bold; background-color: #f8f8f8; width: 12%; } /* Adjusted width */
            td.dose-value { text-align: right; font-size: 9px; font-weight: normal; width: 2%; } /* Adjusted width */
            td.dose-total { text-align: right; font-size: 9px; font-weight: bold; background-color: #f0f0f0; width: 6%; } /* Adjusted width */
            .footer-total { margin-top: 15px; text-align: right; font-size: 12px; font-weight: bold; padding-right: 10px; }
          </style>
        </head>
        <body>
          <div class="header-title">${companyName}</div>
          <div class="header-subtitle">
            <span>${t("employeesAgenda.pdf.employeeTitle")}: ${employeeName}</span>
            <span>${t("employeesAgenda.pdf.year")}: ${selectedYear}</span>
          </div>
          <table>
            <thead>
              <tr>
                <!-- Match widths with td styles above -->
                <th style="width: 12%;">${t("employeesAgenda.pdf.table.monthHeader")}</th>
                ${Array.from({ length: 31 }, (_, i) => `<th style="width: 2%;">${i + 1}</th>`).join("")}
                <th style="width: 6%;">${t("employeesAgenda.pdf.table.totalHeader")}</th>
              </tr>
            </thead>
            <tbody>
              ${tableHtml}
            </tbody>
          </table>
          <div class="footer-total">
              ${t("employeesAgenda.pdf.annualTotalLabel")}: ${overallTotalDose.toFixed(2)} μSv
          </div>
        </body>
        </html>
      `;

      // 7. Configure PDF Options
      const fileName = `MyDoseReport_${selectedYear}_${employeeName.replace(/\s+/g, "_")}`;
      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === "android" ? "Download" : "Documents",
        width: 1123, // A3 landscape width in points
        height: 794, // A3 landscape height in points
      };

      // 8. Generate PDF
      const pdfFile = await RNHTMLtoPDF.convert(options);
      console.log("Employee PDF generated:", pdfFile.filePath);

      // 9. Share PDF
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
      setIsGeneratingPdf(false); // Ensure state is reset
    }
  };

  // Format years for RNPickerSelect
  const yearItems = availableYears.map((year) => ({
    label: year.toString(),
    value: year,
  }));

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View
        style={{
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
            {t("home.header.title")}
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
            {t("home.header.subtitle")}
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
      {/* Year Selector */}
      <View style={styles.selectorOuterContainer}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>{t("home.selectYear")}</Text>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color="#FF9300"
              style={{ flex: 1 }}
            />
          ) : (
            <View style={styles.pickerInnerWrapper}>
              <RNPickerSelect
                onValueChange={(value) => setSelectedYear(value)}
                items={yearItems}
                value={selectedYear}
                placeholder={{
                  label: t("home.yearPlaceholder", "Selecciona año..."), // Add translation key
                  value: null,
                }}
                style={pickerSelectStyles} // Use defined styles
                useNativeAndroidPickerStyle={false}
                Icon={() => (
                  <Ionicons name="chevron-down" size={20} color="gray" />
                )}
                disabled={isLoading || yearItems.length === 0}
              />
            </View>
          )}
        </View>
      </View>
      {/* Table Header */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("home.table.dose")}
        </Text>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("home.table.month")}
        </Text>
        <Text style={[styles.headerCell, { flex: 0.5 }]}>
          {t("home.table.view")}
        </Text>
      </View>

      <ScrollView style={{ minWidth: "100%" }}>
        {monthlyDoses
          .filter((item) => item.year === selectedYear)
          .sort((a, b) => a.month - b.month).length === 0 ? (
          <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
            {t("home.table.noData", { year: selectedYear })}
          </Text>
        ) : (
          monthlyDoses
            .filter((item) => item.year === selectedYear)
            .sort((a, b) => a.month - b.month)
            .map((item, index) => (
              <View
                key={index}
                style={[
                  styles.row,
                  { backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" },
                ]}
              >
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {item.totalDose.toFixed(2)} μSv
                </Text>
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {item.month
                    ? monthNames[item.month - 1]
                    : t("home.table.unknown")}
                </Text>
                <TouchableOpacity
                  style={[styles.cell, styles.eyeButton, { flex: 0.5 }]}
                  onPress={() => handleViewDetails(item.month, item.year)}
                >
                  <Ionicons name="eye" size={22} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))
        )}
      </ScrollView>

      {/* Annual Dose */}
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
              {t("home.annualDose.title")}
            </Text>
          </View>
          <View style={styles.annualDoseContainerText}>
            <Text style={styles.annualDoseValue}>
              {totalAnnualDose.toFixed(2)} μSv
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.downloadButton,
            isGeneratingPdf && styles.downloadButtonDisabled, // Style when disabled
          ]}
          onPress={generateEmployeePdf}
          disabled={isGeneratingPdf || !selectedYear} // Disable during generation or if no year selected
        >
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.downloadButtonText}>
              {t("home.annualDose.download")}
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

const styles = {
  // Selector Styles
  selectorOuterContainer: {
    paddingHorizontal: 16,
    paddingTop: 16, // Add top padding if needed
    paddingBottom: 8, // Add bottom padding if needed
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 25,
    paddingHorizontal: 15,
    minHeight: 55,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginRight: 10,
  },
  pickerInnerWrapper: {
    flex: 1,
    justifyContent: "center",
  },
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
};

// Styles for RNPickerSelect (kept separate for clarity)
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: "black",
    paddingRight: 30, // space for icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "black",
    paddingRight: 30, // space for icon
  },
  placeholder: {
    color: "#9EA0A4",
    fontSize: 16,
  },
  iconContainer: {
    top: "50%",
    marginTop: -10, // Adjust based on icon size
    right: 15,
  },
});
