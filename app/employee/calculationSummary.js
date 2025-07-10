import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next"; // Importar el hook de traducción
import { useState, useCallback } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  where,
  query,
  collectionGroup,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function CalculationSummary() {
  const router = useRouter();
  const { t } = useTranslation(); // Inicializar traducción
  const params = useLocalSearchParams();

  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [dose, setDose] = useState(""); // Dose value from modal input
  const [modalTotalExposures, setModalTotalExposures] = useState(""); // Exposures from modal input

  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");

  const [startTime, setStartTime] = useState(new Date());
  const [formattedStartTime, setFormattedStartTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Inside your CalculationSummary component, typically after other hooks
  const _fetchActiveUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user authenticated for _fetchActiveUserData.");
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", { defaultValue: "Error" }),
        text2: t("errors.userNotLoggedIn", {
          defaultValue: "User not logged in.",
        }),
        position: "bottom",
      });
      return null;
    }

    try {
      const employeesQueryRef = collectionGroup(db, "employees");
      // Query by email, ensure your Firestore 'employees' documents contain 'email' and 'role' fields.
      // Adjust if you query by user.uid directly (e.g., if 'uid' is a field in those documents).
      const q = query(employeesQueryRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDocSnap = querySnapshot.docs[0];
        const userData = userDocSnap.data();
        const result = { companyId: null, role: null };

        if (userData.companyId) {
          result.companyId = userData.companyId;
        } else {
          console.warn(
            `User (email: ${user.email}) document is missing companyId.`,
          );
        }

        if (userData.role) {
          // Assuming the role is stored under a field named 'role'
          result.role = userData.role;
        } else {
          console.warn(`User (email: ${user.email}) document is missing role.`);
        }

        if (!result.companyId && !result.role) {
          console.warn(
            `User (email: ${user.email}) document is missing both companyId and role.`,
          );
        }
        return result; // Contains { companyId: '...', role: '...' } or with nulls
      } else {
        console.warn(
          `Could not find employee document for email ${user.email}.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", { defaultValue: "Error" }),
          text2: t("errors.userDataNotFound", {
            defaultValue: "User data not found.",
          }), // Add this translation key
          position: "bottom",
        });
        return null;
      }
    } catch (error) {
      console.error("Error fetching active user data:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", { defaultValue: "Error" }),
        text2: t("errors.fetchActiveUserDataError", {
          defaultValue: "Failed to fetch user data.",
        }), // Add this translation key
        position: "bottom",
      });
      return null;
    }
  }, [t]); // auth and db are stable module imports. t is from useTranslation.

  const handleBack = () => {
    router.back();
  };

  // Inside your CalculationSummary component

  const handleHome = useCallback(async () => {
    const activeUserData = await _fetchActiveUserData(); // Fetch user data including role

    if (activeUserData && activeUserData.role) {
      const userRole = activeUserData.role.toLowerCase(); // Normalize role for robust comparison
      if (userRole === "coordinator") {
        router.replace("/coordinator/home");
      } else if (userRole === "employee") {
        router.replace("/employee/home");
      } else {
        // Fallback for unknown roles
        console.warn(
          `Unknown user role: '${activeUserData.role}'. Defaulting to employee home.`,
        );
        Toast.show({
          type: "warning",
          text1: t("warnings.roleUnknownTitle", {
            defaultValue: "Unknown Role",
          }),
          text2: t("warnings.defaultEmployeeNavigationUnknownRole", {
            defaultValue: `Role '${activeUserData.role}' is not recognized. Navigating to default home.`,
          }), // Add this translation key
          position: "bottom",
        });
        router.replace("/employee/home");
      }
    } else {
      // Fallback if role couldn't be determined (e.g., user not logged in, data missing)
      // A more specific Toast might have already been shown by _fetchActiveUserData.
      console.warn(
        "Could not determine user role or user data is incomplete. Defaulting to employee home.",
      );
      if (!auth.currentUser) {
        // If user is not authenticated, _fetchActiveUserData would have already shown a toast.
      } else if (!activeUserData) {
        // If activeUserData is null due to fetch error (e.g. document not found), _fetchActiveUserData might have shown a toast.
      } else {
        // Generic fallback toast if no specific one was shown.
        Toast.show({
          type: "error",
          text1: t("errors.roleFetchErrorTitle", {
            defaultValue: "Role Error",
          }),
          text2: t("errors.defaultEmployeeNavigationRoleError", {
            defaultValue:
              "Failed to determine role. Navigating to default home.",
          }), // Add this translation key
          position: "bottom",
        });
      }
      router.replace("/employee/home"); // Default navigation
    }
  }, [_fetchActiveUserData, router, t]); // Dependencies for useCallback

  const handleGraph = () => {
    // Pasar el resultado y también indicar la unidad (metros)
    console.log("params", params);
    router.push({
      pathname: "/employee/graph", // O la ruta correcta a tu pantalla Graph
      params: {
        latitude: null, // Aún no tenemos lat/lon aquí, se marcarán en Graph
        longitude: null,
        radiusControlled: params.distanceForControlled, // El resultado del cálculo (asumimos que está en metros)
        radiusLimited: params.distanceForLimited, // El resultado del cálculo (asumimos que está en metros)
        radiusProhibited: params.distanceForProhibited, // El resultado del cálculo (asumimos que está en metros)
        radiusUnit: "m", // Especificar la unidad
      },
    });
  };

  const handleTable = () => {
    // Extraemos los parámetros necesarios de 'params' que vienen de calculation.js
    // y los pasamos a la pantalla de tablas.
    router.push({
      pathname: "/employee/tables", // Ruta a tu pantalla de tablas
      params: {
        activityCi: params.activity, // Actividad en Ci (string)
        isotope: params.isotope, // Nombre del isótopo (string, ej: "192Ir")
        collimatorDisplayName: params.collimator, // Nombre de visualización del colimador
        materialDisplayName: params.material, // Nombre de visualización del material
        // 'attenuationCoefficientUsed' es el µ que se usó en el cálculo individual,
        // formateado como string (ej: "0.292"). La pantalla de tablas lo parseará.
        // Es crucial saber la unidad original de este µ (probablemente cm⁻¹).
        muUsedInCalculation: params.attenuationCoefficientUsed,
      },
    });
  };

  const handleSaveDose = async () => {
    // --- Validaciones de input (sin cambios) ---
    const hours = parseInt(durationHours || "0", 10);
    const minutes = parseInt(durationMinutes || "0", 10);
    const seconds = parseInt(durationSeconds || "0", 10);

    if (
      isNaN(hours) ||
      hours < 0 ||
      isNaN(minutes) ||
      minutes < 0 ||
      minutes > 59 ||
      isNaN(seconds) ||
      seconds < 0 ||
      seconds > 59
    ) {
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("errors.invalidDurationFormat", "Formato HH:MM:SS inválido."),
        position: "bottom",
      });
      return;
    }
    const totalSecondsFromHHMMSS = hours * 3600 + minutes * 60 + seconds;

    if (
      !dose.trim() ||
      isNaN(parseFloat(dose)) ||
      parseFloat(dose) <= 0 ||
      !modalTotalExposures.trim() ||
      isNaN(parseInt(modalTotalExposures, 10)) ||
      parseInt(modalTotalExposures, 10) <= 0 ||
      totalSecondsFromHHMMSS <= 0
    ) {
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("home.alerts.error.emptyFieldsOrTimeOrDuration"),
        position: "bottom",
      });
      return;
    }
    // --- Fin validaciones de input ---

    const user = auth.currentUser;
    if (!user) {
      Toast.show({
        type: "error",
        text1: t("home.alerts.error.title"),
        text2: t("home.alerts.userNotAuthenticated"),
        position: "bottom",
      });
      return;
    }

    // Considera un estado de carga específico para el guardado, ej: setIsSaving(true)
    let userCompanyId = null;

    try {
      // PASO 1: Obtener el companyId del empleado actual
      console.log(
        `Workspaceing employee data for user ${user.uid} to get companyId...`,
      );
      const employeesGroupRef = collectionGroup(db, "employees");
      const employeeQuery = query(
        employeesGroupRef,
        where("email", "==", user.email),
      );
      const employeeQuerySnapshot = await getDocs(employeeQuery);

      if (employeeQuerySnapshot.empty) {
        console.error(
          `Could not find employee document for email ${user.email} to retrieve companyId.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.userDataNotFoundForDose"),
          position: "bottom",
        });
        // setIsSaving(false);
        return;
      }

      const employeeData = employeeQuerySnapshot.docs[0].data();
      userCompanyId = employeeData.companyId;

      if (!userCompanyId) {
        console.error(
          `Employee document for ${user.email} is missing companyId.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.companyInfoMissingForDose"),
          position: "bottom",
        });
        // setIsSaving(false);
        return;
      }
      console.log(`Found companyId: ${userCompanyId} for user ${user.uid}`);

      // Definir fecha actual para la nueva dosis Y para la consulta de límite
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1; // Meses en JS son 0-indexados
      const year = today.getFullYear();

      // --- NUEVA VALIDACIÓN: Límite de dosis diarias ---
      const dosesCollectionPath = collection(
        db,
        "companies",
        userCompanyId,
        "employees",
        user.uid,
        "doses",
      );
      const dosesForTodayQuery = query(
        dosesCollectionPath,
        where("day", "==", day),
        where("month", "==", month),
        where("year", "==", year),
      );

      const dosesTodaySnapshot = await getDocs(dosesForTodayQuery);
      console.log(
        `Found ${dosesTodaySnapshot.size} doses already saved for ${day}/${month}/${year}.`,
      );

      if (dosesTodaySnapshot.size >= 15) {
        Toast.show({
          type: "error",
          text1: t("home.alerts.error.title"),
          text2: t(
            "home.alerts.error.dailyDoseLimitReached",
            "Has alcanzado el límite de 15 dosis diarias.",
          ), // Nueva traducción
          position: "bottom",
        });
        // setIsSaving(false);
        return;
      }
      // --- FIN NUEVA VALIDACIÓN ---

      // PASO 2: Guardar la dosis (usando dosesCollectionPath que ya definimos)
      console.log(
        `Adding new manual dose for employee ${user.uid} in company ${userCompanyId} on ${day}/${month}/${year}`,
      );
      await addDoc(dosesCollectionPath, {
        // Reutilizar dosesCollectionPath
        dose: parseFloat(dose),
        totalExposures: parseInt(modalTotalExposures, 10),
        totalTime: totalSecondsFromHHMMSS,
        day, // ya definidos arriba
        month, // ya definidos arriba
        year, // ya definidos arriba
        startTime: formattedStartTime || null,
        timestamp: serverTimestamp(),
        entryMethod: "manual",
      });

      Toast.show({
        type: "success",
        text1: t("home.alerts.success.title"),
        text2: t("home.alerts.success.doseSaved"),
        position: "bottom",
      });

      // Resetear campos del modal
      setModalVisible(false);
      setDose("");
      setModalTotalExposures("");
      setDurationHours("");
      setDurationMinutes("");
      setDurationSeconds("");
      setFormattedStartTime("");
      setStartTime(new Date());
    } catch (error) {
      console.error("❌ Error saving dose data:", error);
      if (error.code === "failed-precondition") {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.firestoreIndexRequired"),
          position: "bottom",
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("home.alerts.error.title"),
          text2: t("home.alerts.error.couldNotSave"),
          position: "bottom",
        });
      }
    } finally {
      // setIsSaving(false);
    }
  };

  // Determinar si el valor ingresado es distancia o espesor
  const isDistance = params.calculationType === "distance"; // Asumiendo que se pasa un tipo de cálculo

  const onTimeChange = (event, selectedTime) => {
    // Siempre ocultar el picker después de la interacción en Android
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }

    // Si se seleccionó una hora ('set') y no se canceló
    if (event.type === "set" && selectedTime) {
      const currentTime = selectedTime || startTime; // Usa la hora seleccionada o la actual si algo falla

      // Actualizar el estado Date para el picker
      setStartTime(currentTime);

      // Formatear la hora como "HH:mm" para mostrar y guardar
      const formatted = format(currentTime, "HH:mm");
      setFormattedStartTime(formatted);

      // Ocultar el picker en iOS después de seleccionar
      if (Platform.OS === "ios") {
        setShowTimePicker(false);
      }
    } else {
      // El usuario canceló la selección (Android) o cerró el spinner (iOS)
      setShowTimePicker(false);
    }
  };

  const handleDoseChange = (text) => {
    const formattedText = text.replace(",", ".");
    setDose(formattedText);
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#FF9300",
            flexDirection: "row",
            alignItems: "center",
            padding: isTablet ? 20 : 16, // Increased padding for tablet
            borderBottomStartRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
            marginBottom: isTablet ? 30 : 20, // Increased margin for tablet
            paddingTop: insets.top + 15,
          }}
        >
          <Pressable onPress={handleBack}>
            <Image
              source={require("../../assets/go-back.png")}
              style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }} // Larger icon for tablet
            />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
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
              {t("calculationSummary.title", {
                type: isDistance
                  ? t("calculationSummary.distance")
                  : t("calculationSummary.thickness"),
              })}
            </Text>
          </View>

          <Pressable onPress={handleHome}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }} // Larger icon for tablet
            />
          </Pressable>
        </View>

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingHorizontal: isTablet ? 30 : 0 },
          ]}
        >
          <Text
            style={{
              fontSize: isTablet ? 22 : 18,
              fontWeight: "bold",
              margin: isTablet ? 25 : 15,
              textAlign: "center",
            }}
          >
            {t("calculationSummary.resultsFor")}
          </Text>

          {/* Summary Details */}
          <View
            style={{ width: isTablet ? "80%" : "100%", alignSelf: "center" }}
          >
            <View
              style={{ flexDirection: "row", marginBottom: isTablet ? 15 : 0 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginLeft: isTablet ? 0 : 80,
                    flex: isTablet ? 0.4 : undefined,
                  },
                ]}
              >
                {t("calculationSummary.isotope")}
              </Text>
              <Text
                style={[
                  styles.textLabel,
                  {
                    fontSize: isTablet ? 20 : 18,
                    flex: isTablet ? 0.6 : undefined,
                  },
                ]}
              >
                {params.isotope?.toString()}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", marginBottom: isTablet ? 15 : 0 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginLeft: isTablet ? 0 : 80,
                    flex: isTablet ? 0.4 : undefined,
                  },
                ]}
              >
                {t("calculationSummary.activity")}
              </Text>
              <Text
                style={[
                  styles.textLabel,
                  {
                    fontSize: isTablet ? 20 : 18,
                    flex: isTablet ? 0.6 : undefined,
                  },
                ]}
              >
                {params.activity?.toString()} {t("calculationSummary.ci")}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", marginBottom: isTablet ? 15 : 0 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginLeft: isTablet ? 0 : 80,
                    flex: isTablet ? 0.4 : undefined,
                  },
                ]}
              >
                {t("calculationSummary.collimator")}
              </Text>
              <Text
                style={[
                  styles.textLabel,
                  {
                    fontSize: isTablet ? 20 : 18,
                    flex: isTablet ? 0.6 : undefined,
                  },
                ]}
              >
                {params.collimator?.toString()}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", marginBottom: isTablet ? 15 : 0 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginLeft: isTablet ? 0 : 80,
                    flex: isTablet ? 0.4 : undefined,
                  },
                ]}
              >
                {t("calculationSummary.limit")}
              </Text>
              <Text
                style={[
                  styles.textLabel,
                  {
                    fontSize: isTablet ? 20 : 18,
                    flex: isTablet ? 0.6 : undefined,
                  },
                ]}
              >
                {params.limit?.toString()}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", marginBottom: isTablet ? 15 : 0 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginLeft: isTablet ? 0 : 80,
                    flex: isTablet ? 0.4 : undefined,
                  },
                ]}
              >
                {t("calculationSummary.material")}
              </Text>
              <Text
                style={[
                  styles.textLabel,
                  {
                    fontSize: isTablet ? 20 : 18,
                    flex: isTablet ? 0.6 : undefined,
                  },
                ]}
              >
                {params.material?.toString()}
              </Text>
            </View>
            {params.material === "Other" && (
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: isTablet ? 15 : 0,
                }}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      fontSize: isTablet ? 20 : 18,
                      marginLeft: isTablet ? 0 : 80,
                      flex: isTablet ? 0.4 : undefined,
                    },
                  ]}
                >
                  {t("calculationSummary.attenuation")}
                </Text>
                <Text
                  style={[
                    styles.textLabel,
                    {
                      fontSize: isTablet ? 20 : 18,
                      flex: isTablet ? 0.6 : undefined,
                    },
                  ]}
                >
                  {params.attenuation?.toString()}
                </Text>
              </View>
            )}
            <View
              style={{ flexDirection: "row", marginBottom: isTablet ? 15 : 0 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginLeft: isTablet ? 0 : 80,
                    flex: isTablet ? 0.4 : undefined,
                  },
                ]}
              >
                {isDistance
                  ? t("calculationSummary.thickness")
                  : t("calculationSummary.distance")}
              </Text>
              <Text
                style={[
                  styles.textLabel,
                  {
                    fontSize: isTablet ? 20 : 18,
                    flex: isTablet ? 0.6 : undefined,
                  },
                ]}
              >
                {params.value?.toString()} {isDistance ? "mm" : "m"}
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: isTablet ? 24 : 18, // Larger result text
              fontWeight: "bold",
              marginTop: isTablet ? 30 : 10,
              marginBottom: isTablet ? 20 : 0, // Added margin below result
              textAlign: "center",
              paddingHorizontal: isTablet ? 20 : 0,
            }}
          >
            {isDistance
              ? t("calculationSummary.resultDistance", {
                  result: params.result?.toString(),
                })
              : t("calculationSummary.resultThickness", {
                  result: params.result?.toString(),
                })}
          </Text>

          {/* Buttons */}
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              marginTop: isTablet ? 40 : 30, // Ajusta el margen superior general si es necesario
              width: "100%", // El contenedor ocupa todo el ancho disponible
            }}
          >
            <Pressable onPress={handleGraph} style={styles.professionalButton}>
              <Ionicons
                name="stats-chart-outline"
                size={isTablet ? 24 : 20}
                color="#fff"
              />
              <Text style={styles.professionalButtonText}>
                {t("calculationSummary.graph")}
              </Text>
            </Pressable>

            <Pressable onPress={handleTable} style={styles.professionalButton}>
              <Ionicons
                name="grid-outline"
                size={isTablet ? 24 : 20}
                color="#fff"
              />
              <Text style={styles.professionalButtonText}>
                {t("calculationSummary.table")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/employee/timer")} // Navegación al temporizador
              style={styles.professionalButton}
            >
              <Ionicons
                name="timer-outline"
                size={isTablet ? 24 : 20}
                color="#fff"
              />
              <Text style={styles.professionalButtonText}>
                {t(
                  "calculationSummary.buttons.goToTimer",
                  "Ir al Temporizador",
                )}
              </Text>
            </Pressable>

            {/* Botón para "Añadir Dosis Manualmente" - puede tener un estilo primario diferente */}
            <Pressable
              onPress={() => setModalVisible(true)}
              style={[styles.professionalButton, styles.ctaButton]} // Aplica el base y luego el CTA
            >
              <Ionicons
                name="add-circle-outline"
                size={isTablet ? 24 : 20}
                color="#fff"
              />
              <Text style={styles.professionalButtonText}>
                {t("home.addDataManually")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
          paddingTop: insets.bottom + 40,
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
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  width: isTablet ? "75%" : "90%",
                  padding: isTablet ? 30 : 20,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalLabel,
                  {
                    fontSize: isTablet ? 18 : 16,
                    marginTop: isTablet ? 15 : 10,
                  },
                ]}
              >
                {t("home.modal.dose")}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    fontSize: isTablet ? 18 : 16,
                    height: isTablet ? 55 : undefined,
                    padding: isTablet ? 12 : 10,
                    marginTop: isTablet ? 12 : 10,
                  },
                ]}
                value={dose}
                onChangeText={handleDoseChange}
                keyboardType="numeric"
                placeholder={t("home.modal.enterDose")}
                placeholderTextColor={"gray"}
              />

              <Text
                style={[
                  styles.modalLabel,
                  {
                    fontSize: isTablet ? 18 : 16,
                    marginTop: isTablet ? 20 : 10,
                  },
                ]}
              >
                {t("home.modal.numberOfExposures")}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    fontSize: isTablet ? 18 : 16,
                    height: isTablet ? 55 : undefined,
                    padding: isTablet ? 12 : 10,
                    marginTop: isTablet ? 12 : 10,
                  },
                ]}
                value={modalTotalExposures}
                onChangeText={setModalTotalExposures}
                keyboardType="number-pad"
                placeholder={t("home.modal.enterNumberOfExposures")}
                placeholderTextColor={"gray"}
              />

              <Text
                style={[
                  styles.modalLabel,
                  {
                    fontSize: isTablet ? 18 : 16,
                    marginTop: isTablet ? 20 : 10,
                  },
                ]}
              >
                {t("home.modal.exposureTime", "Tiempo Exposición (HH:MM:SS)")}
              </Text>
              <View
                style={[
                  styles.durationContainer,
                  {
                    marginTop: isTablet ? 10 : 5,
                    marginBottom: isTablet ? 15 : 10,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.durationInput,
                    {
                      fontSize: isTablet ? 18 : 16,
                      padding: isTablet ? 12 : 10,
                      width: isTablet ? "28%" : "25%",
                      height: isTablet ? 50 : undefined,
                    },
                  ]}
                  value={durationHours}
                  onChangeText={(text) =>
                    setDurationHours(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="HH"
                  maxLength={2}
                  placeholderTextColor="gray"
                />
                <Text
                  style={[
                    styles.durationSeparator,
                    { fontSize: isTablet ? 20 : 18 },
                  ]}
                >
                  :
                </Text>
                <TextInput
                  style={[
                    styles.durationInput,
                    {
                      fontSize: isTablet ? 18 : 16,
                      padding: isTablet ? 12 : 10,
                      width: isTablet ? "28%" : "25%",
                      height: isTablet ? 50 : undefined,
                    },
                  ]}
                  value={durationMinutes}
                  onChangeText={(text) =>
                    setDurationMinutes(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="MM"
                  maxLength={2}
                  placeholderTextColor="gray"
                />
                <Text
                  style={[
                    styles.durationSeparator,
                    { fontSize: isTablet ? 20 : 18 },
                  ]}
                >
                  :
                </Text>
                <TextInput
                  style={[
                    styles.durationInput,
                    {
                      fontSize: isTablet ? 18 : 16,
                      padding: isTablet ? 12 : 10,
                      width: isTablet ? "28%" : "25%",
                      height: isTablet ? 50 : undefined,
                    },
                  ]}
                  value={durationSeconds}
                  onChangeText={(text) =>
                    setDurationSeconds(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="SS"
                  maxLength={2}
                  placeholderTextColor="gray"
                />
              </View>

              <Text
                style={[
                  styles.modalLabel,
                  {
                    fontSize: isTablet ? 18 : 16,
                    marginTop: isTablet ? 15 : 10,
                  },
                ]}
              >
                {t("home.modal.startTime", "Hora Inicio")}
                {t("home.modal.optional", "Opcional")}
              </Text>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={[
                  styles.pickerButton,
                  {
                    height: isTablet ? 60 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 20 : 10,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    { fontSize: isTablet ? 18 : 16 },
                    !formattedStartTime && styles.pickerButtonPlaceholder,
                  ]}
                >
                  {formattedStartTime ||
                    t("home.modal.selectStartTime", "Seleccionar Hora")}
                </Text>
                <Ionicons
                  name="time-outline"
                  size={isTablet ? 28 : 24}
                  color="gray"
                />
              </Pressable>

              {/* Picker de Hora (condicional) */}
              {showTimePicker && (
                <DateTimePicker
                  value={startTime} // Usa el estado Date
                  mode="time" // <-- MODO HORA
                  is24Hour={true} // Formato 24h (o false para AM/PM según preferencia)
                  display="default" // O "spinner" en iOS si prefieres
                  onChange={onTimeChange} // Función handler que crearemos
                />
              )}

              <View
                style={[
                  styles.buttonContainer,
                  { marginTop: isTablet ? 25 : 20 },
                ]}
              >
                <Pressable
                  style={[
                    styles.cancelButton,
                    {
                      flex: 1,
                      marginRight: isTablet ? 8 : 5,
                      padding: isTablet ? 18 : 15,
                    },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { fontSize: isTablet ? 18 : 16 },
                    ]}
                  >
                    {t("home.modal.cancel")}
                  </Text>
                </Pressable>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      flex: 1,
                      marginLeft: isTablet ? 8 : 5,
                      padding: isTablet ? 18 : 15,
                    },
                  ]}
                  onPress={handleSaveDose}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { fontSize: isTablet ? 18 : 16 },
                    ]}
                  >
                    {t("home.modal.save")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </LinearGradient>
  );
}

const styles = {
  scrollContainer: {
    paddingTop: 10,
    paddingBottom: 20,
  },

  label: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
    marginLeft: 80,
  },

  textLabel: {
    fontSize: 18,
    marginBottom: 10,
    marginLeft: 10,
  },

  button: {
    width: "90%",
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,

    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Elevación para Android
    elevation: 5,
  },
  buttonAddDose: {
    width: "90%",
    height: 55,
    backgroundColor: "#169200",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,

    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Elevación para Android
    elevation: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "gray",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: "#006892",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 55, // O la altura de tus otros inputs
    borderWidth: 1,
    borderColor: "gray", // O '#ccc'
    borderRadius: 5, // O 10
    paddingHorizontal: 10, // O 15
    backgroundColor: "white",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10, // O el margen que uses
  },
  pickerButtonText: {
    fontSize: 16, // O 18
    color: "black",
  },
  pickerButtonPlaceholder: {
    color: "gray",
  },

  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%", // O el ancho que necesites
    justifyContent: "space-around", // O 'flex-start' con márgenes
    marginBottom: 10,
    marginTop: 5,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    textAlign: "center",
    width: "25%", // Ajusta el ancho según necesites
    color: "black",
  },
  durationSeparator: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 5,
  },

  professionalButton: {
    flexDirection: "row", // Para alinear icono y texto
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#006892", // Color principal y consistente
    paddingVertical: isTablet ? 16 : 13, // Padding vertical para altura adaptable
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: isTablet ? 20 : 18, // Margen consistente entre botones
    width: isTablet ? "75%" : "90%", // Ancho consistente
    alignSelf: "center", // Asegurar que se centre si el contenedor es más ancho
    // Sombras sutiles
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.0,
    elevation: 4,
  },
  professionalButtonText: {
    color: "#fff",
    fontSize: isTablet ? 19 : 17,
    fontWeight: "600",
    marginLeft: 10, // Espacio entre el icono y el texto
    textAlign: "center",
  },
  // Puedes tener una variación para el botón de "Añadir Dosis" si quieres que destaque más
  ctaButton: {
    // Call To Action button
    backgroundColor: "#28a745", // Un verde para la acción principal de guardar/añadir
    // Hereda el resto de professionalButton o define todo aquí si es muy diferente
  },
};
