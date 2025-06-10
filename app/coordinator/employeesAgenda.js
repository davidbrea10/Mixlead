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
  Dimensions,
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
  limit,
  collectionGroup,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { t } from "i18next"; // Import t function for translation
import RNHTMLtoPDF from "react-native-html-to-pdf";
import * as Sharing from "expo-sharing";
import RNPickerSelect from "react-native-picker-select";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

// --- Helper function to get distinct years from all doses of a company ---
// NOTE: This performs a potentially large read. Consider optimizing
// if performance becomes an issue (e.g., using Cloud Functions to maintain a list).
const getAllYearsWithDoses = async (companyId, t) => {
  // Pasamos 't' para traducciones
  const years = new Set();
  try {
    console.log(
      `getAllYearsWithDoses: Querying 'employees' in company ${companyId}`,
    );
    // 1. Get all employees of the company
    const employeesInCompanyRef = collection(
      db,
      "companies",
      companyId,
      "employees",
    );
    const usersSnapshot = await getDocs(employeesInCompanyRef); // No se necesita query aquí si quieres todos
    const employeeIds = usersSnapshot.docs.map((doc) => doc.id);

    if (employeeIds.length === 0) {
      console.log("getAllYearsWithDoses: No employees found for company.");
      return [new Date().getFullYear()];
    }

    // 2. Fetch doses for each employee and collect years
    const dosePromises = employeeIds.map((empId) => {
      // --- MODIFICACIÓN DE RUTA ---
      const dosesRef = collection(
        db,
        "companies",
        companyId,
        "employees",
        empId,
        "doses",
      );
      // --- FIN MODIFICACIÓN ---
      return getDocs(dosesRef);
    });
    const doseSnapshots = await Promise.all(dosePromises);

    doseSnapshots.forEach((snapshot) => {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.year && !isNaN(parseInt(data.year, 10))) {
          // Asegurar que sea un número
          years.add(parseInt(data.year, 10));
        }
      });
    });
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  } catch (error) {
    console.error("Error fetching all available years:", error);
    Alert.alert(
      t("errors.error"),
      t("errors.loadYearsFailed") + `: ${error.message}`,
    );
    return [new Date().getFullYear()];
  }
};

// --- Helper function to get employees who have doses in a specific year ---
const getEmployeesWithDosesInYear = async (companyId, year, t) => {
  try {
    console.log(
      `getEmployeesWithDosesInYear: Querying employees in company ${companyId} for year ${year}`,
    );
    // 1. Get all employees of the company
    const employeesInCompanyRef = collection(
      db,
      "companies",
      companyId,
      "employees",
    );
    const usersSnapshot = await getDocs(employeesInCompanyRef); // No se necesita query aquí

    if (usersSnapshot.empty) return [];

    // 2. For each employee, check if they have any dose in the specified year
    const employeeCheckPromises = usersSnapshot.docs.map(async (empDoc) => {
      const empId = empDoc.id;
      const empData = empDoc.data();
      // --- MODIFICACIÓN DE RUTA ---
      const dosesRef = collection(
        db,
        "companies",
        companyId,
        "employees",
        empId,
        "doses",
      );
      // --- FIN MODIFICACIÓN ---
      const yearQuery = query(dosesRef, where("year", "==", year), limit(1));
      const yearDoseSnapshot = await getDocs(yearQuery);
      if (!yearDoseSnapshot.empty) {
        return {
          id: empId,
          name:
            `${empData.firstName || ""} ${empData.lastName || ""}`.trim() ||
            t("employeesAgenda.employee.unnamed"),
        };
      }
      return null;
    });
    const results = await Promise.all(employeeCheckPromises);
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
    return [];
  }
};

