import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  where,
  getDocs,
  query,
  collectionGroup,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../locales/i18n";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import Toast from "react-native-toast-message";

export default function Profile() {
  const { t } = useTranslation();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noCompanyDocId, setNoCompanyDocId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const fadeErrorAnim = useRef(new Animated.Value(1)).current;

  const authInstance = getAuth();
  const dbInstance = getFirestore();

  useEffect(() => {
    const fetchUserDataAndNoCompanyId = async () => {
      setLoading(true);
      setError(null);
      setUserData(null);
      setCompanyName(null);
      setNoCompanyDocId(null); // Resetear

      let fetchedUserData = null;
      let fetchedUserCompanyId = null;
      let actualNoCompanyId = null;

      try {
        // Primero, identificar el ID de "No Company"
        // AJUSTA "No Company" AL NOMBRE REAL O IDENTIFICADOR EN TU FIRESTORE
        const companiesRef = collection(dbInstance, "companies");
        const noCompanyQuery = query(
          companiesRef,
          where("Name", "==", "No Company"),
        );
        const noCompanySnapshot = await getDocs(noCompanyQuery);

        if (!noCompanySnapshot.empty) {
          actualNoCompanyId = noCompanySnapshot.docs[0].id;
          setNoCompanyDocId(actualNoCompanyId);
          console.log(
            "Actual 'No Company' ID identified as:",
            actualNoCompanyId,
          );
        } else {
          console.warn(
            "'No Company' document not found in 'companies' collection. Functionality relying on it might be affected.",
          );
        }

        // Luego, buscar los datos del usuario actual
        const user = authInstance.currentUser;
        if (user) {
          const employeesQueryRef = collectionGroup(dbInstance, "employees");
          const q = query(employeesQueryRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDocSnap = querySnapshot.docs[0];
            fetchedUserData = userDocSnap.data();
            fetchedUserCompanyId = fetchedUserData.companyId; // ID de la compañía actual del usuario
            console.log("User data fetched from path:", userDocSnap.ref.path);

            // Formatear fecha de nacimiento
            if (fetchedUserData.birthDate) {
              const dateParts = fetchedUserData.birthDate.split("-");
              let birthDateObj;
              if (dateParts.length === 3) {
                birthDateObj = new Date(
                  Date.UTC(
                    parseInt(dateParts[0]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[2]),
                  ),
                );
              } else {
                birthDateObj = new Date(fetchedUserData.birthDate);
              }
              if (!isNaN(birthDateObj.getTime())) {
                fetchedUserData.formattedBirthDate = format(
                  birthDateObj,
                  "dd MMMM yyyy",
                  {
                    locale: i18n.language === "es" ? es : enUS,
                  },
                );
              } else {
                fetchedUserData.formattedBirthDate = fetchedUserData.birthDate;
              }
            } else {
              fetchedUserData.formattedBirthDate = t(
                "profile.notAvailable",
                "N/A",
              );
            }
            setUserData(fetchedUserData);

            // Determinar el companyName a mostrar
            if (
              fetchedUserCompanyId === actualNoCompanyId &&
              actualNoCompanyId !== null
            ) {
              setCompanyName(t("profile.noCompanyAssigned")); // Mostrar "No asignado" si está en "No Company"
            } else if (fetchedUserCompanyId) {
              const companyRef = doc(
                dbInstance,
                "companies",
                fetchedUserCompanyId,
              );
              const companySnap = await getDoc(companyRef);
              if (companySnap.exists()) {
                setCompanyName(
                  companySnap.data().Name ||
                    companySnap.data().name ||
                    t("profile.unknownCompany"),
                );
              } else {
                console.warn(
                  `Company with ID ${fetchedUserCompanyId} not found for user ${user.uid}.`,
                );
                setCompanyName(t("profile.noCompanyAssigned"));
              }
            } else {
              setCompanyName(t("profile.noCompanyAssigned"));
            }
          } else {
            setError(t("profile.userDataNotFound"));
          }
        } else {
          setError(t("profile.userNotAuthenticated"));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.code === "failed-precondition") {
          setError(t("errors.firestoreIndexRequired"));
        } else {
          setError(`${t("profile.fetchUserDataError")}: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    const handleLanguageChange = () => {
      if (authInstance.currentUser) {
        fetchUserDataAndNoCompanyId();
      }
    };
    i18n.on("languageChanged", handleLanguageChange);
    fetchUserDataAndNoCompanyId();
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n.language]);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    // Esta ruta sugiere que es un perfil de empleado normal
    router.replace("/coordinator/home");
  };

  const handleCompanyModalOpen = () => {
    setCompanyCode("");
    setErrorMessage("");
    setCodeSubmitted(false);
    setModalVisible(true);
  };

  const handleCompanyCodeSubmit = async () => {
    if (companyCode.trim() === "") {
      setErrorMessage(t("profile.modal.submitEmpty", "Code cannot be empty."));
      // ... animación de error ...
      return;
    }
    setSubmitLoading(true);
    setErrorMessage("");
    try {
      const user = authInstance.currentUser;
      if (!user || !userData) {
        // userData también es necesario para los datos de la aplicación
        setErrorMessage(
          t("profile.modal.submitUserError", "User not available."),
        );
        setSubmitLoading(false);
        return;
      }
      const userId = user.uid;
      const targetCompanyId = companyCode.trim(); // companyCode es el ID de la compañía destino

      // Verificar si la compañía a la que se aplica existe
      const targetCompanyRef = doc(dbInstance, "companies", targetCompanyId);
      const targetCompanySnap = await getDoc(targetCompanyRef);
      if (!targetCompanySnap.exists()) {
        setErrorMessage(
          t("profile.modal.submitInvalidCode", "Invalid company code."),
        );
        setSubmitLoading(false);
        return;
      }

      // --- MODIFICACIÓN: Buscar coordinadores DENTRO de la compañía especificada por companyCode ---
      const coordinatorsInTargetCompanyRef = collection(
        dbInstance,
        "companies",
        targetCompanyId,
        "employees",
      );
      const coordinatorsQuery = query(
        coordinatorsInTargetCompanyRef,
        where("role", "==", "coordinator"),
      );
      // --- FIN MODIFICACIÓN ---

      const coordinatorsSnap = await getDocs(coordinatorsQuery);

      if (coordinatorsSnap.empty) {
        setErrorMessage(
          t(
            "profile.modal.submitNoCoordinators",
            "No coordinators found for this company to process applications.",
          ),
        );
        setSubmitLoading(false);
        return;
      }

      let alreadyAppliedToAnyCoordinatorInThisCompany = false;
      let applicationSent = false;

      for (const coordinatorDoc of coordinatorsSnap.docs) {
        const coordinatorId = coordinatorDoc.id;

        // --- MODIFICACIÓN: Ruta para la subcolección 'applications' ---
        const applicationRef = doc(
          dbInstance,
          "companies",
          targetCompanyId,
          "employees",
          coordinatorId,
          "applications",
          userId,
        );
        // --- FIN MODIFICACIÓN ---

        const existingApp = await getDoc(applicationRef);

        if (!existingApp.exists()) {
          await setDoc(applicationRef, {
            id: userId, // ID del aplicante
            firstName: userData.firstName,
            lastName: userData.lastName,
            dni: userData.dni,
            email: userData.email, // Guardar email del aplicante
            createdAt: new Date(),
            status: "pending", // Estado inicial de la aplicación
          });
          applicationSent = true;
          console.log(
            `Application sent to coordinator ${coordinatorId} in company ${targetCompanyId}`,
          );
        } else {
          console.log(
            `Application already exists for coordinator ${coordinatorId} in company ${targetCompanyId}`,
          );
          alreadyAppliedToAnyCoordinatorInThisCompany = true;
        }
      }

      if (applicationSent) {
        setCodeSubmitted(true);
        // ... animación de éxito ...
        // eslint-disable-next-line no-undef
        setTimeout(() => setModalVisible(false), 3500); // Cerrar modal tras éxito
      } else if (alreadyAppliedToAnyCoordinatorInThisCompany) {
        setErrorMessage(
          t(
            "profile.modal.submitAlreadySent",
            "Application already sent to this company.",
          ),
        );
      } else {
        // Esto no debería ocurrir si se encontraron coordinadores y no había aplicaciones previas
        setErrorMessage(
          t("profile.modal.submitError", "Could not send application."),
        );
      }
    } catch (err) {
      console.error("Error submitting company code:", err);
      setErrorMessage(t("profile.modal.submitError", "An error occurred."));
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator
          size={Platform.OS === "ios" ? "large" : 50}
          color="#FF8C00"
        />
      </LinearGradient>
    );
  }

  const showJoinCompanyButton =
    !userData?.companyId ||
    (noCompanyDocId && userData?.companyId === noCompanyDocId);

  if (error) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Ionicons name="alert-circle-outline" size={60} color="red" />
        <Text
          style={{
            color: "red",
            fontSize: 18,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          {error}
        </Text>
        <Pressable
          onPress={() => router.replace("/auth/login")}
          style={{
            marginTop: 20,
            backgroundColor: "#FF9300",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontSize: 16 }}>
            {t("common.goToLogin", "Go to Login")}
          </Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: "#FF9300",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          borderBottomStartRadius: 40,
          elevation: 10,
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
          {t("profile.title")}
        </Text>

        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {[
          { label: t("profile.name"), value: userData?.firstName },
          { label: t("profile.lastName"), value: userData?.lastName },
          { label: t("profile.dni"), value: userData?.dni },
          { label: t("profile.telephone"), value: userData?.phone },
          { label: t("profile.birth"), value: userData?.formattedBirthDate }, // Usar fecha formateada
          { label: t("profile.email"), value: userData?.email },
        ].map((item, index) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#333",
                marginBottom: 3,
              }}
            >
              {item.label}
            </Text>
            <Text style={{ fontSize: 18, color: "#555", marginBottom: 8 }}>
              {item.value || t("profile.notAvailable", "N/A")}
            </Text>
            <View style={{ height: 1, backgroundColor: "#ccc" }} />
          </View>
        ))}

        {userData && (
          <View style={{ marginBottom: 15 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#333",
                marginBottom: 3,
              }}
            >
              {t("profile.companyName")}
            </Text>
            <Text style={{ fontSize: 18, color: "#555", marginBottom: 3 }}>
              {companyName || t("profile.notAvailable", "N/A")}
            </Text>
            {/* Mostrar y permitir copiar el companyId si existe */}
            {userData.companyId && ( // Solo mostrar si hay un companyId
              <Text
                style={{
                  fontSize: 14,
                  marginTop: 2,
                }}
              >
                {/* Añadir una etiqueta para el ID */}
                {t("profile.companyIdentifierLabel", "ID:")}{" "}
                {userData.companyId}
              </Text>
            )}
            <View
              style={{ height: 1, backgroundColor: "#ccc", marginTop: 8 }}
            />
          </View>
        )}

        {showJoinCompanyButton && ( // <-- Condición actualizada
          <View style={{ marginTop: 30, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              {t("profile.joinCompanyQuestion")}
            </Text>
            <Pressable
              onPress={handleCompanyModalOpen}
              style={{
                backgroundColor: "#0077B6",
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
                paddingHorizontal: 30,
              }}
            >
              <Text
                style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
              >
                {t("profile.joinCompanyAction")}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
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
              backgroundColor: "white",
              padding: 24,
              borderRadius: 16,
              width: "90%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              {t("profile.modal.title", "Join a Company")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                marginBottom: 20,
                textAlign: "center",
                color: "#555",
              }}
            >
              {t(
                "profile.modal.description",
                "Enter the code provided by your company to send a join request.",
              )}
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
                color: "#333",
              }}
            >
              {t("profile.modal.companyCodeLabel", "Company Code:")}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <TextInput
                value={companyCode}
                onChangeText={(text) => {
                  setCompanyCode(text);
                  setErrorMessage("");
                  setCodeSubmitted(false);
                  fadeAnim.setValue(1);
                }}
                placeholder={t(
                  "profile.modal.companyCodePlaceholder",
                  "Enter code",
                )}
                placeholderTextColor={"gray"}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  marginRight: 10,
                }}
                autoCapitalize="none"
              />
              <Pressable
                onPress={handleCompanyCodeSubmit}
                disabled={submitLoading}
                style={{
                  backgroundColor: submitLoading ? "#ccc" : "#0077B6",
                  padding: 12,
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  minWidth: 50,
                }}
              >
                {submitLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="arrow-forward" size={24} color="white" />
                )}
              </Pressable>
            </View>

            {errorMessage !== "" && (
              <Animated.View
                style={{ opacity: fadeErrorAnim, marginBottom: 10 }}
              >
                <Text
                  style={{
                    color: "red",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  {errorMessage}
                </Text>
              </Animated.View>
            )}
            {codeSubmitted && (
              <Animated.View style={{ opacity: fadeAnim, marginBottom: 10 }}>
                <Text
                  style={{
                    color: "#2E7D32",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  {t("profile.modal.submitSuccess", "Request Sent!")}
                </Text>
              </Animated.View>
            )}

            <Pressable
              onPress={() => setModalVisible(false)}
              style={{ alignSelf: "center", marginTop: 10, paddingVertical: 8 }}
            >
              <Text style={{ color: "#0077B6", fontSize: 16 }}>
                {t("common.cancel", "Cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
          padding: 40,
          alignItems: "flex-end",
          borderTopEndRadius: 40,
          elevation: 10,
        }}
      />
    </LinearGradient>
  );
}
