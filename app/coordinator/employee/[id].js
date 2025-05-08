import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // 1. Import Toast
import { Ionicons } from "@expo/vector-icons"; // Import icons for modal if desired

export default function EmployeeDetailCoordinatorView() {
  // Renamed component for clarity
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
    companyId: "", // Keep companyId
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Add saving state
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false); // State for custom delete modal

  const fields = [
    { key: "firstName", label: t("employee_detail.firstName"), editable: true },
    { key: "lastName", label: t("employee_detail.lastName"), editable: true },
    { key: "dni", label: t("employee_detail.dni"), editable: true },
    { key: "email", label: t("employee_detail.email"), editable: false }, // Usually not editable
    {
      key: "phone",
      label: t("employee_detail.phone"),
      editable: true,
      keyboardType: "phone-pad",
    },
    {
      key: "birthDate",
      label: t("employee_detail.birthDate"),
      editable: false,
    }, // Usually not editable
    // Role and companyId might not be editable by coordinator depending on rules
    // { key: "companyId", label: t("employee_detail.companyId"), editable: false },
    // { key: "role", label: t("employee_detail.role"), editable: false },
  ];

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("employee_detail.alert.invalidId", "Invalid employee ID."),
        });
        router.back();
        return;
      }
      setLoading(true);
      try {
        const docRef = doc(db, "employees", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Provide defaults for safety
          const data = docSnap.data();
          setEmployee({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            dni: data.dni || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "",
            birthDate: data.birthDate || "",
            companyId: data.companyId || "",
          });
        } else {
          // 2. Replace alert with Toast
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle"),
            text2: t("employee_detail.alert.notFound"),
          });
          router.back();
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        // 2. Replace alert with Toast
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("employee_detail.alert.fetchError"), // Use specific key
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id, t, router]); // Add t and router

  const handleInputChange = (field, value) => {
    setEmployee({ ...employee, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "employees", id);
      // Prepare data for update (potentially exclude non-editable fields if needed)
      const updateData = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        dni: employee.dni,
        phone: employee.phone,
        // Only include fields coordinators should update
        // companyId: employee.companyId, // Uncomment if coordinator can change this
        // role: employee.role,           // Uncomment if coordinator can change this
      };
      await updateDoc(docRef, updateData);
      // 3. Replace alert with Toast
      Toast.show({
        type: "success",
        text1: t("success.title"),
        text2: t("employee_detail.alert.updateSuccess"),
      });
      router.push({
        pathname: "/coordinator/myEmployees",
        params: { refresh: Date.now() },
      });
    } catch (error) {
      console.error("Error updating employee:", error);
      // 3. Replace alert with Toast
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("employee_detail.alert.updateError"), // Use specific key
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    // Show the custom modal instead of Alert.alert
    setIsDeleteModalVisible(true);
  };

  // --- Handle Deletion from Custom Modal ---
  const handleConfirmDelete = async () => {
    setIsDeleteModalVisible(false); // Close modal
    // setLoading(true); // Optional: Indicate processing

    try {
      const docRef = doc(db, "employees", id);
      await deleteDoc(docRef);
      // 4. Replace alert with Toast
      Toast.show({
        type: "success",
        text1: t("success.title"),
        // Use correct translation key if different from admin version
        text2: t(
          "employee_detail.deleteSuccess",
          "Employee deleted successfully.",
        ),
      });
      // Navigate back to list or coordinator home
      router.replace({
        pathname: "/coordinator/myEmployees",
        params: { refresh: Date.now() },
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      // 4. Replace alert with Toast
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        // Use correct translation key if different from admin version
        text2: t("employee_detail.deleteError", "Error deleting employee."),
      });
    } finally {
      // setLoading(false); // Stop indicator
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FF8C00" />
      </LinearGradient>
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

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {fields.map(({ key, label, editable, keyboardType }) => (
            <View key={key} style={styles.fieldContainer}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={employee[key]}
                onChangeText={(text) => handleInputChange(key, text)}
                style={[styles.input, !editable && styles.inputDisabled]}
                editable={editable}
                keyboardType={keyboardType || "default"}
                placeholder={
                  !editable
                    ? t("employee_detail.not_editable", "Not Editable")
                    : ""
                }
                placeholderTextColor="#999"
              />
            </View>
          ))}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[
                styles.button,
                styles.saveButton,
                isSaving && styles.buttonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.buttonSpinner}
                />
              ) : (
                <Text style={styles.buttonText}>
                  {t("employee_detail.saveButton")}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={isSaving} // Also disable delete while saving
              style={[
                styles.button,
                styles.deleteButton,
                isSaving && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {t("employee_detail.deleteButton")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={isDeleteModalVisible}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalMessageText}>
              {/* Reusing admin keys, ensure they exist or create coordinator specific ones */}
              {t("employee_details.confirmDelete")}
            </Text>
            <View style={styles.modalButtonRow}>
              <Pressable
                onPress={() => setIsDeleteModalVisible(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
              >
                <Text style={styles.modalButtonText}>
                  {t("employee_details.cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={[styles.modalButton, styles.modalConfirmButton]}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalConfirmButtonText,
                  ]}
                >
                  {t("employee_details.delete1")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  gradient: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomStartRadius: 40,
    borderBottomEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    paddingTop: Platform.select({ ios: 60, android: 40 }),
  },
  headerIcon: { width: 50, height: 50 },
  headerTitleContainer: { flex: 1, alignItems: "center", marginHorizontal: 10 },
  headerTitleMain: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
  },
  headerTitleSub: {
    fontSize: 18,
    fontWeight: "300",
    color: "white",
    letterSpacing: 1,
    marginTop: 2,
    textAlign: "center",
  },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  content: { flex: 1, padding: 20 },
  fieldContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "500", color: "#333", marginBottom: 8 },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: "white",
    fontSize: 18,
    color: "#333",
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    color: "#888",
    borderColor: "#e0e0e0",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: { backgroundColor: "#006892", marginRight: 10 },
  deleteButton: { backgroundColor: "#D32F2F", marginLeft: 10 },
  buttonDisabled: {
    backgroundColor: "#a0a0a0",
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  buttonSpinner: {
    /* marginRight: 5 */
  },
  footer: {
    backgroundColor: "#006892",
    padding: 30,
    borderTopEndRadius: 40,
    borderTopStartRadius: 40,
  },

  // --- Custom Modal Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "#1F1F1F",
    padding: 24,
    borderRadius: 20,
    width: "85%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalMessageText: {
    color: "white",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 8,
    minWidth: 100,
  },
  modalCancelButton: { backgroundColor: "#4A4A4A" },
  modalConfirmButton: { backgroundColor: "#D32F2F" },
  modalButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  modalConfirmButtonText: {
    /* Optional specific styles */
  },
});
