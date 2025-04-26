import {
  View,
  Text,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react"; // Added useRef
import { db, auth } from "../../firebase/config";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  collectionGroup, // Import collectionGroup for broader queries
  limit,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next";
import { t } from "i18next"; // Import t function for translation
import RNHTMLtoPDF from "react-native-html-to-pdf";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// --- Helper function to get distinct years from all doses of a company ---
// NOTE: This performs a potentially large read. Consider optimizing
// if performance becomes an issue (e.g., using Cloud Functions to maintain a list).
const getAllYearsWithDoses = async (companyId) => {
  const years = new Set();
  try {
    console.log(
      `getAllYearsWithDoses: Querying 'doses' collection group where companyId == ${companyId}`,
    );
    // This queries ALL documents in ALL 'doses' subcollections
    // This requires a Firestore index on 'companyId' for the 'doses' collection group.
    // Ensure your Firestore rules allow reading from the 'doses' collection group based on companyId.
    // Example Rule for 'doses' collection group:
    // match /{path=**}/doses/{doseId} {
    //   allow read: if get(/databases/$(database)/documents/employees/$(request.auth.uid)).data.companyId == resource.data.companyId ||
    //                get(/databases/$(database)/documents/employees/$(request.auth.uid)).data.role == 'admin'; // Or based on coordinator role and matching companyId of the dose document
    //   allow write: if request.auth != null && request.auth.uid == parent.parent.id; // Or your existing rule
    // }
    // It might be more efficient to query employees first, then query doses for each.
    // Let's stick to the original employee-first approach and aggregate years client-side for now.

    // 1. Get all employees of the company
    const employeesQuery = query(
      collection(db, "employees"),
      where("companyId", "==", companyId),
    );
    const usersSnapshot = await getDocs(employeesQuery);
    const employeeIds = usersSnapshot.docs.map((doc) => doc.id);

    if (employeeIds.length === 0) {
      console.log("getAllYearsWithDoses: No employees found for company.");
      return [new Date().getFullYear()]; // Return current year as default
    }

    // 2. Fetch doses for each employee and collect years
    const dosePromises = employeeIds.map((empId) => {
      const dosesRef = collection(db, "employees", empId, "doses");
      // We only need the 'year' field, but Firestore fetches the whole doc.
      // No specific query needed here, just get all doses for the employee.
      return getDocs(dosesRef);
    });

    const doseSnapshots = await Promise.all(dosePromises);

    doseSnapshots.forEach((snapshot) => {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.year) {
          years.add(data.year);
        }
      });
    });

    // Always include the current year if it's not already present
    years.add(new Date().getFullYear());

    // Sort years descending
    return [...years].sort((a, b) => b - a);
  } catch (error) {
    console.error("Error fetching all available years:", error);
    Alert.alert(
      t("errors.error"),
      t("errors.loadYearsFailed") + `: ${error.message}`,
    );
    return [new Date().getFullYear()]; // Fallback to current year
  }
};

