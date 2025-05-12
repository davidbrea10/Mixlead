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
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collectionGroup,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // 2. Import Toast

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams();
  const employeeId = id;
  const router = useRouter();
  const { t } = useTranslation();

  const [employee, setEmployee] = useState(null); // Datos del empleado
  const [employeeDocRef, setEmployeeDocRef] = useState(null); // <-- NUEVO ESTADO para guardar la referencia completa
  const [loading, setLoading] = useState(true);
  const [isRoleModalVisible, setRoleModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [originalEmployeeData, setOriginalEmployeeData] = useState(null);
  const [error, setError] = useState(null); // Estado para manejar errores de carga

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      setEmployee(null); // Resetear datos previos
      setEmployeeDocRef(null); // Resetear ref previa
      setError(null); // Resetear error previo

      if (!employeeId) {
        console.error("Error: Missing employeeId");
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("employee_details.errors.invalid_id"),
        });
        setError(t("employee_details.errors.invalid_id"));
        setLoading(false);
        // router.back(); // Opcional
        return;
      }

      try {
        // --- Buscar usando Collection Group y filtrar por ID ---
        console.log(
          `Attempting collectionGroup query for employeeId: ${employeeId}`,
        );
        const employeesGroupRef = collectionGroup(db, "employees");

        // *** Estrategia 1: Filtrar directamente en la query (Puede requerir índice y sintaxis exacta) ***
        // const q = query(employeesGroupRef, where(documentId(), '==', employeeId)); // Intentar con documentId() si está disponible y funciona
        // const employeesSnapshot = await getDocs(q);
        // let foundDoc = employeesSnapshot.empty ? null : employeesSnapshot.docs[0];
        // console.log(`Found via query filter: ${foundDoc ? foundDoc.id : 'None'}`);

        // *** Estrategia 2: Obtener todos y filtrar cliente (Menos eficiente, pero funciona sin índices específicos) ***
        const employeesSnapshot = await getDocs(employeesGroupRef);
        console.log(
          `Workspaceed ${employeesSnapshot.size} total employee docs to filter.`,
        );
        const foundDoc = employeesSnapshot.docs.find(
          (doc) => doc.id === employeeId,
        );
        console.log(
          `Found via client filter: ${foundDoc ? foundDoc.id : "None"}`,
        );
        // ****************************************************************

        if (foundDoc) {
          const data = { id: foundDoc.id, ...foundDoc.data() };
          setEmployee(data);
          setOriginalEmployeeData(data);
          setEmployeeDocRef(foundDoc.ref); // <-- Guardar la REFERENCIA completa
          console.log("Employee data fetched:", data);
          console.log("Stored Document Reference Path:", foundDoc.ref.path);
        } else {
          console.error(
            `Employee document with ID ${employeeId} not found in any 'employees' subcollection.`,
          );
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle"),
            text2: t("employee_details.errors.not_found"),
          });
          setError(t("employee_details.errors.not_found"));
          // router.back(); // Opcional
        }
      } catch (error) {
        console.error("Error fetching employee via collectionGroup:", error);
        // Verificar si el error es por índice faltante (si usaste Estrategia 1)
        if (error.code === "failed-precondition") {
          console.error(
            "Query failed likely due to missing Firestore index. Check console/Firebase for index creation link.",
          );
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle"),
            text2: t("errors.firestoreIndexRequired"),
            visibilityTime: 5000,
          }); // Añadir traducción
          setError(t("errors.firestoreIndexRequired"));
        } else {
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle"),
            text2: t("employee_details.errors.fetch_error"),
          });
          setError(t("employee_details.errors.fetch_error"));
        }
        // router.back(); // Opcional
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, t, router]); // Depender solo de employeeId

  // Define los campos editables
  const fields = [
    { key: "firstName", label: "employee_details.firstName", editable: true },
    { key: "lastName", label: "employee_details.lastName", editable: true },
    { key: "dni", label: "employee_details.dni", editable: true },
    { key: "email", label: "employee_details.email", editable: false },
    {
      key: "phone",
      label: "employee_details.phone",
      editable: true,
      keyboardType: "phone-pad",
    },
    { key: "birthDate", label: "employee_details.birthDate", editable: false },
    // { key: "companyId", label: "employee_details.companyId", editable: false }, // CompanyID no editable aquí
  ];

  const handleInputChange = (field, value) => {
    setEmployee((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const roles = ["admin", "coordinator", "employee"];

  const handleRoleSelect = (role) => {
    setEmployee((prev) => (prev ? { ...prev, role } : null));
    setRoleModalVisible(false);
  };

  // --- GUARDAR CAMBIOS ---
  const handleSave = async () => {
    // 6. Usar la referencia guardada 'employeeDocRef'
    if (!employeeDocRef || !employee) {
      // Verificar si la referencia existe
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "errors.cannotSaveMissingRef",
          "Cannot save, employee reference not found.",
        ),
      }); // Nueva traducción
      return;
    }

    // Preparar datos a actualizar (excluir ID y companyId si no se debe cambiar)
    const dataToUpdate = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      dni: employee.dni,
      phone: employee.phone,
      role: employee.role,
      // NO actualizamos companyId aquí
    };

    console.log("Attempting to update docRef:", employeeDocRef.path);
    console.log("Data to update:", dataToUpdate);

    setIsSaving(true);
    try {
      // Usar la referencia guardada directamente
      await updateDoc(employeeDocRef, dataToUpdate);

      Toast.show({
        type: "success",
        text1: t("success.title"),
        text2: t("success.message"),
      });
      setOriginalEmployeeData(employee); // Actualizar original tras guardar
      router.replace({
        pathname: "/admin/employees",
        params: { refresh: Date.now() },
      });
    } catch (error) {
      console.error("Error updating employee:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.updateError", "Error saving changes."),
      }); // Añadir traducción
    } finally {
      setIsSaving(false);
    }
  };

  // --- ELIMINAR EMPLEADO ---
  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    // 7. Usar la referencia guardada 'employeeDocRef'
    if (!employeeDocRef) {
      // Verificar si la referencia existe
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "errors.cannotDeleteMissingRef",
          "Cannot delete, employee reference not found.",
        ),
      }); // Nueva traducción
      setIsDeleteModalVisible(false);
      return;
    }

    setIsDeleteModalVisible(false);
    setIsDeleting(true);

    console.log("Attempting to delete docRef:", employeeDocRef.path);

    try {
      // Usar la referencia guardada directamente
      await deleteDoc(employeeDocRef);

      Toast.show({
        type: "success",
        text1: t("success.title"),
        text2: t("employee_details.success.delete"),
      });
      router.replace({
        pathname: "/admin/employees",
        params: { refresh: Date.now() },
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("employee_details.errors.delete_error"),
      });
    } finally {
      setIsDeleting(false);
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
                placeholderTextColor={"gray"}
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
        <View style={styles.modalOverlayDelete}>
          <View style={styles.modalContentDelete}>
            <Text style={styles.modalMessageTextDelete}>
              {/* Use existing translation key for confirmation message */}
              {t("employee_details.confirmDelete")}
            </Text>
            <View style={styles.modalButtonRowDelete}>
              {/* Cancel Button */}
              <Pressable
                onPress={() => setIsDeleteModalVisible(false)}
                style={[
                  styles.modalButtonDelete,
                  styles.modalCancelButtonDelete,
                ]}
              >
                <Text style={styles.modalButtonTextDelete}>
                  {t("employee_details.cancel")}
                </Text>
              </Pressable>
              {/* Confirm Delete Button */}
              <Pressable
                onPress={handleConfirmDelete}
                style={[
                  styles.modalButtonDelete,
                  styles.modalConfirmButtonDelete,
                ]}
              >
                <Text
                  style={[
                    styles.modalButtonTextDelete,
                    styles.modalConfirmButtonTextDelete,
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
  },
  modalCloseButton: {
    marginTop: 15,
    backgroundColor: "#FF9300",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
  modalOverlayDelete: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)", // Overlay semitransparente oscuro
  },
  modalContentDelete: {
    backgroundColor: "#1F1F1F", // Fondo oscuro como el ejemplo
    padding: 24,
    borderRadius: 20, // Bordes redondeados
    width: "85%", // Ancho relativo
    maxWidth: 340, // Ancho máximo
    alignItems: "center", // Centra el contenido
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Opcional: Si quieres un título separado del mensaje
  // modalTitleText: {
  //   color: "white",
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   textAlign: "center",
  //   marginBottom: 10,
  // },
  modalMessageTextDelete: {
    // Estilo para el texto de confirmación
    color: "white",
    fontSize: 17, // Ligeramente más grande
    textAlign: "center",
    marginBottom: 24, // Espacio antes de los botones
    lineHeight: 24, // Mejor legibilidad
  },
  modalButtonRowDelete: {
    // Contenedor para los botones
    flexDirection: "row",
    justifyContent: "space-around", // Espaciado entre botones
    width: "100%", // Ocupa todo el ancho del modalContent
    marginTop: 10,
  },
  modalButtonDelete: {
    // Estilo base para ambos botones
    flex: 1, // Para que ocupen espacio similar si es necesario
    paddingVertical: 12,
    paddingHorizontal: 20, // Más padding horizontal
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 8, // Espacio entre botones
    minWidth: 100, // Ancho mínimo para que no queden muy pequeños
  },
  modalCancelButtonDelete: {
    // Estilo específico para el botón "No" / "Cancelar"
    backgroundColor: "#4A4A4A", // Un gris oscuro diferente
  },
  modalConfirmButtonDelete: {
    // Estilo específico para el botón "Sí" / "Eliminar"
    backgroundColor: "#D32F2F", // Rojo destructivo (como el botón principal)
  },
  modalButtonTextDelete: {
    // Estilo del texto de los botones
    color: "white",
    fontSize: 16,
    fontWeight: "600", // Semi-negrita
  },
  modalConfirmButtonTextDelete: {
    // Puedes añadir estilos específicos si quieres diferenciar el texto del botón de confirmación
  },
});
