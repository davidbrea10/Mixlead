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
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  collection,
  getDocs,
} from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // 1. Import Toast
import { Ionicons } from "@expo/vector-icons"; // Import icons for modal if desired

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

const TARGET_COMPANY_ID_FOR_UNASSIGNED_EMPLOYEES = "lctYf9VrAfykMwxcSjRk";

export default function EmployeeDetailCoordinatorView() {
  // Renamed component for clarity
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams(); // Obtener todos los parámetros

  // 1. Extraer y renombrar parámetros para claridad
  const employeeId = params.id;
  const companyIdFromParams = params.companyId; // El ID de la compañía del empleado
  console.log("EmployeeDetailCoordinatorView Received Params:", {
    employeeId,
    companyId: companyIdFromParams,
  });

  const [employee, setEmployee] = useState(null); // Inicializar como null
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [error, setError] = useState(null); // Para mostrar errores de carga

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
      setLoading(true);
      setError(null);
      setEmployee(null);

      // 2. Validar que AMBOS IDs (employeeId y companyIdFromParams) están presentes
      if (!employeeId || !companyIdFromParams) {
        console.error("Error: Missing employeeId or companyId from params", {
          employeeId,
          companyIdFromParams,
        });
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t(
            "employee_detail.alert.invalidParams",
            "Faltan parámetros necesarios.",
          ), // Nueva traducción
        });
        setError(t("employee_detail.alert.invalidParams")); // Actualizar estado de error
        setLoading(false);
        // router.back(); // Podrías considerar ir atrás
        return;
      }

      try {
        // 3. Construir la ruta CORRECTA al documento del empleado
        const docRef = doc(
          db,
          "companies",
          companyIdFromParams,
          "employees",
          employeeId,
        );
        console.log("Fetching employee from path:", docRef.path);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Guardar datos en el estado. companyId ya lo tenemos de los params.
          setEmployee({
            id: docSnap.id, // Guardar el ID del empleado también
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            dni: data.dni || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "",
            birthDate: data.birthDate || "",
            companyId: data.companyId || companyIdFromParams, // Usar el de los datos, o el de params como fallback
          });
        } else {
          console.error("Employee document not found at path:", docRef.path);
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle"),
            text2: t("employee_detail.alert.notFound"),
          });
          setError(t("employee_detail.alert.notFound"));
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("employee_detail.alert.fetchError"),
        });
        setError(t("employee_detail.alert.fetchError"));
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, companyIdFromParams, t, router]); // Depender de los IDs de los params

  const handleInputChange = (field, value) => {
    setEmployee((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!employee || !employeeId || !companyIdFromParams) {
      // Validar contra los params originales
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "errors.cannotSaveMissingInfo",
          "Falta información para guardar.",
        ),
      });
      return;
    }
    setIsSaving(true);
    try {
      // 4. Construir la ruta CORRECTA para actualizar
      const docRef = doc(
        db,
        "companies",
        companyIdFromParams,
        "employees",
        employeeId,
      );
      const updateData = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        dni: employee.dni,
        phone: employee.phone,
        // No permitir que el coordinador cambie el email, birthDate, companyId o role aquí directamente
        // Esos cambios podrían necesitar lógicas más complejas (ej. mover empleado, re-autenticación)
      };
      await updateDoc(docRef, updateData);
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
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("employee_detail.alert.updateError"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteModalVisible(false);

    if (!employeeId || !companyIdFromParams) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "errors.cannotProceedMissingInfo", // Consider a more generic key if reusing
          "Falta información para proceder.",
        ),
      });
      return;
    }

    setIsSaving(true); // Indicate an operation is in progress

    try {
      const originalCompanyId = companyIdFromParams;
      const targetCompanyId = TARGET_COMPANY_ID_FOR_UNASSIGNED_EMPLOYEES;

      if (originalCompanyId === targetCompanyId) {
        Toast.show({
          type: "info",
          text1: t("employee_detail.alreadyInNoCompanyTitle", "Información"),
          text2: t(
            "employee_detail.alreadyInNoCompanyMsg",
            "El empleado ya está en la compañía destino.",
          ),
        });
        setIsSaving(false);
        return;
      }

      await runTransaction(db, async (transaction) => {
        // 1. Define references for the original employee location
        const oldEmployeeDocRef = doc(
          db,
          "companies",
          originalCompanyId,
          "employees",
          employeeId,
        );
        const oldDosesColRef = collection(oldEmployeeDocRef, "doses");
        const oldMaterialsColRef = collection(oldEmployeeDocRef, "materials");

        // 2. Define references for the new employee location ("No Company")
        const newEmployeeDocRef = doc(
          db,
          "companies",
          targetCompanyId,
          "employees",
          employeeId,
        );
        const newDosesColRef = collection(newEmployeeDocRef, "doses");
        const newMaterialsColRef = collection(newEmployeeDocRef, "materials");

        // 3. Get the employee document
        const employeeSnap = await transaction.get(oldEmployeeDocRef);
        if (!employeeSnap.exists()) {
          // This error will be caught by the outer catch block
          throw new Error(
            t("employee_detail.alert.notFound", "Empleado no encontrado."),
          );
        }
        const employeeData = employeeSnap.data();

        // 4. Update companyId in employee data for the new location
        const updatedEmployeeData = {
          ...employeeData,
          companyId: targetCompanyId, // Critical update
        };

        // 5. Get 'doses' subcollection from original location
        // These reads are done before the transaction writes, using the snapshot of data.
        const dosesSnapshot = await getDocs(oldDosesColRef);

        // 6. Get 'materials' subcollection from original location
        const materialsSnapshot = await getDocs(oldMaterialsColRef);

        // --- Transactional Writes and Deletes ---

        // 7. Set the new employee document in "No Company"
        transaction.set(newEmployeeDocRef, updatedEmployeeData);

        // 8. Move 'doses' subcollection
        dosesSnapshot.forEach((doseDoc) => {
          const newDoseDocRef = doc(newDosesColRef, doseDoc.id);
          transaction.set(newDoseDocRef, doseDoc.data()); // Add to new location
          transaction.delete(doc(oldDosesColRef, doseDoc.id)); // Delete from old location
        });

        // 9. Move 'materials' subcollection
        materialsSnapshot.forEach((materialDoc) => {
          const newMaterialDocRef = doc(newMaterialsColRef, materialDoc.id);
          transaction.set(newMaterialDocRef, materialDoc.data()); // Add to new location
          transaction.delete(doc(oldMaterialsColRef, materialDoc.id)); // Delete from old location
        });

        // 10. Delete the old employee document
        transaction.delete(oldEmployeeDocRef);
      });

      Toast.show({
        type: "success",
        text1: t("success.title", "Éxito"),
        text2: t(
          "employee_detail.moveSuccess",
          "Empleado movido a 'No Company' exitosamente.",
        ),
      });

      router.replace({
        pathname: "/coordinator/myEmployees",
        params: { refresh: Date.now() }, // To refresh the list on the previous screen
      });
    } catch (error) {
      console.error("Error moving employee:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Error"),
        text2:
          error.message ||
          t("employee_detail.moveError", "Error al mover el empleado."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDERIZADO ---
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

  if (error || !employee) {
    // Si hay error o el empleado es null después de cargar
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image
              source={require("../../../assets/go-back.png")}
              style={styles.headerIcon}
            />
          </Pressable>
          <Text style={styles.headerTitleMain}>{t("errors.errorTitle")}</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.errorDisplayContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#D32F2F" />
          <Text style={styles.errorDisplayText}>
            {error || t("employee_detail.alert.notFound")}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.button,
              styles.saveButton,
              { width: "80%", marginTop: 20 },
            ]}
          >
            <Text style={styles.buttonText}>{t("common.back", "Volver")}</Text>
          </Pressable>
        </View>
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
        <Pressable onPress={() => router.replace("/coordinator/myEmployees")}>
          <Image
            source={require("../../../assets/go-back.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
        <View
          style={{ flexDirection: "column", alignItems: "center", flex: 1 }}
        >
          <Text
            style={{
              fontSize: isTablet ? 32 : 24,
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              marginHorizontal: 10,
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
              textAlign: "center",
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
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
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
                placeholderTextColor={"gray"}
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
