import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "../../firebase/config";
import DropDownPicker from "react-native-dropdown-picker";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function EmployeesScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Obtener Compañías
        const companiesSnapshot = await getDocs(collection(db, "companies"));
        const companiesList = companiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          name:
            doc.data().Name ||
            doc.data().name ||
            t("common.nameNotAvailable", "Nombre no disponible"),
          // Podrías añadir aquí un campo para identificar "No Company" si lo tienes en Firestore
          // por ejemplo, isNoCompanyPlaceholder: doc.data().isNoCompanyPlaceholder || false
        }));
        companiesList.sort((a, b) => a.name.localeCompare(b.name));
        setCompanies(companiesList);

        // Identificar el ID de "No Company"
        // AJUSTA "No Company" AL NOMBRE REAL O IDENTIFICADOR DE TU "No Company" EN FIRESTORE
        const noCompanyEntity = companiesList.find(
          (c) => c.name === "No Company",
        ); // O el criterio que uses para identificarla
        const actualNoCompanyId = noCompanyEntity ? noCompanyEntity.id : null;
        if (actualNoCompanyId) {
          console.log(
            "Actual 'No Company' ID identified as:",
            actualNoCompanyId,
          );
        } else {
          console.warn(
            "'No Company' entity not found in companiesList. Display logic might be affected.",
          );
        }

        // Crear opciones para el DropDownPicker
        setCompanyOptions([
          { label: t("employees.filterAll"), value: null },
          { label: t("employees.withoutCompany"), value: "none" }, // Para filtrar empleados con companyId nulo/vacío
          ...companiesList
            // Opcional: Excluir "No Company" del filtro si se maneja por "none"
            // .filter(c => c.id !== actualNoCompanyId)
            .map((c) => ({ label: c.name, value: c.id })),
        ]);

        // 2. Obtener TODOS los empleados usando Collection Group Query
        console.log("Fetching employees using collectionGroup...");
        const employeesQuery = collectionGroup(db, "employees");
        const employeesSnapshot = await getDocs(employeesQuery);
        console.log(
          `Found ${employeesSnapshot.size} total employee documents.`,
        );

        // 3. Mapear y Procesar Empleados
        const employeesList = employeesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const employeeId = doc.id;
            const companyIdFromEmployee = data.companyId || null; // ID almacenado en el empleado

            let displayCompanyName;

            if (companyIdFromEmployee === actualNoCompanyId) {
              // Si el empleado pertenece EXPLÍCITAMENTE a la entidad "No Company"
              displayCompanyName = t(
                "employees.withoutCompany",
                "Without company",
              );
            } else if (companyIdFromEmployee) {
              // Si tiene un companyId que NO es el de "No Company"
              const company = companiesList.find(
                (c) => c.id === companyIdFromEmployee,
              );
              displayCompanyName = company
                ? company.name
                : t("employees.withoutCompany", "Without company"); // Fallback si el ID es inválido o la compañía no está
            } else {
              // Si el companyId es null, undefined, o vacío
              displayCompanyName = t(
                "employees.withoutCompany",
                "Without company",
              );
            }

            const fullName =
              `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
              t("common.nameNotAvailable", "Nombre no disponible");

            return {
              id: employeeId,
              name: fullName,
              companyName: displayCompanyName, // Nombre de la compañía a mostrar
              companyId: companyIdFromEmployee, // ID de la compañía para filtrar (puede ser actualNoCompanyId o null)
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setEmployees(employeesList);
        setFilteredEmployees(employeesList);
      } catch (error) {
        console.error("Error fetching data for employees screen:", error);
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t(
            "errors.fetchDataError",
            "Could not load data. Please try again.",
          ),
          visibilityTime: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]); // 't' como dependencia

  const handleBack = () => {
    router.replace("/admin/home");
  };

  const handleHome = () => {
    router.replace("/admin/home");
  };

  const handleSearch = (text) => {
    setSearchText(text);
    filterEmployees(text, selectedCompany);
  };

  const filterEmployees = (text, companyId) => {
    let filtered = employees;

    if (companyId && companyId !== "none") {
      filtered = filtered.filter((emp) => emp.companyId === companyId);
    } else if (companyId === "none") {
      filtered = filtered.filter((emp) => !emp.companyId);
    }

    if (text.trim() !== "") {
      filtered = filtered.filter((emp) =>
        emp.name.toLowerCase().includes(text.toLowerCase()),
      );
    }

    setFilteredEmployees(filtered);
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
          marginBottom: 20,
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
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
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
          {t("employees.title")}
        </Text>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
      </View>

      <DropDownPicker
        open={dropdownOpen}
        value={selectedCompany}
        items={companyOptions}
        setOpen={setDropdownOpen}
        setValue={(callback) => {
          const value = callback(selectedCompany);
          setSelectedCompany(value);
          filterEmployees(searchText, value);
        }}
        setItems={setCompanyOptions}
        placeholder={t("employees.selectCompany")}
        placeholderTextColor={"gray"}
        containerStyle={{ marginTop: 10, marginHorizontal: 20, width: "90%" }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          padding: 8,
          borderRadius: 10,
          marginTop: 10,
          paddingHorizontal: 10,
          marginHorizontal: 20,
        }}
      >
        <Ionicons
          name="search"
          size={20}
          color="gray"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder={t("employees.searchPlaceholder")}
          placeholderTextColor={"gray"}
          value={searchText}
          onChangeText={handleSearch}
          style={{ flex: 1, fontSize: 16 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size={50}
          color="#FF8C00"
          style={{
            marginTop: 20,
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/employee/${item.id}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(4, 4, 4, 0.6)",
                borderColor: "white",
                borderWidth: 2,
                padding: 10,
                borderRadius: 10,
                marginTop: 10,
                marginHorizontal: 10,
              }}
            >
              {/* Imagen del empleado */}
              <Image
                source={require("../../assets/employee.png")} // Cambia a tu imagen predeterminada
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  marginRight: 15,
                  borderColor: "white",
                  borderWidth: 1,
                }}
              />

              {/* Información del empleado */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    color: "white",
                    fontWeight: "bold",
                    marginBottom: 5,
                  }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 14, color: "white" }}>
                  <Text style={{ fontWeight: "bold" }}>
                    {t("employees.companyLabel")}:
                  </Text>{" "}
                  {item.companyName}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          backgroundColor: "#006892",
          width: 70,
          height: 70,
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          marginBottom: 20,
        }}
        onPress={() => router.push("/admin/addEmployee")}
      >
        <Image
          source={require("../../assets/addEmployee.png")}
          style={{ width: 50, height: 50 }}
        />
      </TouchableOpacity>

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
