import React, { useState, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  query,
  where,
  collectionGroup,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function EmployeesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setIsLoading] = useState(true);
  const [coordinatorCompanyId, setCoordinatorCompanyId] = useState(null); // Para guardar el ID de la compañía del coordinador

  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser; // Obtener usuario actual al enfocar
      if (user) {
        fetchCoordinatorAndEmployeesData(user);
      } else {
        console.log("No user logged in on focus, redirecting to login.");
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.notLoggedIn"),
        });
        router.replace("/auth/login"); // O la ruta de login que uses
      }
    }, [router, t]), // Dependencias para useCallback
  );

  const fetchCoordinatorAndEmployeesData = async (currentUser) => {
    setIsLoading(true);
    setEmployees([]);
    setFilteredEmployees([]);
    setCoordinatorCompanyId(null); // Resetear

    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Obtener el companyId del coordinador actual
      console.log(
        `Workspaceing coordinator data (email: ${currentUser.email}) to get their companyId...`,
      );
      const employeesGroupRef = collectionGroup(db, "employees");
      const coordQuery = query(
        employeesGroupRef,
        where("email", "==", currentUser.email),
      );
      const coordSnapshot = await getDocs(coordQuery);

      let fetchedCoordinatorCompanyId = null;
      if (!coordSnapshot.empty) {
        const coordData = coordSnapshot.docs[0].data();
        fetchedCoordinatorCompanyId = coordData.companyId;
        if (fetchedCoordinatorCompanyId) {
          setCoordinatorCompanyId(fetchedCoordinatorCompanyId); // Guardar el ID para usarlo en la navegación
          console.log("Coordinator's companyId:", fetchedCoordinatorCompanyId);
        } else {
          console.error(
            t(
              "myEmployees.errors.coordinatorNoCompanyId",
              "El coordinador no tiene un ID de compañía asignado.",
            ),
          );
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle"),
            text2: t("myEmployees.errors.coordinatorNoCompanyId"),
          });
          setIsLoading(false);
          return;
        }
      } else {
        console.error(
          t(
            "myEmployees.errors.coordinatorDocNotFound",
            "Documento de coordinador no encontrado.",
          ),
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("myEmployees.errors.coordinatorDocNotFound"),
        });
        setIsLoading(false);
        return;
      }

      // 2. Obtener los empleados de la compañía del coordinador
      console.log(
        "Fetching employees for companyId:",
        fetchedCoordinatorCompanyId,
      );
      const employeesInCompanyRef = collection(
        db,
        "companies",
        fetchedCoordinatorCompanyId,
        "employees",
      );
      // No necesitamos un 'where' para companyId aquí, ya estamos en la subcolección correcta.
      // Podríamos filtrar por rol si solo queremos 'employee' y no otros coordinadores.
      // const employeesQuery = query(employeesInCompanyRef, where("role", "==", "employee"));
      const employeesSnapshot = await getDocs(employeesInCompanyRef); // Obtener todos en esa subcolección

      const employeesList = employeesSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name:
            `${doc.data().firstName || ""} ${doc.data().lastName || ""}`.trim() ||
            t("common.nameNotAvailable", "Nombre no disponible"),
          // Guardamos el companyId de cada empleado, debería ser el mismo que fetchedCoordinatorCompanyId
          companyId: doc.data().companyId || null,
          // Podrías añadir más datos si los necesitas para la lista, como el email o rol
          // email: doc.data().email,
          // role: doc.data().role,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setEmployees(employeesList);
      setFilteredEmployees(employeesList);
      console.log(
        `Loaded ${employeesList.length} employees from company ${fetchedCoordinatorCompanyId}`,
      );
    } catch (error) {
      console.error(t("myEmployees.errors.fetchError"), error);
      if (error.code === "failed-precondition") {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.firestoreIndexRequired"),
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("myEmployees.errors.fetchError"),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim() === "") {
      setFilteredEmployees(employees); // Mostrar todos si la búsqueda está vacía
    } else {
      setFilteredEmployees(
        employees.filter((emp) =>
          emp.name.toLowerCase().includes(text.toLowerCase()),
        ),
      );
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
          paddingTop: Platform.select({
            // Apply platform-specific padding
            ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
            android: 40, // Base padding on Android (adjust value as needed)
          }),
        }}
      >
        <Pressable onPress={() => router.replace("/coordinator/home")}>
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
          {t("myEmployees.title")}
        </Text>
        <Pressable onPress={() => router.replace("/coordinator/home")}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
      </View>

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
          placeholder={t("myEmployees.searchPlaceholder")}
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
              onPress={() =>
                router.push(
                  `/coordinator/employee/${item.id}?companyId=${coordinatorCompanyId}`,
                )
              }
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
              <Image
                source={require("../../assets/employee.png")}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  marginRight: 15,
                  borderColor: "white",
                  borderWidth: 1,
                }}
              />
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
              </View>
            </Pressable>
          )}
        />
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
