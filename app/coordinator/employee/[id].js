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
import { useTranslation } from "react-i18next";

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
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

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const docRef = doc(db, "employees", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEmployee(docSnap.data());
        } else {
          alert(t("employee_detail.alert.notFound"));
          router.back();
        }
      } catch (error) {
        alert(t("employee_detail.alert.fetchError"));
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const fieldLabels = {
    firstName: t("employee_detail.firstName"),
    lastName: t("employee_detail.lastName"),
    dni: t("employee_detail.dni"),
    email: t("employee_detail.email"),
    phone: t("employee_detail.phone"),
    birthDate: t("employee_detail.birthDate"),
  };

  const handleInputChange = (field, value) => {
    setEmployee({ ...employee, [field]: value });
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, "employees", id);
      await updateDoc(docRef, employee);
      alert(t("employee_detail.alert.updateSuccess"));
      router.push({
        pathname: "/coordinator/myEmployees",
        params: { refresh: true },
      });
    } catch (error) {
      alert(t("employee_detail.alert.updateError"));
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
              alert(t("employee_detail.deleteSuccess"));
              router.push("/coordinator/home");
            } catch (error) {
              alert(t("employee_detail.deleteError"));
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
            ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
            android: 40, // Base padding on Android (adjust value as needed)
          }),
        }}
      >
        <Pressable onPress={() => router.replace("/coordinator/myEmployees")}>
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
            {t("employee_detail.title")}
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
            {`${employee.firstName} ${employee.lastName}` || "Employee Details"}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/coordinator/home")}>
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
                {t("employee_detail.saveButton")}
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
                {t("employee_detail.deleteButton")}
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
