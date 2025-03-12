import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function AddEmployee() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    email: "",
    phone: "",
    role: "",
    birthDate: "",
    companyId: null,
    companyName: "",
  });

  const [companies, setCompanies] = useState([]);
  const [isCompanyModalVisible, setCompanyModalVisible] = useState(false);
  const [isRoleModalVisible, setRoleModalVisible] = useState(false);

  const roles = ["admin", "coordinator", "employee"];

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const snapshot = await getDocs(collection(db, "companies"));
        const companiesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().Name || "No Name",
        }));

        // Ordenar las compañías alfabéticamente
        const sortedCompanies = companiesList.sort((a, b) =>
          a.name.localeCompare(b.name),
        );

        // Agregar "No company" al principio
        setCompanies([{ id: null, name: "No company" }, ...sortedCompanies]);
      } catch (error) {
        Alert.alert("Error fetching companies", error.message);
      }
    };

    fetchCompanies();
  }, []);

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleCompanySelect = (company) => {
    setForm({
      ...form,
      companyId: company.id,
      companyName: company.id ? company.name : "",
    });
    setCompanyModalVisible(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/admin/home");
  };

  const handleRoleSelect = (role) => {
    setForm({ ...form, role });
    setRoleModalVisible(false);
  };

  const handleRegisterEmployee = async () => {
    const { firstName, lastName, dni, email, phone, role, birthDate } = form;

    if (
      !firstName ||
      !lastName ||
      !dni ||
      !email ||
      !phone ||
      !role ||
      !birthDate
    ) {
      Alert.alert("Validation Error", "Please fill in all required fields");
      return;
    }

    try {
      await addDoc(collection(db, "employees"), {
        ...form,
        createdAt: new Date(),
      });

      Alert.alert("Success", "Employee Registered Successfully");
      router.replace("/admin/employees");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
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
              Employees
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
              Add Employee
            </Text>
          </View>

          <Pressable onPress={handleHome}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 50, height: 50 }}
            />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {Object.entries(form).map(([key, value]) =>
              key !== "companyId" && key !== "companyName" && key !== "role" ? (
                <View key={key} style={{ width: 366, marginBottom: 15 }}>
                  <Text style={styles.label}>{key}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder={key}
                      value={value}
                      onChangeText={(text) => handleInputChange(key, text)}
                      style={styles.input}
                    />
                  </View>
                </View>
              ) : null,
            )}

            {/* Role Selection */}
            <Pressable
              onPress={() => setRoleModalVisible(true)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.role || "Select role"}</Text>
              <Ionicons name="chevron-down" size={24} color="gray" />
            </Pressable>

            {/* Company Selection */}
            <Pressable
              onPress={() => setCompanyModalVisible(true)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>
                {form.companyName || "No company"}
              </Text>
              <Ionicons name="chevron-down" size={24} color="gray" />
            </Pressable>

            <Pressable onPress={handleRegisterEmployee} style={styles.button}>
              <Text style={{ color: "#fff", fontSize: 19 }}>Add Employee</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Role Modal */}
        <Modal
          visible={isRoleModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Role</Text>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleRoleSelect(role)}
                  style={styles.modalItem}
                >
                  <Text>{role}</Text>
                </TouchableOpacity>
              ))}
              <Pressable
                onPress={() => setRoleModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={{ color: "white" }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Company Modal */}
        <Modal
          visible={isCompanyModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Company</Text>
              <FlatList
                data={companies}
                keyExtractor={(item) => item.id || "none"}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleCompanySelect(item)}
                    style={styles.modalItem}
                  >
                    <Text>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <Pressable
                onPress={() => setCompanyModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={{ color: "white" }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
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
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 5,
    textTransform: "capitalize",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 366,
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "white",
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 18,
  },
  button: {
    width: 366,
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 10,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  closeButton: {
    backgroundColor: "#006892",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
};
