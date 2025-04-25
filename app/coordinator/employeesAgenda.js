import {
  View,
  Text,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet, // Add StyleSheet
  ActivityIndicator, // Add ActivityIndicator for loading state
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next"; // Import i18n hook
import RNHTMLtoPDF from "react-native-html-to-pdf"; // <--- ADD THIS
import * as FileSystem from "expo-file-system"; // Import FileSystem
import * as Sharing from "expo-sharing"; // Import Sharing

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation(); // Initialize translation hook

  const [monthlyDoses, setMonthlyDoses] = useState([]); // For the selected employee view
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [totalAnnualDose, setTotalAnnualDose] = useState(0); // For the selected employee view
  const [employees, setEmployees] = useState([]); // All employees in the company
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // Loading state for PDF generation

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`employeesAgenda.months.${i + 1}`),
  );

  const shortMonthNames = Array.from(
    { length: 12 },
    (_, i) =>
      t(`employeesAgenda.monthsShort.${i + 1}`, {
        defaultValue: monthNames[i].substring(0, 3),
      }), // Provide a fallback
  ); // Assuming you have short month names in your i18n files, e.g., "Jan", "Feb"

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

  // --- Effects ---

  // Load employees of the coordinator's company on mount
  useEffect(() => {
    const loadCompanyEmployees = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.error("loadCompanyEmployees: No user logged in.");
        Alert.alert(t("errors.error"), t("errors.notLoggedIn")); // Alert user
        return;
      }
      const userId = user.uid;
      console.log("loadCompanyEmployees: Running for user:", userId);

      try {
        let companyId = null;
        let userRole = null;

        // 1. Find the coordinator's companyId AND ROLE directly from 'employees'
        console.log(
          `loadCompanyEmployees: Checking 'employees/${userId}' for coordinator data...`,
        );
        const coordinatorEmpDocRef = doc(db, "employees", userId);
        const coordinatorEmpDocSnap = await getDoc(coordinatorEmpDocRef);

        if (coordinatorEmpDocSnap.exists()) {
          const empData = coordinatorEmpDocSnap.data();
          companyId = empData.companyId;
          userRole = empData.role; // This is the role rules will check
          console.log(
            `loadCompanyEmployees: Found in 'employees': companyId=${companyId}, role=${userRole}`,
          );
        } else {
          // This is a critical error - the logged-in user MUST have a document in 'employees'
          // if they are supposed to be a coordinator or employee managed by the app.
          console.error(
            `loadCompanyEmployees: CRITICAL - Logged-in user document not found in 'employees/${userId}'. Cannot proceed.`,
          );
          Alert.alert(t("errors.error"), t("errors.employeeDataNotFound")); // Specific error message
          return; // Stop execution
        }

        // --- Validation after checking 'employees' ---
        if (!companyId) {
          console.error(
            `loadCompanyEmployees: Coordinator document 'employees/${userId}' is missing the 'companyId' field.`,
          );
          Alert.alert(t("errors.error"), t("errors.companyIdMissing"));
          return;
        }

        // Validate if the role allows listing (as per your rules)
        if (userRole !== "coordinator" && userRole !== "admin") {
          console.error(
            `loadCompanyEmployees: User ${userId} role ('${userRole}') found in 'employees' does not grant list permissions according to rules.`,
          );
          // Depending on your logic, you might alert the user or just not load employees
          Alert.alert(t("errors.error"), t("errors.insufficientRole"));
          // We might still want to load their *own* doses, but not list others.
          // For now, let's prevent the list query if role is insufficient.
          setEmployees([]); // Clear employee list if role is wrong
          // If you still want to load the coordinator's own doses, call that function here.
          // loadMonthlyDosesForSelectedEmployee(userId);
          return; // Stop before attempting the list query
        }

        console.log(
          `loadCompanyEmployees: Proceeding with companyId: ${companyId}`,
        );

        // 2. Fetch all employees with that companyId
        console.log(
          `loadCompanyEmployees: Querying 'employees' where companyId == ${companyId}`,
        );
        const employeesQuery = query(
          collection(db, "employees"),
          where("companyId", "==", companyId),
        );
        const usersSnapshot = await getDocs(employeesQuery);
        console.log(
          `loadCompanyEmployees: Query successful, found ${usersSnapshot.docs.length} employees.`,
        );

        const companyEmployees = [];
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          companyEmployees.push({
            id: doc.id,
            name:
              `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
              t("employeesAgenda.employee.unnamed"),
            // Include role if needed later, e.g., for different icons/actions
            // role: data.role
          });
        });

        // Sort employees alphabetically by name
        companyEmployees.sort((a, b) => a.name.localeCompare(b.name));

        setEmployees(companyEmployees);

        // Optionally auto-select the first employee AFTER loading the list
        // if (companyEmployees.length > 0 && !selectedEmployeeId) {
        //   setSelectedEmployeeId(companyEmployees[0].id);
        // }
      } catch (error) {
        // This catch block will now correctly handle errors during the getDoc from 'employees'
        // OR during the getDocs query for the list.
        console.error("--- ERROR START ---");
        console.error("Error loading company employees:", error);
        if (error.code) {
          console.error("Firebase error code:", error.code); // Should still be 'permission-denied' if rules fail query
        }
        if (error.message) {
          console.error("Firebase error message:", error.message);
        }
        console.error("--- ERROR END ---");
        // Provide more specific feedback based on the context
        if (error.code === "permission-denied") {
          Alert.alert(t("errors.error"), t("errors.permissionDeniedQuery"));
        } else {
          Alert.alert(
            t("errors.error"),
            t("errors.loadEmployeesFailed") +
              `: ${error.code || error.message}`,
          );
        }
      }
    };

    loadCompanyEmployees();
  }, [t]); // Add t as dependency for i18n strings

  // Load doses for the *selected* employee when selection changes
  useEffect(() => {
    if (selectedEmployeeId) {
      loadMonthlyDosesForSelectedEmployee(selectedEmployeeId);
    } else {
      // Clear data if no employee is selected
      setMonthlyDoses([]);
      setAvailableYears([new Date().getFullYear()]); // Reset years or keep previous? Resetting seems safer.
      setSelectedYear(new Date().getFullYear());
      setTotalAnnualDose(0);
    }
  }, [selectedEmployeeId]); // Only depends on selectedEmployeeId

  // Recalculate total dose when monthly doses or year changes for the selected employee
  useEffect(() => {
    calculateTotalAnnualDoseForSelectedEmployee();
  }, [monthlyDoses, selectedYear]);

  // --- Data Loading Functions ---

  // Fetches and sets doses/years ONLY for the currently selected employee in the UI
  const loadMonthlyDosesForSelectedEmployee = async (employeeId) => {
    try {
      const dosesRef = collection(db, "employees", employeeId, "doses");
      const snapshot = await getDocs(dosesRef);

      let doseData = {};
      let yearsSet = new Set();
      yearsSet.add(new Date().getFullYear()); // Always include current year

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.dose && data.month && data.year) {
          yearsSet.add(data.year);
          const key = `${data.year}-${data.month}`;
          if (!doseData[key]) {
            doseData[key] = {
              totalDose: 0,
              month: data.month,
              year: data.year,
            };
          }
          // Ensure dose is a number
          const doseValue =
            typeof data.dose === "number"
              ? data.dose
              : parseFloat(data.dose || 0);
          doseData[key].totalDose += doseValue;
        }
      });

      const sortedYears = [...yearsSet].sort((a, b) => b - a); // Sort descending
      setAvailableYears(sortedYears);
      // If the previously selected year isn't available for this employee, reset to the latest available year
      if (!yearsSet.has(selectedYear) && sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
      } else if (sortedYears.length === 0) {
        setSelectedYear(new Date().getFullYear()); // Fallback if no doses ever
      }

      setMonthlyDoses(Object.values(doseData));
    } catch (error) {
      console.error(
        "Error loading monthly doses for selected employee:",
        error,
      );
      Alert.alert(t("errors.error"), t("errors.loadDosesFailed"));
    }
  };

  // Calculates total annual dose for the selected employee based on current state
  const calculateTotalAnnualDoseForSelectedEmployee = () => {
    const total = monthlyDoses
      .filter((item) => item.year === selectedYear)
      .reduce((sum, item) => sum + item.totalDose, 0);
    setTotalAnnualDose(total);
  };

  // --- Navigation ---
  const handleViewDetails = (employeeId, month, year) => {
    router.push({
      pathname: "/coordinator/doseDetails/[doseDetails]",
      params: {
        uid: employeeId,
        month: month.toString(),
        year: year.toString(),
      },
    });
  };

  // --- PDF Generation ---
  const generatePdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t("errors.error"), t("errors.notLoggedIn"));
      setIsGeneratingPdf(false);
      return;
    }

    // Asegurarse que los empleados están cargados
    if (!employees || employees.length === 0) {
      Alert.alert(t("errors.error"), t("errors.noEmployeesFound"));
      setIsGeneratingPdf(false);
      return;
    }

    try {
      // 1. Obtener Company ID y Name (simplificado, ya que los datos están en 'employees')
      let companyId = null;
      let companyName = t("pdf.unknownCompany");
      const coordinatorDocRef = doc(db, "employees", user.uid); // Asumimos que el coord está en employees
      const coordinatorDocSnap = await getDoc(coordinatorDocRef);
      if (coordinatorDocSnap.exists()) {
        companyId = coordinatorDocSnap.data().companyId;
        // Fetch company name if companyId found
        if (companyId) {
          const companyDocRef = doc(db, "companies", companyId);
          const companyDocSnap = await getDoc(companyDocRef);
          if (companyDocSnap.exists()) {
            companyName = companyDocSnap.data().name || companyName;
          }
        } else {
          console.warn(
            "generatePdf: Coordinator document exists but missing companyId.",
          );
        }
      } else {
        console.error(
          "generatePdf: Coordinator document not found in employees collection.",
        );
        Alert.alert(t("errors.error"), t("errors.employeeDataNotFound"));
        setIsGeneratingPdf(false);
        return;
      }

      // 2. Fetch all doses for the selected year for ALL company employees
      // (La lógica de allDosesPromises y flatDoses se mantiene)
      const allDosesPromises = employees.map(async (emp) => {
        // ... (código para fetch doses por empleado y año) ...
        const dosesRef = collection(db, "employees", emp.id, "doses");
        const q = query(dosesRef, where("year", "==", selectedYear));
        const snapshot = await getDocs(q);
        const empDoses = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const doseValue =
            typeof data.dose === "number"
              ? data.dose
              : parseFloat(data.dose || 0);
          if (data.month && !isNaN(doseValue)) {
            // Check month and ensure dose is a valid number
            empDoses.push({ month: data.month, dose: doseValue });
          }
        });
        // Devolver objeto con id, nombre y sus dosis para este año
        return { id: emp.id, name: emp.name, doses: empDoses };
      });

      const employeeDoseData = await Promise.all(allDosesPromises);

      // 3. Structure data AND Generate HTML Table
      let tableRowsHtml = "";
      employeeDoseData.forEach((empData) => {
        const monthlyTotals = Array(12).fill(0);
        let annualTotal = 0;
        empData.doses.forEach((dose) => {
          if (dose.month >= 1 && dose.month <= 12) {
            monthlyTotals[dose.month - 1] += dose.dose;
            annualTotal += dose.dose;
          }
        });

        // Construir fila HTML para este empleado
        tableRowsHtml += `
            <tr>
              <td class="employee-name">${empData.name}</td>
              ${monthlyTotals.map((d) => `<td class="dose-value">${d > 0 ? d.toFixed(2) : "0.00"}</td>`).join("")}
              <td class="dose-total">${annualTotal.toFixed(2)}</td>
            </tr>
          `;
      });

      // 4. Construct Full HTML Content
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Helvetica', sans-serif; font-size: 10px; }
              h1 { font-size: 16px; text-align: center; margin-bottom: 15px; }
              .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
              .company-name { text-align: left; }
              .report-year { text-align: right; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 9px; }
              td.employee-name { text-align: left; font-weight: normal; font-size: 9px; }
              td.dose-value { text-align: right; font-size: 9px; }
              td.dose-total { text-align: right; font-weight: bold; font-size: 9px; }
            </style>
          </head>
          <body>
            <h1>${t("pdf.title")}</h1>
            <div class="header-info">
               <span class="company-name">${t("pdf.company")}: ${companyName}</span>
               <span class="report-year">${t("pdf.year")}: ${selectedYear}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>${t("pdf.table.employeeHeader")}</th>
                  ${shortMonthNames.map((name) => `<th>${name}</th>`).join("")}
                  <th>${t("pdf.table.totalHeader")}</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // 5. Configure PDF Options
      const fileName = `AnnualDoseReport_${companyName.replace(/ /g, "_")}_${selectedYear}`;
      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === "android" ? "Downloads" : "Documents", // Standard directories
        // Opcional: ajustar dimensiones si es necesario
        width: 842, // A4 landscape width in points (approx)
        height: 595, // A4 landscape height in points (approx)
        // base64: true // Descomentar si necesitas la salida en base64 directamente
      };

      // 6. Generate PDF using RNHTMLtoPDF
      console.log("generatePdf: Calling RNHTMLtoPDF.convert...");
      const pdfFile = await RNHTMLtoPDF.convert(options);
      console.log(
        "generatePdf: RNHTMLtoPDF finished. File path:",
        pdfFile.filePath,
      );

      // 7. Share PDF (using expo-sharing)
      const fileUri = pdfFile.filePath; // Get the URI from the result

      // For Android, Expo Sharing might need a "file://" prefix
      const platformSpecificUri =
        Platform.OS === "android" ? `file://${fileUri}` : fileUri;

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t("pdf.shareErrorTitle"), t("pdf.shareErrorMsg"));
        setIsGeneratingPdf(false);
        return;
      }

      await Sharing.shareAsync(platformSpecificUri, {
        mimeType: "application/pdf",
        dialogTitle: t("pdf.shareDialogTitle"),
        UTI: "com.adobe.pdf", // UTI for iOS
      });
    } catch (error) {
      console.error("--- PDF GENERATION ERROR START ---");
      console.error("Error generating PDF with RNHTMLtoPDF:", error);
      if (error.message) {
        console.error("Error Message:", error.message);
      }
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
      console.error("--- PDF GENERATION ERROR END ---");
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
        }}
      >
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
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
              marginHorizontal: 5,
            }}
          >
            {t("employeesAgenda.header.title")}
          </Text>
        </View>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      <View style={{ padding: 16 }}>
        {/* Employee Selector */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 20,
            paddingHorizontal: 10,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", marginRight: 10 }}>
            {t("employeesAgenda.selectEmployee")}
          </Text>
          <Picker
            selectedValue={selectedEmployeeId}
            onValueChange={(itemValue) => setSelectedEmployeeId(itemValue)}
            style={{ flex: 1 }}
          >
            <Picker.Item
              label={t("employeesAgenda.employee.placeholder")}
              value={null}
            />
            {employees.map((emp) => (
              <Picker.Item key={emp.id} label={emp.name} value={emp.id} />
            ))}
          </Picker>
        </View>

        {/* Year Selector */}
        {selectedEmployeeId && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 20,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", marginRight: 10 }}>
              {t("employeesAgenda.selectYear")}
            </Text>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(itemValue) => setSelectedYear(itemValue)}
              style={{ flex: 1 }}
            >
              {availableYears.map((year) => (
                <Picker.Item key={year} label={year.toString()} value={year} />
              ))}
            </Picker>
          </View>
        )}
      </View>

      <ScrollView style={{ minWidth: "100%" }}>
        {monthlyDoses
          .filter((item) => item.year === selectedYear)
          .sort((a, b) => a.month - b.month).length === 0 ? (
          <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
            {t("employeesAgenda.table.noData", { year: selectedYear })}
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
                    : t("employeesAgenda.unknown")}
                </Text>
                <TouchableOpacity
                  style={[styles.cell, styles.eyeButton, { flex: 0.5 }]}
                  onPress={() =>
                    handleViewDetails(selectedEmployeeId, item.month, item.year)
                  }
                >
                  <Ionicons name="eye" size={22} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))
        )}
      </ScrollView>

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
              {t("employeesAgenda.annualDose.title")}
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
            isGeneratingPdf && styles.downloadButtonDisabled,
          ]} // Optional: Style when disabled
          onPress={generatePdf}
          disabled={isGeneratingPdf} // Disable button while generating
        >
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.downloadButtonText}>
              {t("employeesAgenda.annualDose.download")}
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
  noDataText: {
    textAlign: "center",
    fontSize: 20,
    color: "#666",
    marginTop: 20,
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
