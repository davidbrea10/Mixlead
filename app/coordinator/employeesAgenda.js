import {
  View,
  Text,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next"; // Import i18n hook

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation(); // Initialize translation hook

  const [monthlyDoses, setMonthlyDoses] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [totalAnnualDose, setTotalAnnualDose] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      loadMonthlyDoses(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    calculateTotalAnnualDose();
  }, [monthlyDoses, selectedYear]);

  useEffect(() => {
    const loadEmployees = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const usersSnapshot = await getDocs(collection(db, "employees"));
        let currentUserCompanyId = null;

        usersSnapshot.forEach((doc) => {
          if (doc.id === user.uid) {
            currentUserCompanyId = doc.data().companyId;
          }
        });

        const filteredEmployees = [];
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.companyId === currentUserCompanyId) {
            filteredEmployees.push({
              id: doc.id,
              name:
                `${doc.data().firstName || ""} ${doc.data().lastName || ""}`.trim() ||
                t("employeesAgenda.employee.unnamed"),
            });
          }
        });

        setEmployees(filteredEmployees);
      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };

    loadEmployees();
  }, []);

  const loadMonthlyDoses = async (employeeId) => {
    try {
      const dosesRef = collection(db, "employees", employeeId, "doses");
      const snapshot = await getDocs(dosesRef);

      let doseData = {};
      let yearsSet = new Set();

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
          doseData[key].totalDose += data.dose;
        }
      });

      setAvailableYears([...yearsSet].sort((a, b) => a - b));
      setMonthlyDoses(Object.values(doseData));
    } catch (error) {
      console.error("Error loading monthly doses:", error);
    }
  };

  const calculateTotalAnnualDose = () => {
    const total = monthlyDoses
      .filter((item) => item.year === selectedYear)
      .reduce((sum, item) => sum + item.totalDose, 0);
    setTotalAnnualDose(total);
  };

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

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`employeesAgenda.months.${i + 1}`),
  );

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
        <TouchableOpacity style={styles.downloadButton} onPress={() => {}}>
          <Text style={styles.downloadButtonText}>
            {t("employeesAgenda.annualDose.download")}
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

const styles = {
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
};