const calculateCompanyTotalDoseForYear = async (companyId, year, t) => {
  let totalDose = 0;
  try {
    console.log(
      `calculateCompanyTotalDoseForYear: Calculating for company ${companyId}, year ${year}`,
    );
    // 1. Get all employees of the company
    const employeesInCompanyRef = collection(
      db,
      "companies",
      companyId,
      "employees",
    );
    const usersSnapshot = await getDocs(employeesInCompanyRef); // No se necesita query
    const employeeIds = usersSnapshot.docs.map((doc) => doc.id);

    if (employeeIds.length === 0) return 0;

    // 2. For each employee, get their doses for the year and sum them
    const dosePromises = employeeIds.map(async (empId) => {
      // --- MODIFICACIÓN DE RUTA ---
      const dosesRef = collection(
        db,
        "companies",
        companyId,
        "employees",
        empId,
        "doses",
      );
      // --- FIN MODIFICACIÓN ---
      const yearQuery = query(dosesRef, where("year", "==", year));
      const doseSnapshot = await getDocs(yearQuery);
      let employeeYearlyDose = 0;
      doseSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const doseValue =
          typeof data.dose === "number"
            ? data.dose
            : parseFloat(data.dose || 0);
        if (!isNaN(doseValue)) employeeYearlyDose += doseValue;
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

  const insets = useSafeAreaInsets();

  // Store companyId to avoid fetching it repeatedly
  const companyIdRef = useRef(null);

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`employeesAgenda.months.${i + 1}`),
  );

  const yearItems = allAvailableYears.map((year) => ({
    label: year.toString(),
    value: year,
  }));
  // Formatea los empleados para la librería
  const employeeItems = filteredEmployees.map((emp) => ({
    label: emp.name,
    value: emp.id,
  }));

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
          `loadInitialData: Fetching coordinator's (email: ${user.email}) companyId...`,
        );
        const employeesGroupRef = collectionGroup(db, "employees");
        const coordQuery = query(
          employeesGroupRef,
          where("email", "==", user.email),
          limit(1),
        );
        const coordinatorSnapshot = await getDocs(coordQuery);

        if (
          coordinatorSnapshot.empty ||
          !coordinatorSnapshot.docs[0].data().companyId
        ) {
          console.error(
            "loadInitialData: Coordinator doc not found or missing companyId.",
          );
          Alert.alert(t("errors.error"), t("errors.companyIdMissing"));
          setIsLoadingYears(false);
          return;
        }

        const coordinatorData = coordinatorSnapshot.docs[0].data();
        const fetchedCompanyId = coordinatorData.companyId;
        const userRole = coordinatorData.role; // Check role for permissions
        companyIdRef.current = fetchedCompanyId;

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
        const years = await getAllYearsWithDoses(fetchedCompanyId, t); // Pasar 't' a la helper function
        setAllAvailableYears(years);
        if (years.length > 0)
          setSelectedYear(null); // No auto-seleccionar
        else setSelectedYear(new Date().getFullYear());

        // Also load all employees initially IF needed elsewhere (like PDF)
        // If only needed for filtering, this can be skipped or done within the filtering function
        const employeesInCompanyRef = collection(
          db,
          "companies",
          fetchedCompanyId,
          "employees",
        );
        // --- FIN MODIFICACIÓN ---
        const usersSnapshot = await getDocs(employeesInCompanyRef);
        const companyEmployees = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            name:
              `${doc.data().firstName || ""} ${doc.data().lastName || ""}`.trim() ||
              t("employeesAgenda.employee.unnamed"),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAllCompanyEmployees(companyEmployees);
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
        /* ... (resetear estados) ... */
        setFilteredEmployees([]);
        setSelectedEmployeeId(null);
        setMonthlyDoses([]);
        setCompanyTotalAnnualDose(0);
        setTotalAnnualDose(0);
        return;
      }
      setIsLoadingEmployees(true);
      setIsLoadingCompanyTotal(true);
      setFilteredEmployees([]);
      setSelectedEmployeeId(null);
      setMonthlyDoses([]);
      setCompanyTotalAnnualDose(0);
      setTotalAnnualDose(0);
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
        /* ... (manejo de error) ... */
      } finally {
        setIsLoadingEmployees(false);
        setIsLoadingCompanyTotal(false);
      }
    };
    updateDataForYear();
  }, [selectedYear, t]); // 't' por si las helpers lo usan para errores

  // 3. Load Doses when Employee Changes (and year is already selected)
  useEffect(() => {
    const loadDoses = async () => {
      if (selectedEmployeeId && selectedYear && companyIdRef.current) {
        // <-- AÑADIR companyIdRef.current
        console.log(
          `Loading doses for employee: ${selectedEmployeeId}, year: ${selectedYear}, company: ${companyIdRef.current}`,
        );
        setIsLoadingDoses(true);
        setMonthlyDoses([]);
        setTotalAnnualDose(0);
        try {
          // --- MODIFICACIÓN DE RUTA ---
          const dosesRef = collection(
            db,
            "companies",
            companyIdRef.current,
            "employees",
            selectedEmployeeId,
            "doses",
          );
          // --- FIN MODIFICACIÓN ---
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
    if (
      !selectedEmployeeId ||
      !selectedYear ||
      !month ||
      !companyIdRef.current
    ) {
      // <-- AÑADIR companyIdRef.current
      console.warn("handleViewDetails called without necessary parameters.");
      return;
    }
    router.push({
      pathname: "/coordinator/doseDetails/[doseDetails]",
      params: {
        // uid: selectedEmployeeId, // Cambiado a employeeId para consistencia
        employeeId: selectedEmployeeId,
        companyId: companyIdRef.current, // <-- PASAR EL COMPANY ID
        month: month.toString(),
        year: selectedYear.toString(),
      },
    });
  };

  // --- PDF Generation (Requires allCompanyEmployees state) ---
  const generatePdf = async () => {
    if (isGeneratingPdf) return;
    if (!selectedYear) {
      Alert.alert(
        t("errors.error"),
        t("employeesAgenda.pdf.errorNoYearSelected"), // More specific error
      );
      return;
    }

    // Check for company context if generating company report
    if (
      !selectedEmployeeId && // Only check this if generating company report
      (!allCompanyEmployees || allCompanyEmployees.length === 0)
    ) {
      Alert.alert(
        t("errors.error"),
        t("employeesAgenda.pdf.errorNoEmployeesInCompany"),
      );
      return;
    }

    setIsGeneratingPdf(true);

    const user = auth.currentUser;
    if (!user || !companyIdRef.current) {
      Alert.alert(t("errors.error"), t("errors.notLoggedInOrNoCompany"));
      setIsGeneratingPdf(false);
      return;
    }

    try {
      // --- Common Setup ---
      let companyName = t("pdf.unknownCompany"); // Nombre de la compañía del coordinador
      const companyDocRef = doc(db, "companies", companyIdRef.current);
      const companyDocSnap = await getDoc(companyDocRef);
      if (companyDocSnap.exists())
        companyName =
          companyDocSnap.data().Name ||
          companyDocSnap.data().name ||
          companyName;

      let htmlContent = "";
      let pdfFileName = "";
      const pdfOptionsBase = {
        directory: Platform.OS === "android" ? "Download" : "Documents",
        width: 1123, // A3 landscape width
        height: 794, // A3 landscape height
      };

      // --- Branch Logic: Employee vs Company ---
      if (selectedEmployeeId) {
        // --- Generate PDF for SELECTED EMPLOYEE ---

        // 1. Get Selected Employee's Name
        const selectedEmployee = filteredEmployees.find(
          (emp) => emp.id === selectedEmployeeId,
        );
        const employeeName = selectedEmployee
          ? selectedEmployee.name
          : t("pdf.unknownEmployee");

        // 2. Fetch Employee's DAILY Doses for the selected year
        const dosesRef = collection(
          db,
          "companies",
          companyIdRef.current,
          "employees",
          selectedEmployeeId,
          "doses",
        );

        const q = query(dosesRef, where("year", "==", selectedYear));
        const snapshot = await getDocs(q);
        const dailyDoses = []; // Array of { month, day, dose }
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const doseValue =
            typeof data.dose === "number"
              ? data.dose
              : parseFloat(data.dose || 0);
          if (data.month && data.day && !isNaN(doseValue)) {
            dailyDoses.push({
              month: data.month,
              day: data.day,
              dose: doseValue,
            });
          }
        });

        // 3. Structure data for HTML (single employee)
        const monthlyEmployeeDoses = {}; // { month: { days: {day: dose}, monthlyTotal } }
        // Initialize structure for the employee for ALL months
        for (let month = 1; month <= 12; month++) {
          monthlyEmployeeDoses[month] = {
            days: {},
            monthlyTotal: 0,
          };
        }
        // Populate with actual doses
        let overallTotalDose = 0;
        dailyDoses.forEach((dose) => {
          const { month, day, dose: doseValue } = dose;
          if (
            month >= 1 &&
            month <= 12 &&
            day >= 1 &&
            day <= 31 &&
            monthlyEmployeeDoses[month]
          ) {
            if (!monthlyEmployeeDoses[month].days[day]) {
              monthlyEmployeeDoses[month].days[day] = 0;
            }
            monthlyEmployeeDoses[month].days[day] += doseValue;
            monthlyEmployeeDoses[month].monthlyTotal += doseValue;
            overallTotalDose += doseValue; // Accumulate overall total
          }
        });

        // 4. Generate HTML Table (single employee)
        let tableHtml = "";
        const totalColumns = 33; // 1 (Mes) + 31 (Días) + 1 (Total)

        for (let month = 1; month <= 12; month++) {
          const monthData = monthlyEmployeeDoses[month];
          let rowHtml = `<tr><td class="month-name">${monthNames[month - 1]}</td>`; // Month name column

          // Generate cells for 31 days
          for (let day = 1; day <= 31; day++) {
            const dailyDose = monthData.days?.[day] || 0;
            const cellContent = dailyDose > 0 ? dailyDose.toFixed(2) : "";
            rowHtml += `<td class="dose-value">${cellContent}</td>`;
          }

          // Add monthly total cell
          const formattedTotal = monthData.monthlyTotal.toFixed(2);
          rowHtml += `<td class="dose-total">${formattedTotal} μSv</td></tr>`;

          tableHtml += rowHtml;
        }

        // 5. Construct Full HTML for Employee Report
        pdfFileName = `EmployeeDoseReport_${employeeName.replace(/\s+/g, "_")}_${selectedYear}`;
        htmlContent = `
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              /* Similar styles, adjust if needed */
              body { font-family: 'Helvetica', sans-serif; font-size: 8px; }
              .header-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 5px; }
              .header-subtitle { font-size: 12px; font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 15px; padding: 0 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ccc; padding: 3px; text-align: center; vertical-align: middle;}
              th { background-color: #e9e9e9; font-weight: bold; font-size: 8px; }
              td.month-name { text-align: left; font-size: 9px; font-weight: bold; background-color: #f8f8f8; }
              td.dose-value { text-align: right; font-size: 9px; font-weight: normal;}
              td.dose-total { text-align: right; font-size: 9px; font-weight: bold; background-color: #f0f0f0; }
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
                  <th style="width: 15%;">${t("employeesAgenda.pdf.table.monthHeader")}</th>
                  ${Array.from({ length: 31 }, (_, i) => `<th style="width: 2%;">${i + 1}</th>`).join("")}
                  <th style="width: 7%;">${t("employeesAgenda.pdf.table.totalHeader")}</th>
                </tr>
              </thead>
              <tbody>
                ${tableHtml}
              </tbody>
            </table>
            <div class="footer-total">
                ${t("employeesAgenda.pdf.annualTotalLabel")} ${overallTotalDose.toFixed(2)} μSv
            </div>
          </body>
          </html>
        `;
      } else {
        // --- Generate PDF for ENTIRE COMPANY (Existing Logic) ---

        // 1. Fetch all doses for the selected year for ALL company employees
        //    (using the stored allCompanyEmployees list)
        const allDosesPromises = allCompanyEmployees.map(async (emp) => {
          // --- MODIFICACIÓN DE RUTA ---
          const dosesRef = collection(
            db,
            "companies",
            companyIdRef.current,
            "employees",
            emp.id,
            "doses",
          );

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
              empDoses.push({
                employeeId: emp.id,
                employeeName: emp.name,
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

        // 2. Structure data for HTML table (using allCompanyEmployees)
        const monthlyEmployeeDoses = {};
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
        flatDoses.forEach((dose) => {
          const { employeeId, month, day, dose: doseValue } = dose;
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

        // 3. Generate HTML Table (Company)
        let tableHtml = "";
        const totalColumns = 33; // 1 (Nombre) + 31 (Días) + 1 (Total)

        for (let month = 1; month <= 12; month++) {
          tableHtml += `<tr class="month-header-row"><td colspan="${totalColumns}">${monthNames[month - 1]}</td></tr>`;
          allCompanyEmployees.forEach((emp) => {
            const employeeData = monthlyEmployeeDoses[month]?.[emp.id];
            if (!employeeData) {
              tableHtml += `<tr><td class="employee-name">${emp.name}</td><td colspan="32">Data Error</td></tr>`;
              return;
            }
            let rowHtml = `<tr><td class="employee-name">${emp.name}</td>`;
            for (let day = 1; day <= 31; day++) {
              const dailyDose = employeeData.days?.[day] || 0;
              const cellContent = dailyDose > 0 ? dailyDose.toFixed(2) : "";
              rowHtml += `<td class="dose-value">${cellContent}</td>`;
            }
            const formattedTotal = employeeData.monthlyTotal.toFixed(2);
            rowHtml += `<td class="dose-total">${formattedTotal} μSv</td></tr>`;
            tableHtml += rowHtml;
          });
        }

        // 4. Construct Full HTML Content (Company)
        pdfFileName = `CompanyDoseReport_${companyName.replace(/\s+/g, "_")}_${selectedYear}`;
        htmlContent = `
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              /* Styles for Company Report */
              body { font-family: 'Helvetica', sans-serif; font-size: 8px; }
              .header-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 5px; }
              .header-subtitle { font-size: 12px; font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 15px; padding: 0 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ccc; padding: 3px; text-align: center; vertical-align: middle;}
              th { background-color: #e9e9e9; font-weight: bold; font-size: 8px; }
              .month-header-row td { background-color: #d0d0d0; font-weight: bold; font-size: 10px; text-align: left; padding-left: 10px; border-top: 2px solid #555; border-bottom: 1px solid #aaa; }
              td.employee-name { text-align: left; font-size: 9px; font-weight: normal; background-color: #f8f8f8; }
              td.dose-value { text-align: right; font-size: 9px; font-weight: normal;}
              td.dose-total { text-align: right; font-size: 9px; font-weight: bold; background-color: #f0f0f0; }
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
      }

      // --- Common PDF Generation & Sharing ---
      const options = {
        ...pdfOptionsBase,
        html: htmlContent,
        fileName: pdfFileName,
      };

      console.log("generatePdf: Calling RNHTMLtoPDF.convert...");
      const pdfFile = await RNHTMLtoPDF.convert(options);
      console.log("generatePdf: PDF generated:", pdfFile.filePath);

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
          paddingTop: insets.top + 15,
        }}
      >
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
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
            {t("employeesAgenda.header.title")}
          </Text>
        </View>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
      </View>

      {/* Selectors */}
      <View style={styles.selectorContainer}>
        {/* Year Selector con RNPickerSelect */}
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>
            {t("employeesAgenda.selectYear")}
          </Text>
          <View style={{ flex: 1 }}>
            {/* Contenedor para que RNPickerSelect se expanda */}
            <RNPickerSelect
              onValueChange={(value) => {
                if (value !== selectedYear) {
                  setSelectedYear(value);
                  setSelectedEmployeeId(null);
                  setFilteredEmployees([]);
                }
              }}
              items={yearItems}
              value={selectedYear}
              placeholder={{
                label: t("employeesAgenda.employee.placeholder"),
                value: null,
              }}
              placeholderTextColor={"gray"}
              style={pickerSelectStyles} // Usa un objeto de estilos específico para RNPickerSelect
              useNativeAndroidPickerStyle={false} // Para poder estilizar en Android también
              Icon={() => {
                // Opcional: Añade un icono de flecha
                return (
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color="gray"
                    style={{ paddingRight: 10 }}
                  />
                );
              }}
            />
          </View>
        </View>

        {/* Employee Selector (conditional) */}
        {/* Employee Selector con RNPickerSelect */}
        {selectedYear && (
          <View style={styles.pickerWrapper}>
            <Text style={styles.pickerLabel}>
              {t("employeesAgenda.selectEmployee")}
            </Text>
            <View style={{ flex: 1 }}>
              <RNPickerSelect
                onValueChange={(value) => setSelectedEmployeeId(value)}
                items={employeeItems}
                value={selectedEmployeeId}
                placeholder={{
                  label: t("employeesAgenda.employee.placeholder"),
                  value: null,
                }}
                placeholderTextColor={"gray"}
                style={pickerSelectStyles}
                disabled={isLoadingEmployees || filteredEmployees.length === 0}
                useNativeAndroidPickerStyle={false}
                Icon={() => {
                  return (
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color="gray"
                      style={{ paddingRight: 10 }}
                    />
                  );
                }}
              />
            </View>
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
              // Disable if: generating PDF OR no year selected OR (generating company PDF AND no employees exist)
              (isGeneratingPdf ||
                !selectedYear ||
                (!selectedEmployeeId &&
                  (!allCompanyEmployees ||
                    allCompanyEmployees.length === 0))) &&
                styles.downloadButtonDisabled,
            ]}
            onPress={generatePdf}
            disabled={
              isGeneratingPdf ||
              !selectedYear ||
              (!selectedEmployeeId &&
                (!allCompanyEmployees || allCompanyEmployees.length === 0))
            }
          >
            {isGeneratingPdf ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.downloadButtonText}>
                {/* --- DYNAMIC BUTTON TEXT --- */}
                {
                  selectedEmployeeId
                    ? t("employeesAgenda.annualDose.downloadEmployee") // Text for employee PDF
                    : t("employeesAgenda.annualDose.downloadCompany") // Text for company PDF (use a distinct key)
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
          paddingTop: insets.bottom + 40,
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
    marginBottom: 12,
    // minHeight: 50, // <-- Comenta o elimina esto
    height: 60, // <-- Establece una altura fija (ajusta el valor 60 según necesites)
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
    color: "#555",
    // Podrías necesitar ajustar un poco el alineamiento si la etiqueta y el picker
    // no quedan perfectamente centrados verticalmente uno respecto al otro.
    // textAlignVertical: 'center', // Funciona mejor en Android
  },
  pickerInnerWrapper: {
    flex: 1, // Sigue tomando el espacio horizontal
    // Añadimos overflow: 'hidden' para intentar prevenir que el picker se desborde visualmente
    // aunque la altura fija en pickerWrapper es la clave.
    overflow: "hidden",
    // Puedes intentar centrar el contenido si es necesario, aunque alignItems en el padre ayuda
    // justifyContent: 'center',
    // backgroundColor: 'lightcoral', // Temporal para debug
  },
  picker: {
    width: "100%", // Ocupa el ancho del inner wrapper
    // ¡SIN height FIJA aquí!
    // ¡SIN flex: 1 aquí!
    // backgroundColor: 'lightblue', // Temporal para debug
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    // borderWidth: 1, // Good, keep commented if pickerWrapper handles border
    // borderColor: 'gray',
    // borderRadius: 4,
    color: "black", // <--- THIS IS CORRECT. Ensure it's not commented out.
    paddingRight: 30, // to ensure text doesn't overlap icon
    // backgroundColor: 'white', // Can sometimes help, but usually not needed if wrapper is white
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    // borderWidth: 0.5,
    // borderColor: 'purple',
    // borderRadius: 8,
    color: "black", // Make sure Android text is also black
    paddingRight: 30,
    // backgroundColor: 'white',
  },
  placeholder: {
    color: "gray", // Placeholder style is separate
  },
  iconContainer: {
    top: "50%",
    marginTop: -10, // Adjust vertical centering if needed based on icon size
    right: 15,
  },
});
