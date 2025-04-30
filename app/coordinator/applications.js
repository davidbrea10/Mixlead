import React, { useState, useEffect } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { db, auth } from "../../firebase/config";
import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { t } from "i18next";

export default function DoseDetails() {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState({});
  const [applications, setApplications] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const loadApplications = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const appsRef = collection(db, "employees", user.uid, "applications");
      const snapshot = await getDocs(appsRef);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setApplications(data);
    } catch (err) {
      console.error("Error loading applications:", err);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleExpandRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAccept = async (application) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // 1. Obtener el companyId del coordinador actual
      const currentUserRef = doc(db, "employees", currentUser.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      if (!currentUserSnap.exists())
        throw new Error("Authenticated user not found.");

      const currentCompanyId = currentUserSnap.data().companyId;

      // 2. Actualizar el employee que fue aceptado (unirlo a la empresa)
      const targetEmployeeRef = doc(db, "employees", application.id);
      await updateDoc(targetEmployeeRef, {
        companyId: currentCompanyId,
      });

      // 3. Buscar a todos los coordinadores con ese mismo companyId
      const employeesRef = collection(db, "employees");
      const coordinatorsQuery = query(
        employeesRef,
        where("companyId", "==", currentCompanyId),
        where("role", "==", "coordinator"),
      );

      const coordinatorsSnap = await getDocs(coordinatorsQuery);

      // 4. Eliminar la solicitud en cada coordinador
      const deletePromises = coordinatorsSnap.docs.map((docSnap) => {
        const coordinatorId = docSnap.id;
        const appRef = doc(
          db,
          "employees",
          coordinatorId,
          "applications",
          application.id,
        );
        return deleteDoc(appRef);
      });

      await Promise.all(deletePromises);

      setSuccessMessage(t("applications.successMessageAccepted"));
      // eslint-disable-next-line no-undef
      setTimeout(() => setSuccessMessage(""), 3000);

      // 5. Refrescar la lista
      loadApplications();
    } catch (error) {
      console.error("Error accepting application:", error);
    }
  };

  const handleConfirmDecline = async () => {
    try {
      if (!selectedApplication) return;

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const currentUserRef = doc(db, "employees", currentUser.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      if (!currentUserSnap.exists()) throw new Error("User not found.");

      const currentCompanyId = currentUserSnap.data().companyId;

      const employeesRef = collection(db, "employees");
      const coordinatorsQuery = query(
        employeesRef,
        where("companyId", "==", currentCompanyId),
        where("role", "==", "coordinator"),
      );

      const coordinatorsSnap = await getDocs(coordinatorsQuery);

      const deletePromises = coordinatorsSnap.docs.map((docSnap) => {
        const coordinatorId = docSnap.id;
        const appRef = doc(
          db,
          "employees",
          coordinatorId,
          "applications",
          selectedApplication.id,
        );
        return deleteDoc(appRef);
      });

      await Promise.all(deletePromises);

      setSuccessMessage(t("applications.successMessageDeclined"));
      // eslint-disable-next-line no-undef
      setTimeout(() => setSuccessMessage(""), 3000);

      setIsModalVisible(false);
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      console.error("Error declining application:", error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

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
        {/* Datos */}
        {applications.length === 0 ? (
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

      {successMessage ? (
        <View style={{ padding: 12, alignItems: "center" }}>
          <Text
            style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              fontSize: 20,
              fontWeight: "bold",
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 10,
            }}
          >
            {successMessage}
          </Text>
        </View>
      ) : null}

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
