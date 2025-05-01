import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert, // Keep for confirmation
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TouchableOpacity,
  Platform,
  StyleSheet, // 1. Import StyleSheet
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // 2. Import Toast

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
    companyName: "", // Assuming this comes from employee data now
    companyId: "", // Keep companyId
  });
  const [loading, setLoading] = useState(true);
  const [isRoleModalVisible, setRoleModalVisible] = useState(false);
  // Company selection logic seems removed, focusing on role for now.
  // const [isCompanyModalVisible, setCompanyModalVisible] = useState(false);
  // const [companies, setCompanies] = useState([]);
  const [isSaving, setIsSaving] = useState(false); // 3. Add saving state
  const [isDeleting, setIsDeleting] = useState(false); // State for delete process
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { t } = useTranslation(); // Initialize i18n

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t(
            "employee_details.errors.invalid_id",
            "Invalid employee ID.",
          ), // Add translation
        });
        router.back();
        return;
      }
      setLoading(true);
      try {
        const docRef = doc(db, "employees", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Initialize state with fetched data, providing defaults if needed
          const data = docSnap.data();
          setEmployee({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            dni: data.dni || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "",
            birthDate: data.birthDate || "",
            companyId: data.companyId || "", // Ensure companyId is fetched
            // companyName: data.companyName || "" // If you still store companyName
          });
        } else {
          // 4. Replace alert with error toast
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t(
              "employee_details.errors.not_found",
              "Employee not found.",
            ), // Add translation
          });
          router.back();
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        // 4. Replace alert with error toast
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t(
            "employee_details.errors.fetch_error",
            "Error fetching employee data.",
          ), // Add translation
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };

    // --- Company fetching logic removed as it's not used for selection ---
    // const fetchCompanies = async () => { ... };

    fetchEmployee();
    // fetchCompanies(); // Don't call if not needed
  }, [id, t, router]); // Add dependencies

  // Define editable fields and their labels
  const fields = [
    { key: "firstName", label: "employee_details.firstName", editable: true },
    { key: "lastName", label: "employee_details.lastName", editable: true },
    { key: "dni", label: "employee_details.dni", editable: true },
    { key: "email", label: "employee_details.email", editable: false }, // Email usually not editable after creation
    {
      key: "phone",
      label: "employee_details.phone",
      editable: true,
      keyboardType: "phone-pad",
    },
    { key: "birthDate", label: "employee_details.birthDate", editable: false }, // Birth date usually not editable
    { key: "companyId", label: "employee_details.companyId", editable: true }, // Allow editing company ID association
    // Role is handled separately
  ];

  const handleInputChange = (field, value) => {
    setEmployee({ ...employee, [field]: value });
  };

  const roles = ["admin", "coordinator", "employee"];

  // --- Company selection logic removed ---
  // const handleCompanySelect = (companyName) => { ... };

  const handleRoleSelect = (role) => {
    setEmployee({ ...employee, role });
    setRoleModalVisible(false);
  };

  const handleSave = async () => {
    setIsSaving(true); // Start saving indicator
    try {
      const docRef = doc(db, "employees", id);
      await updateDoc(docRef, employee);
      // 5. Replace alert with success toast
      Toast.show({
        type: "success",
        text1: t("success.title"),
        text2: t("success.message"),
      });
      router.replace({
        pathname: "/admin/employees",
        params: { refresh: Date.now() },
      }); // Go back/refresh
    } catch (error) {
      console.error("Error updating employee:", error);
      // 5. Replace alert with error toast
      Toast.show({
        type: "error",
        text1: t("error.title"),
        text2: t("error.message"), // Add translation
      });
    } finally {
      setIsSaving(false); // Stop saving indicator
    }
  };

  const handleDelete = async () => {
    setIsDeleteModalVisible(true);
  };

  // --- Handle Deletion from Custom Modal ---
  const handleConfirmDelete = async () => {
    setIsDeleteModalVisible(false); // Close the modal first
    // Optional: Add a specific deleting indicator if the process might take time
    // setLoading(true); // Or a dedicated isDeleting state

    try {
      const docRef = doc(db, "employees", id);
      await deleteDoc(docRef);
      Toast.show({
        type: "success",
        text1: t("success.title"), // Using generic key
        text2: t(
          "employee_details.success.delete",
          "Employee deleted successfully.",
        ),
      });
      router.replace({
        pathname: "/admin/employees",
        params: { refresh: Date.now() },
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"), // Using generic key
        text2: t(
          "employee_details.errors.delete_error",
          "Error deleting employee.",
        ),
      });
    } finally {
      // setLoading(false); // Stop indicator if used
    }
  };

  if (loading) {
    // Centered Loading Indicator
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
      style={styles.gradient}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/admin/employees")}>
          <Image
            source={require("../../../assets/go-back.png")}
            style={styles.headerIcon}
          />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleMain}>
            {t("employee_details.employeesTitle")}
          </Text>
          <Text style={styles.headerTitleSub}>
            {`${employee.firstName} ${employee.lastName}`.trim() ||
              t("employee_details.employeeDetailsTitle")}
          </Text>
        </View>
        {/* Keep Pressable for layout balance or remove if not needed */}
        <Pressable
          onPress={() => router.push("/admin/home")}
          style={{ width: 50 }}
        >
          {/* Optional: Home Icon */}
          {/* <Image source={require("../../../assets/icon.png")} style={styles.headerIcon} /> */}
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Map through defined fields */}
          {fields.map(({ key, label, editable, keyboardType }) => (
            <View key={key} style={styles.fieldContainer}>
              <Text style={styles.label}>{t(label)}</Text>
              <TextInput
                value={employee[key]}
                onChangeText={(text) => handleInputChange(key, text)}
                style={[styles.input, !editable && styles.inputDisabled]} // Style disabled fields
                editable={editable} // Set editability
                keyboardType={keyboardType || "default"}
                placeholder={
                  !editable
                    ? t("employee_details.not_editable", "Not Editable")
                    : ""
                } // Placeholder for non-editable
                placeholderTextColor="#999"
              />
            </View>
          ))}

          {/* Role Selection */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t("employee_details.role")}</Text>
            <Pressable
              onPress={() => setRoleModalVisible(true)}
              style={styles.pickerButton}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  !employee.role && styles.pickerButtonPlaceholder,
                ]}
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
            onRequestClose={() => setRoleModalVisible(false)} // Handle back button on Android
          >
            <TouchableOpacity
              style={styles.modalOverlay} // Added overlay press to close
              activeOpacity={1}
              onPressOut={() => setRoleModalVisible(false)}
            >
              <View
                style={styles.modalContent}
                onStartShouldSetResponder={() => true}
              >
                {/* Prevent overlay press closing when interacting with content */}
                <Text style={styles.modalTitle}>
                  {t("employee_details.selectRole")}
                </Text>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => handleRoleSelect(role)}
                    style={styles.modalOption}
                  >
                    <Text style={styles.modalOptionText}>{role}</Text>
                  </TouchableOpacity>
                ))}
                <Pressable
                  onPress={() => setRoleModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseButtonText}>
                    {t("employee_details.close")}
                  </Text>
                </Pressable>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || isDeleting}
              style={[
                styles.button,
                styles.saveButton,
                (isSaving || isDeleting) && styles.buttonDisabled,
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
                  {t("employee_details.save")}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={isSaving || isDeleting}
              style={[
                styles.button,
                styles.deleteButton,
                (isSaving || isDeleting) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {t("employee_details.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        transparent
        visible={isDeleteModalVisible}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalMessageText}>
              {/* Use existing translation key for confirmation message */}
              {t("employee_details.confirmDelete")}
            </Text>
            <View style={styles.modalButtonRow}>
              {/* Cancel Button */}
              <Pressable
                onPress={() => setIsDeleteModalVisible(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
              >
                <Text style={styles.modalButtonText}>
                  {t("employee_details.cancel")}
                </Text>
              </Pressable>
              {/* Confirm Delete Button */}
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

      {/* Footer (Optional) */}
      <View style={styles.footer}></View>
    </LinearGradient>
  );
}

// --- StyleSheet ---
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
    // Style for non-editable fields
    backgroundColor: "#f5f5f5",
    color: "#888", // Grey text for disabled fields
    borderColor: "#e0e0e0",
  },
  pickerButton: {
    // Style for the pressable acting as a picker
    flexDirection: "row",
    alignItems: "center",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: "white",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    fontSize: 18,
    color: "black",
  },
  pickerButtonPlaceholder: {
    color: "gray",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "#1F1F1F", // Dark background
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
  // Optional: Title style if you add one
  // modalTitleText: { ... },
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
  modalCancelButton: {
    backgroundColor: "#4A4A4A", // Dark grey for Cancel/No
  },
  modalConfirmButton: {
    backgroundColor: "#D32F2F", // Destructive red for Delete/Yes
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmButtonText: {
    // Optional: Specific styles for confirm text
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
  }, // Optional margin
  footer: {
    backgroundColor: "#006892",
    padding: 30,
    borderTopEndRadius: 40,
    borderTopStartRadius: 40,
  },
});
