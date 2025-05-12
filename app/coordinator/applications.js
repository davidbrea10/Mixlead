import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { db, auth } from "../../firebase/config";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  writeBatch, // Para operaciones atómicas
  collectionGroup,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { t } from "i18next";
import Toast from "react-native-toast-message";

export default function ApplicationsScreen() {
  const router = useRouter();
  // const { t } = useTranslation(); // Use the hook if possible
  const [expandedRows, setExpandedRows] = useState({});
  const [applications, setApplications] = useState([]);
  // Remove successMessage state, use Toast directly
  // const [successMessage, setSuccessMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state for initial fetch
  const [actionLoading, setActionLoading] = useState(false);

  const [coordinatorInfo, setCoordinatorInfo] = useState({
    id: null, // UID del coordinador
    companyId: null, // CompanyID del coordinador
    // companyName: null, // Opcional si necesitas mostrar el nombre de la compañía del coordinador
  });

  const loadCoordinatorAndApplications = useCallback(async () => {
    setIsLoading(true);
    setApplications([]); // Limpiar aplicaciones previas
    const user = auth.currentUser;
    if (!user) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.notLoggedIn"),
      });
      setIsLoading(false);
      router.replace("/auth/login"); // Redirigir si no está logueado
      return;
    }

    try {
      // 1. Obtener el documento del coordinador actual y su companyId
      const employeesGroupRef = collectionGroup(db, "employees");
      const coordQuery = query(
        employeesGroupRef,
        where("email", "==", user.email),
      );
      const coordSnapshot = await getDocs(coordQuery);

      if (coordSnapshot.empty) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t(
            "errors.coordinatorProfileNotFound",
            "Perfil de coordinador no encontrado.",
          ),
        });
        setIsLoading(false);
        return;
      }

      const coordDoc = coordSnapshot.docs[0];
      const coordData = coordDoc.data();
      const fetchedCoordinatorId = coordDoc.id; // Es user.uid
      const fetchedCoordinatorCompanyId = coordData.companyId;

      if (!fetchedCoordinatorCompanyId) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t(
            "errors.coordinatorNoCompany",
            "Coordinador no asignado a una empresa.",
          ),
        });
        setIsLoading(false);
        return;
      }

      setCoordinatorInfo({
        id: fetchedCoordinatorId,
        companyId: fetchedCoordinatorCompanyId,
      });
      console.log("Coordinator Info Set:", {
        id: fetchedCoordinatorId,
        companyId: fetchedCoordinatorCompanyId,
      });

      // 2. Cargar solicitudes usando el companyId y userId (coordId) del coordinador
      const appsRef = collection(
        db,
        "companies",
        fetchedCoordinatorCompanyId,
        "employees",
        fetchedCoordinatorId,
        "applications",
      );
      const snapshot = await getDocs(appsRef);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id, // Este es el UID del solicitante
        ...doc.data(),
      }));
      setApplications(data);
      console.log(`Loaded ${data.length} applications.`);
    } catch (err) {
      console.error("Error loading coordinator/applications:", err);
      if (err.code === "failed-precondition") {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.firestoreIndexRequired"),
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.loadApplicationsFailed"),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [t, router]); // t y router como dependencias

  useFocusEffect(
    useCallback(() => {
      // Ahora, solo llamamos a la función (que ya está memoizada)
      loadCoordinatorAndApplications();

      // Puedes devolver una función de limpieza si es necesario
      // return () => {
      //   console.log("ApplicationsScreen lost focus or unmounted");
      //   // Lógica de limpieza aquí (ej. abortar fetches, limpiar listeners)
      // };
    }, [loadCoordinatorAndApplications]), // La dependencia es la función memoizada
  );

  const handleExpandRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAccept = async (application) => {
    if (!coordinatorInfo.id || !coordinatorInfo.companyId) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.coordinatorDataMissing"),
      });
      return;
    }
    if (!application || !application.id || !application.email) {
      // Email es crucial para buscar el original
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.invalidApplicationData"),
      });
      return;
    }

    setActionLoading(true);
    const batch = writeBatch(db);
    const applicantId = application.id;
    const targetCompanyId = coordinatorInfo.companyId;

    // Nombres de las subcolecciones que esperas que un empleado pueda tener
    const employeeSubcollectionNames = ["doses", "materials"]; // Añade otras si existen

    try {
      // 1. Encontrar el documento original del solicitante (si existe)
      //    Esto es para obtener sus datos y la referencia a sus subcolecciones originales.
      const employeesGroupRef = collectionGroup(db, "employees");
      const applicantQuery = query(
        employeesGroupRef,
        where("email", "==", application.email),
      );
      const applicantSnapshot = await getDocs(applicantQuery);

      let originalApplicantDocRef = null;
      let originalApplicantData = {}; // Para fusionar con datos de la aplicación

      if (!applicantSnapshot.empty) {
        const originalDocSnap = applicantSnapshot.docs[0];
        originalApplicantDocRef = originalDocSnap.ref;
        originalApplicantData = originalDocSnap.data();
        console.log(
          "Found original applicant document at:",
          originalApplicantDocRef.path,
        );

        // Si el documento original ya está en la compañía de destino, es un caso extraño (quizás una aplicación duplicada)
        // pero nos aseguramos de no intentar borrarlo y volverlo a crear en el mismo sitio.
        if (
          originalApplicantData.companyId === targetCompanyId &&
          originalApplicantDocRef.id === applicantId
        ) {
          console.warn(
            "Applicant seems to already be in the target company. Proceeding to clean up application only.",
          );
          // No es necesario mover el documento principal ni sus subcolecciones.
          // Solo se eliminarán las solicitudes de los coordinadores.
          originalApplicantDocRef = null; // Anular para que no se procese el borrado/movimiento
        }
      } else {
        console.log(
          "No existing employee document found for applicant email:",
          application.email,
          ". A new employee profile will be created in the target company.",
        );
      }

      // 2. Preparar los datos del empleado para la nueva compañía (o actualizar si ya estaba)
      const newEmployeeData = {
        // Datos de la aplicación (pueden ser más actualizados para nombre/DNI)
        firstName:
          application.firstName || originalApplicantData.firstName || "",
        lastName: application.lastName || originalApplicantData.lastName || "",
        dni: application.dni || originalApplicantData.dni || "",
        email: application.email, // El email de la aplicación debería ser el maestro
        // Datos del documento original (si existían y no están en la aplicación)
        birthDate:
          originalApplicantData.birthDate || application.birthDate || null,
        phone: originalApplicantData.phone || application.phone || null,
        // Asignación de rol y compañía
        role: originalApplicantData.role || "employee", // Mantener rol si existía, sino 'employee'
        companyId: targetCompanyId,
        createdAt: originalApplicantData.createdAt || new Date(), // Mantener createdAt original si es un movimiento
        updatedAt: new Date(), // Marcar cuándo se actualizó/movió
      };

      // 3. Referencia al nuevo (o actualizado) documento del empleado
      const newEmployeeDocRef = doc(
        db,
        "companies",
        targetCompanyId,
        "employees",
        applicantId,
      );
      batch.set(newEmployeeDocRef, newEmployeeData, { merge: true }); // Crear o fusionar en la nueva ubicación
      console.log(
        "Scheduled set/update for applicant at new path:",
        newEmployeeDocRef.path,
      );

      // 4. Mover subcolecciones si había un documento original y no estaba ya en la compañía de destino
      if (
        originalApplicantDocRef &&
        originalApplicantDocRef.path !== newEmployeeDocRef.path
      ) {
        for (const subcollectionName of employeeSubcollectionNames) {
          const oldSubcollectionRef = collection(
            db,
            originalApplicantDocRef.path,
            subcollectionName,
          );
          const oldSubDocsSnapshot = await getDocs(oldSubcollectionRef);

          if (!oldSubDocsSnapshot.empty) {
            console.log(
              `Moving ${oldSubDocsSnapshot.size} docs from subcollection '${subcollectionName}' of ${originalApplicantDocRef.id}`,
            );
            oldSubDocsSnapshot.forEach((subDoc) => {
              const newSubDocRef = doc(
                db,
                newEmployeeDocRef.path,
                subcollectionName,
                subDoc.id,
              );
              batch.set(newSubDocRef, subDoc.data()); // Copiar a la nueva ubicación
              batch.delete(subDoc.ref); // Eliminar de la ubicación antigua
              console.log(
                `  - Scheduled move for ${subcollectionName}/${subDoc.id}`,
              );
            });
          }
        }
        // 5. Eliminar el documento principal original (después de mover subcolecciones)
        console.log(
          "Scheduled deletion of original applicant document:",
          originalApplicantDocRef.path,
        );
        batch.delete(originalApplicantDocRef);
      }

      // 6. Encontrar todos los coordinadores de la MISMA compañía para eliminar la aplicación
      const coordinatorsInCompanyRef = collection(
        db,
        "companies",
        targetCompanyId,
        "employees",
      );
      const coordinatorsQuery = query(
        coordinatorsInCompanyRef,
        where("role", "==", "coordinator"),
      );
      const coordinatorsSnap = await getDocs(coordinatorsQuery);

      coordinatorsSnap.forEach((coordDoc) => {
        const appRef = doc(
          db,
          "companies",
          targetCompanyId,
          "employees",
          coordDoc.id,
          "applications",
          applicantId,
        );
        batch.delete(appRef);
        console.log(
          "Scheduled deletion of application from coordinator:",
          coordDoc.id,
        );
      });

      // 7. Ejecutar todas las operaciones en lote
      await batch.commit();

      Toast.show({
        type: "success",
        text1: t("success_title"),
        text2: t("applications.successMessageAccepted"),
      });
      loadCoordinatorAndApplications(); // Recargar la lista
    } catch (error) {
      console.error("Error accepting application:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.acceptApplicationFailed"),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDecline = async () => {
    if (!selectedApplication || !selectedApplication.id) {
      /* ... validación ... */ return;
    }
    if (!coordinatorInfo.id || !coordinatorInfo.companyId) {
      /* ... validación ... */ return;
    }

    setActionLoading(true);
    setIsModalVisible(false); // Cerrar modal
    const batch = writeBatch(db);
    const applicantId = selectedApplication.id;
    const targetCompanyId = coordinatorInfo.companyId; // La compañía del coordinador actual

    try {
      // Encontrar todos los coordinadores de ESA compañía
      const coordinatorsInCompanyRef = collection(
        db,
        "companies",
        targetCompanyId,
        "employees",
      );
      const coordinatorsQuery = query(
        coordinatorsInCompanyRef,
        where("role", "==", "coordinator"),
      );
      const coordinatorsSnap = await getDocs(coordinatorsQuery);

      // Eliminar la aplicación de la subcolección de cada coordinador de esa compañía
      coordinatorsSnap.forEach((coordDoc) => {
        const appRef = doc(
          db,
          "companies",
          targetCompanyId,
          "employees",
          coordDoc.id,
          "applications",
          applicantId,
        );
        batch.delete(appRef);
      });

      await batch.commit();

      Toast.show({
        type: "success",
        text1: t("success_title"),
        text2: t("applications.successMessageDeclined"),
      });
      setSelectedApplication(null);
      loadCoordinatorAndApplications(); // Recargar
    } catch (error) {
      console.error("Error declining application:", error);
      Toast.show({
        type: "error",
        text1: t("error_title"),
        text2: t("errors.declineApplicationFailed"),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9300" />
      </View>
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
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>

        {/* Contenedor centrado */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              letterSpacing: 2,
              textShadowColor: "black",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 1,
            }}
          >
            {t("applications.appTitle")}
          </Text>
        </View>

        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      {/* Cabecera de la tabla */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("applications.name")}
        </Text>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("applications.lastName")}
        </Text>
        <Text style={[styles.headerCell, { flex: 0.5 }]}>
          {t("applications.view")}
        </Text>
      </View>
      <ScrollView style={{ minWidth: "100%" }}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF9300" />
          </View>
        ) : applications.length === 0 ? (
          <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
            {t("applications.noApplications")}
          </Text>
        ) : (
          applications.map((item, index) => (
            <View key={index}>
              <View
                style={[
                  styles.row,
                  { backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" },
                ]}
              >
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {item.firstName}
                </Text>
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {item.lastName}
                </Text>
                <TouchableOpacity
                  style={[styles.cell, styles.eyeButton, { flex: 0.5 }]}
                  onPress={() => handleExpandRow(index)}
                >
                  <Ionicons
                    name={expandedRows[index] ? "eye-off" : "eye"}
                    size={22}
                    color="#007AFF"
                  />
                </TouchableOpacity>
              </View>

              {expandedRows[index] && (
                <View style={[styles.expandedRow]}>
                  <Text style={[styles.expandedText, { marginBottom: 10 }]}>
                    DNI: {item.dni}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 10, // Esto ayuda en web, pero para React Native mejor usar marginHorizontal
                      marginTop: 10,
                    }}
                  >
                    <Pressable
                      style={{
                        flex: 1,
                        backgroundColor: "#C32427",
                        paddingVertical: 12,
                        borderRadius: 10,
                        marginRight: 5,
                      }}
                      onPress={() => {
                        setSelectedApplication(item);
                        setIsModalVisible(true);
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 19,
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {t("applications.declineButton")}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={{
                        flex: 1,
                        backgroundColor: "#169200",
                        paddingVertical: 12,
                        borderRadius: 10,
                        marginLeft: 5,
                      }}
                      onPress={() => handleAccept(item)}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 19,
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {t("applications.acceptButton")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

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

      <Modal
        transparent
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <View
            style={{
              backgroundColor: "#1F1F1F",
              padding: 24,
              borderRadius: 20,
              width: 300,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {t("applications.modalTitle")}
            </Text>

            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={{
                  backgroundColor: "#2D2D2D",
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "white", fontSize: 16 }}>
                  {t("applications.modalCancelButton")}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmDecline}
                style={{
                  backgroundColor: "#2B4B76",
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "white", fontSize: 16 }}>
                  {t("applications.modalConfirmButton")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Estilos de Tabla
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1, // Línea más fina
    borderColor: "#eee", // Color más suave
  },
  headerRow: {
    backgroundColor: "#f8f8f8", // Fondo ligero para cabecera
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  headerCell: {
    fontSize: 16, // Tamaño de cabecera
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    paddingVertical: 14, // Más padding vertical
  },
  cell: {
    fontSize: 15, // Tamaño de celda de datos
    textAlign: "center",
    paddingVertical: 14,
    color: "#444",
  },
  cellBorder: {
    borderRightWidth: 1,
    borderColor: "#eee", // Color más suave
  },
  eyeButton: {
    alignItems: "center",
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16, // Tamaño adecuado para mensaje
    color: "#888", // Gris más oscuro
    marginTop: 40, // Más espacio superior
    paddingHorizontal: 20,
  },
  expandedRow: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  expandedText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
  },
});
