import React, { useState, useEffect } from "react"; // Import React
import {
  View,
  Text,
  TextInput,
  Pressable,
  // Alert, // Remove Alert import for info messages
  ScrollView,
  Image,
  Modal,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet, // 1. Import StyleSheet
  ActivityIndicator, // 2. Import ActivityIndicator
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithCredential,
  EmailAuthProvider,
} from "firebase/auth"; // Import necessary auth methods
import { db, auth } from "../../firebase/config";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // 3. Import Toast

export default function AddEmployee() {
  const router = useRouter();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    email: "",
    phone: "",
    role: "",
    birthDate: "",
    companyId: null, // Default to null (for "No company")
    password: "",
  });

  const [companies, setCompanies] = useState([]);
  const [isCompanyModalVisible, setCompanyModalVisible] = useState(false);
  const [isRoleModalVisible, setRoleModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDateObj, setBirthDateObj] = useState(new Date()); // Keep Date object for picker
  const [isSaving, setIsSaving] = useState(false); // 4. Add saving state

  const roles = ["admin", "coordinator", "employee"];

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const snapshot = await getDocs(collection(db, "companies"));
        const companiesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name:
            doc.data().Name ||
            t("add_employee.unknownCompanyName", "Unknown Company"), // Provide fallback name
        }));
        const sortedCompanies = companiesList.sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setCompanies([
          { id: null, name: t("add_employee.noCompany", "No company") },
          ...sortedCompanies,
        ]); // Add "No company" option
      } catch (error) {
        console.error("Error fetching companies:", error);
        // 5. Replace Alert with error toast
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t(
            "add_employee.errorFetchingCompanies",
            "Could not fetch companies.",
          ), // Add translation
        });
      }
    };
    fetchCompanies();
  }, [t]); // Add t to dependencies

  // Handlers
  const handleInputChange = (field, value) =>
    setForm({ ...form, [field]: value });
  const handleClearField = (field) => setForm({ ...form, [field]: "" });
  const handleBack = () => router.replace("/admin/employees");
  const handleHome = () => router.replace("/admin/home");

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false); // Hide picker regardless of action
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD
      setForm({ ...form, birthDate: formattedDate });
      setBirthDateObj(selectedDate); // Update the Date object state for the picker
    }
  };

  const handleCompanySelect = (company) => {
    setForm({ ...form, companyId: company.id }); // Store company ID
    setCompanyModalVisible(false);
  };

  const handleRoleSelect = (role) => {
    setForm({ ...form, role });
    setRoleModalVisible(false);
  };

  // --- Registration Logic ---
  const handleRegisterEmployee = async () => {
    const {
      firstName,
      lastName,
      dni,
      email,
      phone,
      role,
      birthDate,
      password,
      companyId,
    } = form;

    // Validation
    if (
      !firstName ||
      !lastName ||
      !dni ||
      !email ||
      !phone ||
      !role ||
      !birthDate ||
      !password
    ) {
      // 5. Replace Alert with error toast
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Validation Error"), // More specific title if needed
        text2: t("add_employee.validationError"),
      });
      return;
    }
    // Add more specific validation if needed (email format, password strength, etc.)

    setIsSaving(true); // Start loading
    const adminUser = auth.currentUser; // Get the currently logged-in admin user

    if (!adminUser) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "add_employee.errorAdminNotAuth",
          "Admin user not authenticated.",
        ),
      });
      setIsSaving(false);
      // Optionally redirect to login: router.replace('/');
      return;
    }

    try {
      // --- Create the new employee user ---
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const userId = userCredential.user.uid;

      // --- IMPORTANT: Workaround to sign the Admin back in ---
      // Re-authenticate the *original* admin user immediately after creating the new user.
      // This requires the admin's credentials (usually email/password).
      // **SECURITY NOTE:** Storing admin credentials directly is insecure.
      // This example assumes the admin's session is still valid, but re-authentication
      // might be needed depending on session duration and security rules.
      // A robust solution uses a backend with Admin SDK.
      // Simplified re-auth using current user object (might not always work if session expired mid-process)
      if (auth.currentUser?.uid !== adminUser.uid) {
        // If the signed-in user changed
        // Attempt to sign the original admin back in. This part is tricky client-side.
        // The most reliable way requires getting the admin's password again securely
        // or relying on the existing session token if still valid.
        // For simplicity here, we'll just log a warning if the user changed.
        console.warn(
          "User context switched after employee creation. Admin might need to re-login manually.",
        );
        // Ideally, you'd trigger a secure re-authentication flow here.
        // Example (requires admin password securely obtained):
        // const credential = EmailAuthProvider.credential(adminUser.email, adminPassword);
        // await signInWithCredential(auth, credential);
      }

      // Prepare data for Firestore (exclude password)
      const { password: _, ...employeeData } = form;

      // Save employee data to Firestore using the UID as the document ID
      await setDoc(doc(db, "employees", userId), {
        ...employeeData,
        uid: userId, // Explicitly store UID in the document
        createdAt: new Date(),
      });

      // 5. Replace Alert with success toast
      Toast.show({
        type: "success",
        text1: t("success.successTitle", "Success"),
        text2: t("add_employee.successMessage"),
      });
      setForm({
        firstName: "",
        lastName: "",
        dni: "",
        email: "",
        phone: "",
        role: "",
        birthDate: "",
        companyId: null,
        password: "",
      }); // Clear form
      setBirthDateObj(new Date()); // Reset date picker state
      router.replace({
        pathname: "/admin/employees",
        params: { refresh: Date.now() },
      }); // Go back and refresh
    } catch (error) {
      console.error("Error adding employee:", error);
      // 5. Replace Alert with error toast (map common Firebase auth errors)
      let errorMessage = t(
        "add_employee.errorSaveGeneric",
        "Could not add employee. Please try again.",
      ); // Generic fallback
      if (error.code === "auth/email-already-in-use") {
        errorMessage = t(
          "errors.emailExists",
          "This email address is already registered.",
        );
      } else if (error.code === "auth/invalid-email") {
        errorMessage = t(
          "errors.invalidEmail",
          "The email address is not valid.",
        );
      } else if (error.code === "auth/weak-password") {
        errorMessage = t(
          "errors.weakPassword",
          "The password is too weak (at least 6 characters).",
        ); // Firebase default is 6
      }
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Registration Error"),
        text2: errorMessage,
      });

      // --- If user creation succeeded but Firestore failed, maybe delete the auth user? ---
      // This requires careful handling and possibly backend logic.
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  // --- JSX ---
  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.gradient}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack}>
            <Image
              source={require("../../assets/go-back.png")}
              style={styles.headerIcon}
            />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleMain}>
              {t("add_employee.employeesTitle")}
            </Text>
            <Text style={styles.headerTitleSub}>{t("add_employee.title")}</Text>
          </View>
          <Pressable onPress={handleHome} style={{ width: 50 }}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.headerIcon}
            />
          </Pressable>
        </View>

        {/* Form */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Map through form fields excluding special ones */}
            {Object.entries(form).map(([key, value]) =>
              !["companyId", "role", "birthDate"].includes(key) ? (
                <View key={key} style={styles.fieldWrapper}>
                  <Text style={styles.label}>{t(`add_employee.${key}`)}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder={t(
                        `add_employee.placeholder_${key}`,
                        t(`add_employee.${key}`),
                      )} // Placeholder translation
                      placeholderTextColor={"gray"}
                      value={value}
                      onChangeText={(text) => handleInputChange(key, text)}
                      style={styles.input}
                      secureTextEntry={key === "password"}
                      autoCapitalize={
                        key === "email" || key === "password" ? "none" : "words"
                      } // Auto-capitalize names etc.
                      keyboardType={
                        key === "phone"
                          ? "phone-pad"
                          : key === "email"
                            ? "email-address"
                            : "default"
                      }
                    />
                    {form[key] ? (
                      <Pressable
                        onPress={() => handleClearField(key)}
                        style={styles.clearButton}
                      >
                        <Ionicons name="close-circle" size={24} color="gray" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null,
            )}

            {/* Birth Date Picker */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{t("add_employee.birthDate")}</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.pickerButton}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !form.birthDate && styles.pickerButtonPlaceholder,
                  ]}
                >
                  {form.birthDate || t("add_employee.selectBirthDate")}
                </Text>
                <Ionicons name="calendar-outline" size={24} color="gray" />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDateObj} // Use the Date object state here
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                  maximumDate={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 18),
                    )
                  } // Example: require 18+ years old
                />
              )}
            </View>

            {/* Role Selection */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{t("add_employee.role")}</Text>
              <Pressable
                onPress={() => setRoleModalVisible(true)}
                style={styles.pickerButton}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !form.role && styles.pickerButtonPlaceholder,
                  ]}
                >
                  {form.role || t("add_employee.selectRole")}
                </Text>
                <Ionicons name="chevron-down" size={24} color="gray" />
              </Pressable>
            </View>

            {/* Company Selection */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{t("add_employee.company")}</Text>
              <Pressable
                onPress={() => setCompanyModalVisible(true)}
                style={styles.pickerButton}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !form.companyId && styles.pickerButtonPlaceholder,
                  ]}
                >
                  {companies.find((c) => c.id === form.companyId)?.name ||
                    t("add_employee.selectCompany")}
                </Text>
                <Ionicons name="chevron-down" size={24} color="gray" />
              </Pressable>
            </View>

            {/* Register Button */}
            <Pressable
              onPress={handleRegisterEmployee}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.button,
                isSaving && styles.buttonLoading,
                pressed && !isSaving && styles.buttonPressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.spinner}
                />
              ) : (
                <Text style={styles.buttonText}>
                  {t("add_employee.addButton")}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modals */}
        <Modal
          visible={isRoleModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setRoleModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setRoleModalVisible(false)}
          >
            <View
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitle}>
                {t("add_employee.selectRole")}
              </Text>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleRoleSelect(role)}
                  style={styles.modalItem}
                >
                  <Text style={styles.modalItemText}>{role}</Text>
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

        <Modal
          visible={isCompanyModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCompanyModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setCompanyModalVisible(false)}
          >
            <View
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitle}>
                {t("add_employee.selectCompany")}
              </Text>
              <FlatList
                data={companies}
                keyExtractor={(item) => item.id || "no-company-id"}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleCompanySelect(item)}
                    style={styles.modalItem}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <Pressable
                onPress={() => setCompanyModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>
                  {t("employee_details.close")}
                </Text>
              </Pressable>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
      {/* Footer */}
      <View style={styles.footer}></View>
    </LinearGradient>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 }, // Ensure inner view takes flex
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    alignItems: "center", // Center items horizontally
    paddingVertical: 20,
    paddingHorizontal: "5%", // Use percentage for padding
  },
  fieldWrapper: {
    // Wrapper for label and input/picker
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
    textTransform: "capitalize", // Capitalize labels
  },
  inputContainer: {
    // Container for TextInput and clear button
    flexDirection: "row",
    alignItems: "center",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    fontSize: 18,
    height: "100%",
    paddingRight: 10, // Space for clear button
  },
  clearButton: {
    paddingLeft: 5,
  },
  pickerButton: {
    // Style for Pressable acting as picker
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
  button: {
    width: "100%", // Full width within padded container
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10, // Reduced margin top
    marginBottom: 20,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonLoading: { backgroundColor: "#a0a0a0" },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "#fff", fontSize: 19, fontWeight: "bold" },
  spinner: {
    /* marginRight: 10 */
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    width: "85%",
    borderRadius: 10,
    padding: 20,
    maxHeight: "70%",
  }, // Adjusted width/height
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" },
  modalItemText: { fontSize: 18, textAlign: "center" },
  modalCloseButton: {
    backgroundColor: "#006892",
    padding: 12,
    borderRadius: 5,
    marginTop: 20,
    alignItems: "center",
  },
  modalCloseButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  footer: {
    backgroundColor: "#006892",
    padding: 30,
    borderTopEndRadius: 40,
    borderTopStartRadius: 40,
  }, // Adjusted padding
});