// --- Helper function to get employees who have doses in a specific year ---
const getEmployeesWithDosesInYear = async (companyId, year) => {
  const employeesWithData = [];
  try {
    // 1. Get all employees of the company
    const employeesQuery = query(
      collection(db, "employees"),
      where("companyId", "==", companyId),
    );
    const usersSnapshot = await getDocs(employeesQuery);

    if (usersSnapshot.empty) {
      return [];
    }

    // 2. For each employee, check if they have *any* dose in the specified year
    const employeeCheckPromises = usersSnapshot.docs.map(async (empDoc) => {
      const empId = empDoc.id;
      const empData = empDoc.data();
      const dosesRef = collection(db, "employees", empId, "doses");
      // Query for just one document in that year to confirm existence
      const yearQuery = query(
        dosesRef, // Colección: employees/{empId}/doses
        where("year", "==", year), // Solo filtrar por año
        limit(1),
      );
      const yearDoseSnapshot = await getDocs(yearQuery);
      if (!yearDoseSnapshot.empty) {
        // If the snapshot is not empty, this employee has data for the year
        return {
          id: empId,
          name:
            `${empData.firstName || ""} ${empData.lastName || ""}`.trim() ||
            t("employeesAgenda.employee.unnamed"),
        };
      }
      return null; // Return null if no data for this year
    });

    const results = await Promise.all(employeeCheckPromises);

    // Filter out the nulls and sort the valid employees
    return results
      .filter((emp) => emp !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(
      `Error fetching employees with doses in year ${year}:`,
      error,
    );
    Alert.alert(
      t("errors.error"),
      t("errors.loadFilteredEmployeesFailed") + `: ${error.message}`,
    );
    return []; // Return empty on error
  }
};

const calculateCompanyTotalDoseForYear = async (companyId, year, t) => {
  let totalDose = 0;
  try {
    // 1. Obtener todos los empleados de la compañía
    const employeesQuery = query(
      collection(db, "employees"),
      where("companyId", "==", companyId),
    );
    const usersSnapshot = await getDocs(employeesQuery);
    const employeeIds = usersSnapshot.docs.map((doc) => doc.id);

    if (employeeIds.length === 0) {
      return 0; // No hay empleados, la dosis es 0
    }

    // 2. Para cada empleado, obtener sus dosis del año especificado y sumarlas
    const dosePromises = employeeIds.map(async (empId) => {
      const dosesRef = collection(db, "employees", empId, "doses");
      const yearQuery = query(dosesRef, where("year", "==", year));
      const doseSnapshot = await getDocs(yearQuery);
      let employeeYearlyDose = 0;
      doseSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const doseValue =
          typeof data.dose === "number"
            ? data.dose
            : parseFloat(data.dose || 0);
        if (!isNaN(doseValue)) {
          employeeYearlyDose += doseValue;
        }
      });
      return employeeYearlyDose;
    });

    const yearlyDoses = await Promise.all(dosePromises);
    totalDose = yearlyDoses.reduce((sum, currentDose) => sum + currentDose, 0);

    console.log(`Total company dose for year ${year}: ${totalDose}`);
    return totalDose;
  } catch (error) {
    console.error(
      `Error calculating company total dose for year ${year}:`,
      error,
    );
    Alert.alert(
      t("errors.error"),
      t("errors.calculateTotalFailed") + `: ${error.message}`, // Asegúrate de tener esta key en i18n
    );
    return 0; // Retornar 0 en caso de error
  }
};

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();

  // --- State ---
  const [monthlyDoses, setMonthlyDoses] = useState([]); // Doses for the selected employee/year
  const [totalAnnualDose, setTotalAnnualDose] = useState(0); // For the selected employee/year
  const [companyTotalAnnualDose, setCompanyTotalAnnualDose] = useState(0); // <-- NUEVO ESTADO

  const [allAvailableYears, setAllAvailableYears] = useState([]); // All years with data in the company
  const [selectedYear, setSelectedYear] = useState(null); // <-- Start with null

  const [allCompanyEmployees, setAllCompanyEmployees] = useState([]); // All employees in the company (for reference)
  const [filteredEmployees, setFilteredEmployees] = useState([]); // Employees with data for the selected year
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null); // <-- Start with null

  const [isLoadingYears, setIsLoadingYears] = useState(true); // Loading indicator for initial year load
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false); // Loading indicator for filtered employees
  const [isLoadingDoses, setIsLoadingDoses] = useState(false); // Loading indicator for employee doses
  const [isLoadingCompanyTotal, setIsLoadingCompanyTotal] = useState(false); // <-- NUEVO ESTADO DE CARGA (opcional pero recomendado)

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Store companyId to avoid fetching it repeatedly
  const companyIdRef = useRef(null);

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`employeesAgenda.months.${i + 1}`),
  );

  // --- Effects ---

  // 1. Initial Load: Get Coordinator's Company ID and ALL available years
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingYears(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(t("errors.error"), t("errors.notLoggedIn"));
        setIsLoadingYears(false);
        return;
      }

      try {
        // Get Coordinator's Company ID
        console.log(
          `loadInitialData: Checking 'employees/${user.uid}' for coordinator data...`,
        );
        const coordinatorEmpDocRef = doc(db, "employees", user.uid);
        const coordinatorEmpDocSnap = await getDoc(coordinatorEmpDocRef);

        if (
          !coordinatorEmpDocSnap.exists() ||
          !coordinatorEmpDocSnap.data().companyId
        ) {
          console.error(
            "loadInitialData: Coordinator doc not found or missing companyId.",
          );
          Alert.alert(t("errors.error"), t("errors.companyIdMissing"));
          setIsLoadingYears(false);
          return;
        }

        const fetchedCompanyId = coordinatorEmpDocSnap.data().companyId;
        const userRole = coordinatorEmpDocSnap.data().role; // Check role for permissions
        companyIdRef.current = fetchedCompanyId; // Store companyId

        // Basic role check (adjust as needed per your rules)
        if (userRole !== "coordinator" && userRole !== "admin") {
          Alert.alert(t("errors.error"), t("errors.insufficientRole"));
          setIsLoadingYears(false);
          // Potentially allow viewing own doses, but block selection here
          return;
        }

        console.log(
          `loadInitialData: Found companyId: ${fetchedCompanyId}. Fetching all available years...`,
        );

        // Fetch all unique years across the company that have dose data
        const years = await getAllYearsWithDoses(fetchedCompanyId);
        setAllAvailableYears(years);

        // Optionally set the default selected year to the latest available one
        if (years.length > 0) {
          // setSelectedYear(years[0]); // Auto-select the most recent year
          // Let's keep it null initially to force user selection
          setSelectedYear(null);
        } else {
          setSelectedYear(new Date().getFullYear()); // Fallback if no years found
        }

        // Also load all employees initially IF needed elsewhere (like PDF)
        // If only needed for filtering, this can be skipped or done within the filtering function
        const employeesQuery = query(
          collection(db, "employees"),
          where("companyId", "==", fetchedCompanyId),
        );
        const usersSnapshot = await getDocs(employeesQuery);
        const companyEmployees = [];
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          companyEmployees.push({
            id: doc.id,
            name:
              `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
              t("employeesAgenda.employee.unnamed"),
          });
        });
        companyEmployees.sort((a, b) => a.name.localeCompare(b.name));
        setAllCompanyEmployees(companyEmployees); // Store the full list
      } catch (error) {
        console.error("Error during initial data load:", error);
        Alert.alert(
          t("errors.error"),
          t("errors.initialLoadFailed") + `: ${error.message}`,
        );
        // Set default year even on error?
        setAllAvailableYears([new Date().getFullYear()]);
        setSelectedYear(new Date().getFullYear());
      } finally {
        setIsLoadingYears(false);
      }
    };

    loadInitialData();
  }, [t]); // Run only on mount

  // 2. Filter Employees when Year Changes
  useEffect(() => {
    const updateDataForYear = async () => {
      if (!selectedYear || !companyIdRef.current) {
        // Reset states when no year is selected
        setFilteredEmployees([]);
        setSelectedEmployeeId(null);
        setMonthlyDoses([]);
        setCompanyTotalAnnualDose(0);
        setTotalAnnualDose(0); // Reset individual total too
        return;
      }

      setIsLoadingEmployees(true);
      setIsLoadingCompanyTotal(true);
      // Reset before fetching new data for the year
      setFilteredEmployees([]);
      setSelectedEmployeeId(null); // Crucial: deselect employee when year changes
      setMonthlyDoses([]);
      setCompanyTotalAnnualDose(0);
      setTotalAnnualDose(0); // Reset individual total

      try {
        const employees = await getEmployeesWithDosesInYear(
          companyIdRef.current,
          selectedYear,
          t,
        );
        setFilteredEmployees(employees);

        const total = await calculateCompanyTotalDoseForYear(
          companyIdRef.current,
          selectedYear,
          t,
        );
        setCompanyTotalAnnualDose(total);
      } catch (error) {
        setFilteredEmployees([]);
        setCompanyTotalAnnualDose(0);
      } finally {
        setIsLoadingEmployees(false);
        setIsLoadingCompanyTotal(false);
      }
    };
    updateDataForYear();
  }, [selectedYear, t]);

  // 3. Load Doses when Employee Changes (and year is already selected)
  useEffect(() => {
    const loadDoses = async () => {
      if (selectedEmployeeId && selectedYear) {
        console.log(
          `Loading doses for employee: ${selectedEmployeeId}, year: ${selectedYear}`,
        );
        setIsLoadingDoses(true);
        setMonthlyDoses([]); // Clear previous doses
        setTotalAnnualDose(0);
        try {
          const dosesRef = collection(
            db,
            "employees",
            selectedEmployeeId,
            "doses",
          );
          // Query only for the selected year
          const q = query(dosesRef, where("year", "==", selectedYear));
          const snapshot = await getDocs(q);

          let doseData = {}; // Use object for aggregation per month

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              data.dose &&
              data.month &&
              data.year === selectedYear // Double check year
            ) {
              const month = data.month;
              if (!doseData[month]) {
                doseData[month] = {
                  totalDose: 0,
                  month: month,
                  year: data.year,
                };
              }
              const doseValue =
                typeof data.dose === "number"
                  ? data.dose
                  : parseFloat(data.dose || 0);
              if (!isNaN(doseValue)) {
                doseData[month].totalDose += doseValue;
              }
            }
          });

          // Convert aggregated data back to array and sort by month
          const dosesArray = Object.values(doseData).sort(
            (a, b) => a.month - b.month,
          );
          setMonthlyDoses(dosesArray);
          console.log(`Loaded ${dosesArray.length} monthly dose entries.`);
        } catch (error) {
          console.error(
            "Error loading monthly doses for selected employee:",
            error,
          );
          Alert.alert(t("errors.error"), t("errors.loadDosesFailed"));
          setMonthlyDoses([]);
        } finally {
          setIsLoadingDoses(false);
        }
      } else {
        // Clear doses if no employee is selected
        setMonthlyDoses([]);
        setTotalAnnualDose(0);
      }
    };

    loadDoses();
  }, [selectedEmployeeId, selectedYear]); // Re-run when employee or year changes

  // 4. Recalculate INDIVIDUAL Employee total dose
  useEffect(() => {
    // Siempre calcula basado en monthlyDoses actuales
    // Si monthlyDoses está vacío (porque no hay empleado seleccionado o no tiene datos), el total será 0
    const total = monthlyDoses.reduce((sum, item) => sum + item.totalDose, 0);
    setTotalAnnualDose(total);
  }, [monthlyDoses]);

  // --- Navigation ---
  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

  const handleViewDetails = (month) => {
    // We already have selectedEmployeeId and selectedYear from state
    if (!selectedEmployeeId || !selectedYear || !month) {
      console.warn("handleViewDetails called without necessary parameters.");
      return;
    }
    router.push({
      pathname: "/coordinator/doseDetails/[doseDetails]",
      params: {
        uid: selectedEmployeeId,
        month: month.toString(),
        year: selectedYear.toString(),
      },
    });
  };

  // --- PDF Generation (Requires allCompanyEmployees state) ---
  const generatePdf = async () => {
    if (isGeneratingPdf) return;
    // Ensure a year is selected and we have the full employee list
    if (
      !selectedYear ||
      !allCompanyEmployees ||
      allCompanyEmployees.length === 0
    ) {
      Alert.alert(
        t("errors.error"),
        t("employeesAgenda.pdf.errorNoYearOrEmployees"),
      );
      return;
    }

    setIsGeneratingPdf(true);

    const user = auth.currentUser;
    if (!user || !companyIdRef.current) {
      // Also check if companyId was loaded
      Alert.alert(t("errors.error"), t("errors.notLoggedInOrNoCompany"));
      setIsGeneratingPdf(false);
      return;
    }

    try {
      // 1. Get Company Name (using stored companyIdRef)
      let companyName = t("pdf.unknownCompany");
      const companyDocRef = doc(db, "companies", companyIdRef.current);
      const companyDocSnap = await getDoc(companyDocRef);
      if (companyDocSnap.exists()) {
        companyName = companyDocSnap.data().Name || companyName;
      }

      // 2. Fetch all doses for the selected year for ALL company employees
      //    (using the stored allCompanyEmployees list)
      const allDosesPromises = allCompanyEmployees.map(async (emp) => {
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
          if (data.month && data.day && !isNaN(doseValue)) {
            // Ensure day exists too
            empDoses.push({
              employeeId: emp.id,
              employeeName: emp.name, // Use name from allCompanyEmployees
              month: data.month,
              day: data.day,
              dose: doseValue,
            });
          }
        });
        return empDoses;
      });

      const allDosesArrays = await Promise.all(allDosesPromises);
      const flatDoses = allDosesArrays.flat();

      // 3. Structure data for HTML table (using allCompanyEmployees)
      const monthlyEmployeeDoses = {}; // { month: { employeeId: { name, days: {day: dose}, monthlyTotal } } }

      // Initialize structure for ALL employees for ALL months
      allCompanyEmployees.forEach((emp) => {
        for (let month = 1; month <= 12; month++) {
          if (!monthlyEmployeeDoses[month]) {
            monthlyEmployeeDoses[month] = {};
          }
          monthlyEmployeeDoses[month][emp.id] = {
            name: emp.name,
            days: {},
            monthlyTotal: 0,
          };
        }
      });

      // Populate with actual doses
      flatDoses.forEach((dose) => {
        const { employeeId, month, day, dose: doseValue } = dose;
        // Ensure data is valid before trying to access/add
        if (
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31 &&
          monthlyEmployeeDoses[month] &&
          monthlyEmployeeDoses[month][employeeId]
        ) {
          if (!monthlyEmployeeDoses[month][employeeId].days[day]) {
            monthlyEmployeeDoses[month][employeeId].days[day] = 0;
          }
          monthlyEmployeeDoses[month][employeeId].days[day] += doseValue;
          monthlyEmployeeDoses[month][employeeId].monthlyTotal += doseValue;
        }
      });

      // 4. Generate HTML Table (Iterating through allCompanyEmployees)
      let tableHtml = "";
      const totalColumns = 33; // 1 (Nombre) + 31 (Días) + 1 (Total)

      for (let month = 1; month <= 12; month++) {
        tableHtml += `<tr class="month-header-row"><td colspan="${totalColumns}">${monthNames[month - 1]}</td></tr>`;

        // Iterate through the canonical list of ALL company employees
        allCompanyEmployees.forEach((emp) => {
          // Get the pre-structured data for this employee and month
          const employeeData = monthlyEmployeeDoses[month]?.[emp.id];

          // Safety check - should always exist due to initialization, but good practice
          if (!employeeData) {
            console.warn(
              `Missing expected data structure for employee ${emp.id} in month ${month}`,
            );
            // Optionally render a row indicating missing data or skip
            tableHtml += `<tr><td class="employee-name">${emp.name}</td><td colspan="32">Data Error</td></tr>`; // Example error row
            return; // Skip this employee for this month if structure is missing
          }

          let rowHtml = `<tr><td class="employee-name">${emp.name}</td>`;
          let calculatedMonthlyTotal = 0; // Use the pre-calculated total

          // Generate cells for 31 days
          for (let day = 1; day <= 31; day++) {
            const dailyDose = employeeData.days?.[day] || 0;
            // No need to recalculate total here, use employeeData.monthlyTotal

            const cellContent = dailyDose > 0 ? dailyDose.toFixed(2) : "";
            rowHtml += `<td class="dose-value">${cellContent}</td>`;
          }

          // Add total cell using the pre-calculated monthlyTotal
          const formattedTotal = employeeData.monthlyTotal.toFixed(2);
          const totalCellContentWithUnit = `${formattedTotal} μSv`;
          rowHtml += `<td class="dose-total">${totalCellContentWithUnit}</td></tr>`;

          tableHtml += rowHtml;
        });
      }

      // 5. Construct Full HTML Content (CSS etc. remains the same)
      const htmlContent = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            /* Basic styling, adjust as needed */
            body { font-family: 'Helvetica', sans-serif; font-size: 8px; }
            .header-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 5px; }
            .header-subtitle { font-size: 12px; font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 15px; padding: 0 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 3px; text-align: center; vertical-align: middle;}
            th { background-color: #e9e9e9; font-weight: bold; font-size: 8px; }
            .month-header-row td { background-color: #d0d0d0; font-weight: bold; font-size: 10px; text-align: left; padding-left: 10px; border-top: 2px solid #555; border-bottom: 1px solid #aaa; }
            td.employee-name { text-align: left; font-size: 9px; font-weight: normal; background-color: #f8f8f8; } /* Added background for clarity */
            td.dose-value { text-align: right; font-size: 9px; font-weight: normal;}
            td.dose-total { text-align: right; font-size: 9px; font-weight: bold; background-color: #f0f0f0; } /* Added background for clarity */
          </style>
        </head>
        <body>
          <div class="header-title">${companyName}</div>
          <div class="header-subtitle">
             <span>${t("employeesAgenda.pdf.title")}</span>
             <span>${t("employeesAgenda.pdf.year")}: ${selectedYear}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">${t("employeesAgenda.pdf.table.employeeHeader")}</th>
                ${Array.from({ length: 31 }, (_, i) => `<th style="width: 2%;">${i + 1}</th>`).join("")}
                <th style="width: 7%;">${t("employeesAgenda.pdf.table.totalHeader")}</th>
              </tr>
            </thead>
            <tbody>
              ${tableHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      // 6. Configure PDF Options
      const fileName = `AnnualDoseReport_${companyName.replace(/\s+/g, "_")}_${selectedYear}`; // Replace whitespace
      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === "android" ? "Download" : "Documents", // Use 'Download' for Android consistency
        width: 1123, // A3 landscape width in points
        height: 794, // A3 landscape height in points
      };

      // 7. Generate PDF
      console.log("generatePdf: Calling RNHTMLtoPDF.convert...");
      const pdfFile = await RNHTMLtoPDF.convert(options);
      console.log("generatePdf: PDF generated:", pdfFile.filePath);

      // 8. Share PDF
      const fileUri =
        Platform.OS === "android"
          ? `file://${pdfFile.filePath}`
          : pdfFile.filePath;

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t("pdf.shareErrorTitle"), t("pdf.shareErrorMsg"));
        setIsGeneratingPdf(false);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: t("pdf.shareDialogTitle"),
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

      {/* Selectors */}
      <View style={styles.selectorContainer}>
        {/* Year Selector */}
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>
            {t("employeesAgenda.selectYear")}
          </Text>
          {isLoadingYears ? (
            <ActivityIndicator
              size="small"
              color="#FF9300"
              style={{ flex: 1 }}
            />
          ) : (
            <Picker
              selectedValue={selectedYear}
              onValueChange={(itemValue) => {
                if (itemValue !== selectedYear) {
                  // Prevent unnecessary updates
                  setSelectedYear(itemValue);
                  setSelectedEmployeeId(null); // Reset employee when year changes
                  setFilteredEmployees([]); // Clear employee list immediately
                }
              }}
              style={styles.picker}
              enabled={!isLoadingYears}
            >
              <Picker.Item
                label={t("employeesAgenda.employee.placeholder")}
                value={null}
              />
              {allAvailableYears.map((year) => (
                <Picker.Item key={year} label={year.toString()} value={year} />
              ))}
            </Picker>
          )}
        </View>

        {/* Employee Selector (conditional) */}
        {selectedYear && ( // Only show if a year is selected
          <View style={styles.pickerWrapper}>
            <Text style={styles.pickerLabel}>
              {t("employeesAgenda.selectEmployee")}
            </Text>
            {isLoadingEmployees ? (
              <ActivityIndicator
                size="small"
                color="#FF9300"
                style={{ flex: 1 }}
              />
            ) : (
              <Picker
                selectedValue={selectedEmployeeId}
                onValueChange={(itemValue) => setSelectedEmployeeId(itemValue)}
                style={styles.picker}
                enabled={!isLoadingEmployees && filteredEmployees.length > 0}
              >
                <Picker.Item
                  label={t("employeesAgenda.employee.placeholder")}
                  value={null}
                />
                {filteredEmployees.map((emp) => (
                  <Picker.Item key={emp.id} label={emp.name} value={emp.id} />
                ))}
              </Picker>
            )}
            {/* Optional: Message if no employees found for the year */}
            {!isLoadingEmployees &&
              filteredEmployees.length === 0 &&
              selectedYear && (
                <Text style={styles.noDataTextSmall}>
                  {t("employeesAgenda.noEmployeesForYear")}
                </Text>
              )}
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
                  onPress={() => handleViewDetails(item.month)}
                >
                  <Ionicons name="eye" size={22} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))
        )}
      </ScrollView>

      {selectedYear && ( // <-- CAMBIO: Mostrar si hay un año seleccionado
        <View style={styles.summaryContainer}>
          <View style={styles.annualDoseContainer}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.annualDoseText}>
                {/* Cambiar título si se prefiere "Dosis Anual Compañía" o similar */}
                {t("employeesAgenda.annualDose.title")}
              </Text>
            </View>
            {/* Mostrar carga o el total calculado */}
            {
              // Si no hay empleado seleccionado Y se está cargando el total de la compañía
              !selectedEmployeeId && isLoadingCompanyTotal ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : // Si SÍ hay empleado seleccionado Y se están cargando sus dosis
              selectedEmployeeId && isLoadingDoses ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                // Si no está cargando, mostrar el valor correspondiente
                <View style={styles.annualDoseContainerText}>
                  <Text style={styles.annualDoseValue}>
                    {
                      selectedEmployeeId
                        ? `${totalAnnualDose.toFixed(2)} μSv` // Valor del empleado
                        : `${companyTotalAnnualDose.toFixed(2)} μSv` // Valor de la compañía
                    }
                  </Text>
                </View>
              )
            }
          </View>
          <TouchableOpacity
            style={[
              styles.downloadButton,
              // Deshabilitado si genera PDF, si no hay año, o si no hay empleados en la compañía (para el contexto del PDF)
              (isGeneratingPdf ||
                !selectedYear ||
                !allCompanyEmployees ||
                allCompanyEmployees.length === 0) &&
                styles.downloadButtonDisabled,
            ]}
            onPress={generatePdf}
            disabled={
              isGeneratingPdf ||
              !selectedYear ||
              !allCompanyEmployees ||
              allCompanyEmployees.length === 0
            }
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
      )}

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
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: "center",
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

  selectorContainer: {
    padding: 16,
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 10,
    marginBottom: 12, // Spacing between pickers
    minHeight: 50, // Ensure consistent height
  },
  pickerLabel: {
    fontSize: 16, // Slightly smaller label
    fontWeight: "bold",
    marginRight: 10,
    color: "#555",
  },
  picker: {
    flex: 1,
    height: 50, // Explicit height for Android consistency
  },
});
