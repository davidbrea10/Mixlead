import {
  View,
  Text,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet, // <-- Import StyleSheet
  ActivityIndicator, // <-- Import ActivityIndicator
  Alert, // Import Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  getDocs,
  doc, // <-- Import doc
  getDoc, // <-- Import getDoc
  query, // <-- Import query
  where, // <-- Import where
} from "firebase/firestore"; // <-- Ensure all needed functions are imported
import { Ionicons } from "@expo/vector-icons";
// Remove unused Picker import if you're only using RNPickerSelect
// import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next"; // Import i18n hook
import RNPickerSelect from "react-native-picker-select";
import RNHTMLtoPDF from "react-native-html-to-pdf"; // <-- Import PDF library
import * as Sharing from "expo-sharing"; // <-- Import Sharing

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();

  const [monthlyDoses, setMonthlyDoses] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [totalAnnualDose, setTotalAnnualDose] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // <-- Add state for PDF generation

  // Consistent month names array (reuse keys if applicable or create new ones)
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`doseDetails.months.${i + 1}`, { defaultValue: `Month ${i + 1}` }),
  );

  // --- Navigation ---
  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    // Adjust path if needed based on actual employee home screen path
    router.replace("/coordinator/home");
  };

  const handleViewDetails = (month, year) => {
    if (month && year && auth.currentUser) {
      router.push({
        pathname: "/employee/doseDetails/[doseDetails]",
        params: {
          uid: auth.currentUser.uid, // Pass UID explicitly
          month: month.toString(),
          year: year.toString(),
        },
      });
    } else {
      console.warn("Attempted to view details with invalid params or user.");
      Alert.alert(t("errors.error"), t("errors.navigationParamsMissing"));
    }
  };

  // --- Data Loading ---
  useFocusEffect(
    useCallback(() => {
      loadDataOnFocus();
    }, []),
  );

  useEffect(() => {
    if (selectedYear !== null) {
      calculateTotalAnnualDose();
    } else {
      setTotalAnnualDose(0);
    }
  }, [monthlyDoses, selectedYear]);

  const loadDataOnFocus = async () => {
    console.log("Executing loadDataOnFocus...");
    setIsLoading(true);
    setMonthlyDoses([]);
    setAvailableYears([]);
    const previousSelectedYear = selectedYear; // Preserve to try and reselect

    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      Alert.alert(t("errors.error"), t("errors.notLoggedIn"));
      return;
    }

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

      if (years.includes(previousSelectedYear)) {
        setSelectedYear(previousSelectedYear);
      } else if (years.length > 0) {
        setSelectedYear(years[0]);
      } else {
        const currentYear = new Date().getFullYear();
        if (!years.includes(currentYear)) {
          setAvailableYears((prev) =>
            [...prev, currentYear].sort((a, b) => b - a),
          );
        }
        setSelectedYear(currentYear);
      }

      setMonthlyDoses(Object.values(doseData));
    } catch (error) {
      console.error("Error loading monthly doses:", error);
      Alert.alert(t("errors.error"), t("errors.loadDosesFailed"));
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]);
      setSelectedYear(currentYear);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalAnnualDose = () => {
    const total = monthlyDoses
      .filter((item) => item.year === selectedYear)
      .reduce((sum, item) => sum + (item.totalDose || 0), 0);
    setTotalAnnualDose(total);
  };

  // --- PDF Generation Function (Copied & Integrated) ---
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
      // 1. Get Employee Info
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
      }

      // 2. Get Company Name
      if (companyId) {
        const companyDocRef = doc(db, "companies", companyId);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          companyName = companyDocSnap.data().Name || companyName;
        } else {
          console.warn(`Company document not found for ID: ${companyId}`);
        }
      }

      // 3. Fetch DAILY Doses for the selected year
      const dosesRef = collection(db, "employees", user.uid, "doses");
      const q = query(dosesRef, where("year", "==", selectedYear));
      const snapshot = await getDocs(q);

      const dailyDoses = [];
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
          data.year === selectedYear
        ) {
          dailyDoses.push({
            month: data.month,
            day: data.day,
            dose: doseValue,
          });
        }
      });

      // 4. Structure data for HTML
      const monthlyEmployeeDoses = {};
      for (let month = 1; month <= 12; month++) {
        monthlyEmployeeDoses[month] = { days: {}, monthlyTotal: 0 };
      }
      let overallTotalDose = 0;
      dailyDoses.forEach((dose) => {
        const { month, day, dose: doseValue } = dose;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          if (!monthlyEmployeeDoses[month].days[day]) {
            monthlyEmployeeDoses[month].days[day] = 0;
          }
          monthlyEmployeeDoses[month].days[day] += doseValue;
          monthlyEmployeeDoses[month].monthlyTotal += doseValue;
          overallTotalDose += doseValue;
        }
      });

      // 5. Generate HTML Table
      let tableHtml = "";
      for (let month = 1; month <= 12; month++) {
        const monthData = monthlyEmployeeDoses[month];
        let rowHtml = `<tr><td class="month-name">${monthNames[month - 1]}</td>`;
        for (let day = 1; day <= 31; day++) {
          const dailyDose = monthData.days?.[day] || 0;
          const cellContent = dailyDose > 0 ? dailyDose.toFixed(2) : "";
          rowHtml += `<td class="dose-value">${cellContent}</td>`;
        }
        const formattedTotal = monthData.monthlyTotal.toFixed(2);
        rowHtml += `<td class="dose-total">${formattedTotal} μSv</td></tr>`;
        tableHtml += rowHtml;
      }

      // 6. Construct Full HTML (Using the exact same structure and styles)
      const htmlContent = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica', sans-serif; font-size: 8px; }
            .header-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 5px; }
            .header-subtitle { font-size: 12px; font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 15px; padding: 0 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 3px; text-align: center; vertical-align: middle;}
            th { background-color: #e9e9e9; font-weight: bold; font-size: 8px; }
            td.month-name { text-align: left; font-size: 9px; font-weight: bold; background-color: #f8f8f8; width: 12%; }
            td.dose-value { text-align: right; font-size: 9px; font-weight: normal; width: 2%; }
            td.dose-total { text-align: right; font-size: 9px; font-weight: bold; background-color: #f0f0f0; width: 6%; }
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

      // 7. Configure PDF Options (A3 Landscape)
      const fileName = `MyDoseReport_${selectedYear}_${employeeName.replace(/\s+/g, "_")}`;
      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === "android" ? "Download" : "Documents",
        width: 1123,
        height: 794,
      };

      // 8. Generate PDF
      const pdfFile = await RNHTMLtoPDF.convert(options);
      console.log("Employee Annual PDF generated:", pdfFile.filePath);

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
      setIsGeneratingPdf(false);
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
      {/* Header */}
      <View style={styles.headerContainer}>
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={styles.headerIcon}
          />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t("home.header.title")}</Text>
          <Text style={styles.headerSubtitle}>{t("home.header.subtitle")}</Text>
        </View>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.headerIcon}
          />
        </Pressable>
      </View>

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
                  label: t("home.yearPlaceholder", "Select year..."),
                  value: null,
                }}
                placeholderTextColor={"gray"}
                style={pickerSelectStyles}
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

      {/* Table Body */}
      <ScrollView style={{ minWidth: "100%" }}>
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#FF9300"
            style={{ marginTop: 50 }}
          />
        ) : monthlyDoses
            .filter((item) => item.year === selectedYear)
            .sort((a, b) => a.month - b.month).length === 0 ? (
          <Text style={styles.noDataText}>
            {t("home.table.noData", {
              year: selectedYear || t("home.table.noYearSelected", "N/A"),
            })}
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
                    : t("home.table.unknown", "Unknown")}
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

      {/* Annual Dose & Download Button */}
      <View style={styles.summaryContainer}>
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
        {/* --- UPDATE THIS BUTTON --- */}
        <TouchableOpacity
          style={[
            styles.downloadButton,
            // Disable if generating, loading, or no year selected
            (isGeneratingPdf || isLoading || !selectedYear) &&
              styles.downloadButtonDisabled,
          ]}
          onPress={generateEmployeePdf} // <-- Point to the new function
          disabled={isGeneratingPdf || isLoading || !selectedYear} // <-- Update disabled condition
        >
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.downloadButtonText}>
              {t("home.annualDose.download")}
            </Text>
          )}
        </TouchableOpacity>
        {/* --- END OF UPDATE --- */}
      </View>

      {/* Footer */}
      <View style={styles.footerContainer}></View>
    </LinearGradient>
  );
}

