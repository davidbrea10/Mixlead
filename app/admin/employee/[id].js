import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TouchableOpacity,
  Platform,
  StyleSheet, // 1. Import StyleSheet
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  collectionGroup,
  getDocs,
  collection,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // 2. Import Toast

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

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

  const [companiesList, setCompaniesList] = useState([]);
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [currentCompanyName, setCurrentCompanyName] = useState("");

  const EMPLOYEE_SUBCOLLECTIONS = ["doses", "materials"];

  const fetchEmployeeAndCompanyDetails = useCallback(async () => {
    setLoading(true);
    setEmployee(null);
    setEmployeeDocRef(null);
    setError(null);
    setCurrentCompanyName("");

    if (!employeeId) {
      console.error("Error: Falta employeeId");
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("employee_details.errors.invalid_id"),
      });
      setError(t("employee_details.errors.invalid_id"));
      setLoading(false);
      return;
    }

    try {
      console.log(
        `Intentando consulta collectionGroup para employeeId: ${employeeId}`,
      );
      const employeesGroupRef = collectionGroup(db, "employees");
      const employeesSnapshot = await getDocs(employeesGroupRef);
      const foundDoc = employeesSnapshot.docs.find((d) => d.id === employeeId);

      if (foundDoc) {
        const data = { id: foundDoc.id, ...foundDoc.data() };
        setEmployee(data);
        // Clonación profunda para originalEmployeeData
        setOriginalEmployeeData(JSON.parse(JSON.stringify(data)));
        setEmployeeDocRef(foundDoc.ref);
        console.log("Datos del empleado obtenidos:", data);
        console.log(
          "Ruta de Document Reference almacenada:",
          foundDoc.ref.path,
        );

        // Obtener el nombre de la empresa actual
        if (data.companyId) {
          const companyDocRef = doc(db, "companies", data.companyId);
          const companyDocSnap = await getDoc(companyDocRef);
          if (companyDocSnap.exists()) {
            setCurrentCompanyName(
              companyDocSnap.data().Name ||
                t("employee_details.unknownCompany", "Empresa Desconocida"),
            );
          } else {
            setCurrentCompanyName(
              t("employee_details.unknownCompany", "Empresa Desconocida"),
            );
            console.warn(
              `Empresa con ID ${data.companyId} no encontrada para el empleado.`,
            );
          }
        } else {
          setCurrentCompanyName(
            t("employee_details.noCompanyAssigned", "Sin Empresa Asignada"),
          );
        }
      } else {
        console.error(
          `Documento de empleado con ID ${employeeId} no encontrado.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("employee_details.errors.not_found"),
        });
        setError(t("employee_details.errors.not_found"));
      }
    } catch (err) {
      console.error("Error obteniendo empleado:", err);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("employee_details.errors.fetch_error"),
      });
      setError(t("employee_details.errors.fetch_error"));
    } finally {
      setLoading(false);
    }
  }, [employeeId, t]);

  const fetchCompanies = useCallback(async () => {
    try {
      const companiesColRef = collection(db, "companies");
      const companiesSnapshot = await getDocs(companiesColRef);
      const companies = companiesSnapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().Name, // Asumiendo que el documento de empresa tiene un campo 'name'
      }));
      setCompaniesList(companies);
      console.log("Empresas obtenidas:", companies);
    } catch (err) {
      console.error("Error obteniendo empresas:", err);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "employee_details.errors.fetch_companies_error",
          "Fallo al cargar empresas",
        ),
      });
    }
  }, [t]);

  useEffect(() => {
    fetchEmployeeAndCompanyDetails();
    fetchCompanies();
  }, [fetchEmployeeAndCompanyDetails, fetchCompanies]); // MODIFICADO: dependencias

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
    // Company será un selector aparte
  ];

  const handleInputChange = (field, value) => {
    setEmployee((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const roles = ["admin", "coordinator", "employee"];

  const handleRoleSelect = (role) => {
    setEmployee((prev) => (prev ? { ...prev, role } : null));
    setRoleModalVisible(false);
  };

  const handleCompanySelect = async (companyId, companyName) => {
    if (employee && employee.companyId !== companyId) {
      setEmployee((prev) => (prev ? { ...prev, companyId: companyId } : null));
      // Actualizar el nombre de la empresa mostrada inmediatamente
      const selectedCompany = companiesList.find((c) => c.id === companyId);
      setCurrentCompanyName(
        companyName ||
          t("employee_details.unknownCompany", "Empresa Desconocida"),
      );
    }
    setIsCompanyModalVisible(false);
  };

  const moveEmployeeToNewCompany = async (
    currentEmployeeRef,
    newCompanyId,
    employeeDataToMove,
  ) => {
    const batch = writeBatch(db);
    const employeeDocId = currentEmployeeRef.id; // El ID del empleado no cambia

    // 1. Define la nueva ruta del documento del empleado
    const newEmployeeRef = doc(
      db,
      "companies",
      newCompanyId,
      "employees",
      employeeDocId,
    );

    // 2. Prepara los datos principales del empleado para la nueva ubicación
    // Asegúrate de que companyId se actualiza en los datos a mover.
    const newEmployeeData = { ...employeeDataToMove, companyId: newCompanyId };
    delete newEmployeeData.id; // No almacenes el ID como un campo si es el ID del documento

    batch.set(newEmployeeRef, newEmployeeData);
    console.log(
      `Batch: SET nuevo documento de empleado en ${newEmployeeRef.path}`,
    );

    // 3. Mover subcolecciones
    for (const subcollectionName of EMPLOYEE_SUBCOLLECTIONS) {
      const oldSubcollectionRef = collection(
        currentEmployeeRef,
        subcollectionName,
      );
      const oldSubcollectionSnapshot = await getDocs(oldSubcollectionRef);

      if (!oldSubcollectionSnapshot.empty) {
        console.log(
          `Migrando subcolección: ${subcollectionName} con ${oldSubcollectionSnapshot.size} documentos.`,
        );
        oldSubcollectionSnapshot.forEach((subDoc) => {
          // Usar el mismo ID para el sub-documento en la nueva ubicación
          const newSubDocRef = doc(
            newEmployeeRef,
            subcollectionName,
            subDoc.id,
          );
          batch.set(newSubDocRef, subDoc.data());
          console.log(
            `Batch: SET nuevo sub-doc ${subDoc.id} en ${subcollectionName} en ${newSubDocRef.path}`,
          );
          batch.delete(subDoc.ref); // Eliminar el antiguo sub-documento
          console.log(
            `Batch: DELETE antiguo sub-doc ${subDoc.id} de ${subDoc.ref.path}`,
          );
        });
      } else {
        console.log(
          `Subcolección ${subcollectionName} está vacía o no existe para el antiguo empleado.`,
        );
      }
    }

    // 4. Eliminar el antiguo documento del empleado
    batch.delete(currentEmployeeRef);
    console.log(
      `Batch: DELETE antiguo documento de empleado en ${currentEmployeeRef.path}`,
    );

    // 5. Ejecutar el batch
    await batch.commit();
    console.log("Batch de movimiento de empleado ejecutado con éxito.");
    return newEmployeeRef; // Devolver la nueva referencia
  };

  const handleSave = async () => {
    if (!employeeDocRef || !employee || !originalEmployeeData) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "errors.cannotSaveMissingRef",
          "No se puede guardar, referencia del empleado no encontrada.",
        ),
      });
      return;
    }

    setIsSaving(true);

    try {
      const newCompanyId = employee.companyId;
      const oldCompanyId = originalEmployeeData.companyId;

      // Determinar si algún dato, incluida la companyId, ha cambiado
      // Clonamos para no modificar el estado directamente antes de tiempo
      const currentEmployeeStateForCompare = { ...employee };
      const originalEmployeeStateForCompare = { ...originalEmployeeData };

      // Normalizar: asegurarse de que companyId existe en ambos para una comparación justa si uno es null/undefined
      if (currentEmployeeStateForCompare.companyId === undefined)
        currentEmployeeStateForCompare.companyId = null;
      if (originalEmployeeStateForCompare.companyId === undefined)
        originalEmployeeStateForCompare.companyId = null;

      const employeeDataHasChanged =
        JSON.stringify(currentEmployeeStateForCompare) !==
        JSON.stringify(originalEmployeeStateForCompare);
      const companyHasChanged = newCompanyId !== oldCompanyId && newCompanyId; // newCompanyId debe ser válido

      if (companyHasChanged) {
        console.log(
          `La empresa ha cambiado de ${oldCompanyId || "ninguna"} a ${newCompanyId}. Iniciando movimiento.`,
        );

        // Prepara todos los datos del empleado para mover.
        // Esto debe ser el estado actual de 'employee' que contiene todos los campos.
        const fullEmployeeDataForMove = { ...employee };
        // No es necesario eliminar 'id' aquí ya que 'moveEmployeeToNewCompany' lo maneja.

        const newRef = await moveEmployeeToNewCompany(
          employeeDocRef,
          newCompanyId,
          fullEmployeeDataForMove,
        );
        setEmployeeDocRef(newRef); // Actualizar la referencia del documento al nuevo path

        Toast.show({
          type: "success",
          text1: t("success.title"),
          text2: t(
            "employee_details.success.employeeMoved",
            "Empleado movido con éxito.",
          ),
        });
        // Actualizar datos originales para reflejar el movimiento y el nuevo estado
        setOriginalEmployeeData(JSON.parse(JSON.stringify(employee))); // Clonación profunda
      } else if (employeeDataHasChanged) {
        // La empresa no ha cambiado (o no hay nueva companyId), pero otros datos podrían haberlo hecho
        console.log(
          "La empresa no ha cambiado o no hay nueva empresa, actualizando en el lugar.",
        );
        const dataToUpdate = { ...employee };
        delete dataToUpdate.id; // No intentes actualizar el campo ID
        // companyId no debería actualizarse aquí si no fue un movimiento.
        // Si companyId es el mismo o nulo, no lo incluyas a menos que explícitamente lo estés borrando.
        if (
          dataToUpdate.companyId === oldCompanyId ||
          !dataToUpdate.companyId
        ) {
          // Si la intención es desasignar, companyId sería null y diferente de oldCompanyId (si tenía una)
          // Este caso debería ser manejado por la lógica de 'companyHasChanged' si oldCompanyId no era null.
          // Si oldCompanyId era null y newCompanyId es null, no hay cambio.
          // Si solo se están actualizando otros campos, no se toca companyId.
        }

        await updateDoc(employeeDocRef, dataToUpdate);
        Toast.show({
          type: "success",
          text1: t("success.title"),
          text2: t("success.message"), // "Cambios guardados con éxito"
        });
        setOriginalEmployeeData(JSON.parse(JSON.stringify(employee))); // Clonación profunda
      } else {
        Toast.show({
          type: "info",
          text1: t("employee_details.noChangesTitle", "Sin Cambios"),
          text2: t(
            "employee_details.noChangesMessage",
            "No se realizaron cambios.",
          ),
        });
      }

      // Refrescar la pantalla anterior
      if (employeeDataHasChanged || companyHasChanged) {
        router.replace({
          pathname: "/admin/employees", // Ajusta esta ruta si es necesario
          params: { refresh: Date.now().toString() }, // Asegura que el parámetro es string
        });
      }
    } catch (error) {
      console.error("Error guardando/moviendo empleado:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2:
          t("errors.updateError", "Error guardando cambios.") +
          ` ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- ELIMINAR EMPLEADO ---
  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeDocRef) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t(
          "errors.cannotDeleteMissingRef",
          "No se puede eliminar, referencia del empleado no encontrada.",
        ),
      });
      setIsDeleteModalVisible(false);
      return;
    }
    setIsDeleteModalVisible(false);
    setIsDeleting(true);

    try {
      // NUEVO: Borrado completo incluyendo subcolecciones usando un batch
      const batch = writeBatch(db);

      // 1. Eliminar subcolecciones
      for (const subcollectionName of EMPLOYEE_SUBCOLLECTIONS) {
        const subcollectionRef = collection(employeeDocRef, subcollectionName);
        const subcollectionSnapshot = await getDocs(subcollectionRef);
        if (!subcollectionSnapshot.empty) {
          console.log(
            `Eliminando subcolección: ${subcollectionName} con ${subcollectionSnapshot.size} documentos.`,
          );
          subcollectionSnapshot.forEach((subDoc) => {
            batch.delete(subDoc.ref);
          });
        }
      }
      // 2. Eliminar el documento principal del empleado
      batch.delete(employeeDocRef);
      console.log(
        `Batch: DELETE documento de empleado en ${employeeDocRef.path} y sus subcolecciones.`,
      );

      await batch.commit();
      // FIN NUEVO

      Toast.show({
        type: "success",
        text1: t("success.title"),
        text2: t("employee_details.success.delete"),
      });
      router.replace({
        pathname: "/admin/employees", // Ajusta esta ruta
        params: { refresh: Date.now().toString() },
      });
    } catch (error) {
      console.error("Error eliminando empleado y subcolecciones:", error); // MODIFICADO
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("employee_details.errors.delete_error") + ` ${error.message}`, // MODIFICADO
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !employee) {
    // MODIFICADO: Mostrar carga completa solo si el empleado aún no está configurado
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FF8C00" />
      </LinearGradient>
    );
  }

  if (error && !employee) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <Text style={styles.errorText}>
          {t("errors.loadingFailed", "Carga Fallida")}: {error}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.button,
            { backgroundColor: "#FF9300", minWidth: 150, marginTop: 20 },
          ]}
        >
          <Text style={styles.buttonText}>{t("common.goBack", "Volver")}</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  // Fallback si el empleado no está cargado por alguna razón (debería ser capturado por los estados anteriores)
  if (!employee) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <Text style={styles.errorText}>
          {t(
            "employee_details.errors.no_employee_data",
            "Datos del empleado no disponibles.",
          )}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.button,
            { backgroundColor: "#FF9300", minWidth: 150, marginTop: 20 },
          ]}
        >
          <Text style={styles.buttonText}>{t("common.goBack", "Volver")}</Text>
        </Pressable>
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
          {fields.map(({ key, label, editable, keyboardType }) => (
            <View key={key} style={styles.fieldContainer}>
              <Text style={styles.label}>{t(label)}</Text>
              <TextInput
                value={employee[key] || ""} // Asegurar que el valor no sea undefined
                onChangeText={(text) => handleInputChange(key, text)}
                style={[styles.input, !editable && styles.inputDisabled]}
                editable={editable}
                keyboardType={keyboardType || "default"}
                placeholder={
                  !editable
                    ? t("employee_details.not_editable", "No editable")
                    : ""
                }
                placeholderTextColor={"gray"}
              />
            </View>
          ))}

          {/* NUEVO: Campo de Selección de Empresa */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {t("employee_details.company", "Empresa")}
            </Text>
            <Pressable
              onPress={() => setIsCompanyModalVisible(true)}
              style={styles.pickerButton}
              disabled={isSaving || isDeleting || loading} // Deshabilitar si está guardando, borrando o cargando
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  !currentCompanyName && styles.pickerButtonPlaceholder,
                ]}
              >
                {currentCompanyName ||
                  t("employee_details.selectCompany", "Seleccionar Empresa")}
              </Text>
              <Ionicons name="chevron-down" size={24} color="gray" />
            </Pressable>
          </View>

          {/* Selección de Rol */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t("employee_details.role")}</Text>
            <Pressable
              onPress={() => setRoleModalVisible(true)}
              style={styles.pickerButton}
              disabled={isSaving || isDeleting || loading} // Deshabilitar consistentemente
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  !employee.role && styles.pickerButtonPlaceholder,
                ]}
              >
                {employee.role
                  ? t(`roles.${employee.role}`, employee.role)
                  : t("employee_details.selectRole")}
              </Text>
              <Ionicons name="chevron-down" size={24} color="gray" />
            </Pressable>
          </View>

          {/* NUEVO: Modal de Empresa */}
          <Modal
            visible={isCompanyModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsCompanyModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPressOut={() => setIsCompanyModalVisible(false)} // Cerrar al tocar fuera
            >
              <View
                style={styles.modalContent}
                onStartShouldSetResponder={() => true} // Evita que el clic en el overlay pase a través
              >
                <ScrollView>
                  {companiesList.length > 0 ? (
                    companiesList.map((company) => (
                      <TouchableOpacity
                        key={company.id}
                        onPress={() =>
                          handleCompanySelect(company.id, company.name)
                        }
                        style={[
                          styles.modalItem,
                          // Resaltar la empresa seleccionada actualmente en el estado del empleado
                          employee?.companyId === company.id &&
                            styles.modalItemSelected,
                        ]}
                      >
                        <Text style={styles.modalItemText}>{company.name}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.modalItemText}>
                      {t(
                        "employee_details.noCompaniesAvailable",
                        "No hay empresas disponibles",
                      )}
                    </Text>
                  )}
                </ScrollView>
                <Pressable
                  onPress={() => setIsCompanyModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseButtonText}>
                    {t("employee_details.close", "Cerrar")}
                  </Text>
                </Pressable>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Modal de Rol (existente) */}
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
                <ScrollView>
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role}
                      onPress={() => handleRoleSelect(role)}
                      style={[
                        styles.modalItem,
                        employee?.role === role && styles.modalItemSelected, // Resaltar rol seleccionado
                      ]}
                    >
                      <Text style={styles.modalItemText}>
                        {t(`roles.${role}`, role)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={() => setRoleModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseButtonText}>
                    {t("employee_details.close", "Cerrar")}
                  </Text>
                </Pressable>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Botones de Acción */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || isDeleting || loading} // MODIFICADO: deshabilitar si está cargando también
              style={[
                styles.button,
                styles.saveButton,
                (isSaving || isDeleting || loading) && styles.buttonDisabled,
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
              disabled={isSaving || isDeleting || loading} // MODIFICADO
              style={[
                styles.button,
                styles.deleteButton,
                (isSaving || isDeleting || loading) && styles.buttonDisabled,
              ]}
            >
              {isDeleting ? ( // NUEVO: Spinner para el botón de borrar
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.buttonSpinner}
                />
              ) : (
                <Text style={styles.buttonText}>
                  {t("employee_details.delete")}
                </Text>
              )}
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
  },
  headerIcon: {
    width: isTablet ? 70 : 50,
    height: isTablet ? 70 : 50,
  },
  headerTitleContainer: {
    flex: 1, // Allow container to take available space
    alignItems: "center", // Center titles horizontally
    marginHorizontal: 10, // Add space between icons and title block
  },
  headerTitleMain: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginHorizontal: 10,
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  headerTitleSub: {
    fontSize: 24,
    fontWeight: "light",
    color: "white",
    letterSpacing: 2,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
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
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
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
