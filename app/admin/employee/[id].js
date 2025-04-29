import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [employee, setEmployee] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    email: "",
    phone: "",
    role: "",
    birthDate: "",
    companyName: "",
  });
  const [loading, setLoading] = useState(true);
  const [isRoleModalVisible, setRoleModalVisible] = useState(false);
  const [isCompanyModalVisible, setCompanyModalVisible] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Initialize i18n
  const { t } = useTranslation();

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const docRef = doc(db, "employees", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEmployee(docSnap.data());
        } else {
          alert("Employee not found");
          router.back();
        }
      } catch (error) {
        alert("Error fetching employee");
      } finally {
        setLoading(false);
      }
    };

    const fetchCompanies = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "companies"));
        const companyList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCompanies(companyList);
      } catch (error) {
        alert("Error fetching companies");
      }
    };

    fetchEmployee();
    fetchCompanies();
  }, [id]);

  const fieldLabels = {
    firstName: t("employee_details.firstName"),
    lastName: t("employee_details.lastName"),
    dni: t("employee_details.dni"),
    email: t("employee_details.email"),
    phone: t("employee_details.phone"),
    birthDate: t("employee_details.birthDate"),
    role: t("employee_details.role"),
    companyId: t("employee_details.companyId"),
  };

  const handleInputChange = (field, value) => {
    setEmployee({ ...employee, [field]: value });
  };

  const roles = ["admin", "coordinator", "employee"];

  const handleCompanySelect = (companyName) => {
    setEmployee({ ...employee, companyName });
    setCompanyModalVisible(false);
  };

  const handleRoleSelect = (role) => {
    setEmployee({ ...employee, role });
    setRoleModalVisible(false);
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, "employees", id);
      await updateDoc(docRef, employee);
      alert("Employee updated successfully");
      router.push({ pathname: "/admin/employees", params: { refresh: true } });
    } catch (error) {
      alert("Error updating employee");
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      t("employee_details.confirmDeleteTitle"),
      t("employee_details.confirmDelete"),
      [
        {
          text: t("employee_details.cancel"),
          style: "cancel",
        },
        {
          text: t("employee_details.delete1"),
          style: "destructive",
          onPress: async () => {
            try {
              const docRef = doc(db, "employees", id);
              await deleteDoc(docRef);
              alert("Employee deleted successfully");
              router.push("/admin/home");
            } catch (error) {
              alert("Error deleting employee");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ActivityIndicator size={50} color="#FF8C00" style={{ marginTop: 20 }} />
    );
  }

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
            ios: 60, // More padding on iOS
            android: 40, // Base padding on Android
          }),
        }}
      >
        <Pressable onPress={() => router.replace("/admin/employees")}>
          <Image
            source={require("../../../assets/go-back.png")}
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
            {t("employee_details.employeesTitle")}
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
            {`${employee.firstName} ${employee.lastName}` ||
              t("employee_details.employeeDetailsTitle")}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/admin/home")}>
          <Image
            source={require("../../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      <ScrollView>
        <View style={{ flex: 1, padding: 20 }}>
          {Object.entries(fieldLabels)
            .filter(([key]) => key !== "role") // Excluir el campo de "role" aquí
            .map(([key, label]) => (
              <View key={key} style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, marginBottom: 5 }}>{label}</Text>
                <TextInput
                  value={employee[key]}
                  onChangeText={(text) => handleInputChange(key, text)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "100%",
                    height: 55,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    backgroundColor: "white",
                    fontSize: 18,
                  }}
                />
              </View>
            ))}

          {/* Role Selection */}
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 18, marginBottom: 5 }}>
              {t("employee_details.role")}
            </Text>
            <Pressable
              onPress={() => setRoleModalVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
                height: 55,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 10,
                paddingHorizontal: 10,
                backgroundColor: "white",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: employee.role ? "black" : "gray",
                }}
              >
                {employee.role || t("employee_details.selectRole")}
              </Text>
              <Ionicons name="chevron-down" size={24} color="gray" />
            </Pressable>
          </View>

          {/* Role Modal */}
          <Modal
            visible={isRoleModalVisible}
            animationType="slide"
            transparent={true}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              <View
                style={{
                  backgroundColor: "white",
                  margin: 20,
                  padding: 20,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}
                >
                  {t("employee_details.selectRole")}
                </Text>

                {roles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => handleRoleSelect(role)}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderColor: "#ddd",
                    }}
                  >
                    <Text>{role}</Text>
                  </TouchableOpacity>
                ))}

                <Pressable
                  onPress={() => setRoleModalVisible(false)}
                  style={{
                    backgroundColor: "#006892",
                    padding: 10,
                    borderRadius: 5,
                    marginTop: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white" }}>
                    {t("employee_details.close")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Pressable
              onPress={handleSave}
              style={{
                backgroundColor: "#006892",
                padding: 15,
                borderRadius: 10,
                alignItems: "center",
                flex: 1,
                marginRight: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Text style={{ color: "white", fontSize: 18 }}>
                {t("employee_details.save")}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={{
                backgroundColor: "#D32F2F",
                padding: 15,
                borderRadius: 10,
                alignItems: "center",
                flex: 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Text style={{ color: "white", fontSize: 18 }}>
                {t("employee_details.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

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
