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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import DropDownPicker from "react-native-dropdown-picker";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companiesSnapshot = await getDocs(collection(db, "companies"));
        const companiesList = companiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.data().Name || "Nombre no disponible",
        }));

        companiesList.sort((a, b) => a.name.localeCompare(b.name));

        setCompanies(companiesList);
        setCompanyOptions([
          { label: "All", value: null },
          { label: "Without company", value: "none" },
          ...companiesList.map((c) => ({ label: c.name, value: c.id })),
        ]);

        const employeesSnapshot = await getDocs(collection(db, "employees"));
        const employeesList = employeesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const company = companiesList.find((c) => c.id === data.companyId);
            const fullName =
              `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
              "Nombre no disponible";

            return {
              id: doc.id,
              name: fullName,
              companyName: company ? company.name : "Without company",
              companyId: data.companyId || null,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setEmployees(employeesList);
        setFilteredEmployees(employeesList);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const handleFilterCompany = (companyId) => {
    setSelectedCompany(companyId);
    filterEmployees(searchText, companyId);
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
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
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
          Employees
        </Text>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
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
        placeholder="Select a company"
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
          placeholder="Search"
          value={searchText}
          onChangeText={handleSearch}
          style={{ flex: 1, fontSize: 16 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size={50}
          color="#FF8C00"
          style={{ marginTop: 20 }}
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
                  <Text style={{ fontWeight: "bold" }}>Company:</Text>{" "}
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