// --- Styles (Combined into StyleSheet.create) ---
const styles = StyleSheet.create({
  headerContainer: {
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
    paddingTop: Platform.select({ ios: 60, android: 40 }),
  },
  headerIcon: {
    width: 50,
    height: 50,
  },
  headerTitleContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  headerSubtitle: {
    fontSize: 24,
    fontWeight: "300",
    color: "white",
    letterSpacing: 2,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  selectorOuterContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerRow: {
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  headerCell: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    paddingVertical: 14,
  },
  cell: {
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 14,
    color: "#444",
  },
  cellBorder: {
    borderRightWidth: 1,
    borderColor: "#eee",
  },
  eyeButton: {
    alignItems: "center",
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginTop: 40,
    paddingHorizontal: 20,
  },
  summaryContainer: {
    flexDirection: "column",
    alignItems: "center",
    paddingBottom: 20,
    paddingTop: 10,
  },
  annualDoseContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "90%",
    marginBottom: 16,
  },
  annualDoseContainerText: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    marginLeft: 10,
  },
  annualDoseText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    flexShrink: 1,
  },
  annualDoseValue: {
    fontSize: 18,
    color: "#000000",
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
  footerContainer: {
    backgroundColor: "#006892",
    padding: 40,
    alignItems: "flex-end",
    borderTopEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
});

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
