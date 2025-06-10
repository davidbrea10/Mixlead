import React, { useState, useEffect } from "react"; // Import React
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  // Alert, // Remove Alert import
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import i18n from "../locales/i18n";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import Toast from "react-native-toast-message"; // 1. Import Toast
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setUserData(null); // Resetear datos al inicio de la carga
      try {
        const authInstance = getAuth();
        const user = authInstance.currentUser;

        if (!user) {
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t("profile.userNotAuthenticated", "User not authenticated."), // Añadir traducción
          });
          setLoading(false);
          // router.replace("/"); // Opcional: Redirigir al login
          return;
        }

        // --- MODIFICACIÓN: Buscar datos del usuario usando Collection Group Query POR EMAIL ---
        console.log(
          `Workspaceing profile data for user: ${user.uid}, email: ${user.email}`,
        );
        const employeesGroupRef = collectionGroup(db, "employees"); // Referencia al grupo 'employees'

        // Buscar en el grupo 'employees' donde el campo 'email' coincida
        const userDocumentQuery = query(
          employeesGroupRef,
          where("email", "==", user.email),
        );
        const querySnapshot = await getDocs(userDocumentQuery);
        // --- FIN DE LA MODIFICACIÓN ---

        if (!querySnapshot.empty) {
          // Debería haber solo un resultado si los emails son únicos
          if (querySnapshot.size > 1) {
            console.warn(
              `Multiple profiles found for email ${user.email}. Using the first one.`,
            );
          }
          const userDocSnap = querySnapshot.docs[0]; // Tomar el primer documento encontrado
          const data = userDocSnap.data();
          console.log("User data found in path:", userDocSnap.ref.path);

          // Formatear la fecha de nacimiento (lógica existente)
          if (data.birthDate) {
            try {
              const dateParts = data.birthDate.split("-");
              if (dateParts.length === 3) {
                const birthDateObj = new Date(
                  Date.UTC(
                    parseInt(dateParts[0], 10),
                    parseInt(dateParts[1], 10) - 1,
                    parseInt(dateParts[2], 10),
                  ),
                );
                if (!isNaN(birthDateObj.getTime())) {
                  data.birthDateFormatted = format(
                    birthDateObj,
                    "dd MMMM yyyy", // Formato deseado
                    { locale: i18n.language === "es" ? es : enUS },
                  );
                } else {
                  data.birthDateFormatted = data.birthDate;
                }
              } else {
                data.birthDateFormatted = data.birthDate;
              }
            } catch (formatError) {
              console.error("Error formatting birth date:", formatError);
              data.birthDateFormatted = data.birthDate;
            }
          } else {
            data.birthDateFormatted = t("profile.notAvailable", "N/A"); // Usar traducción
          }
          setUserData(data);
        } else {
          console.warn(
            `No profile data found in Firestore for user ${user.uid} with email ${user.email}.`,
          );
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t("profile.userDataNotFound", "User data not found."), // Añadir traducción
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Verificar si el error es por índice faltante
        if (error.code === "failed-precondition") {
          console.error(
            "Query failed likely due to missing Firestore index for collectionGroup 'employees' on field 'email'. Check console/Firebase for index creation link.",
          );
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle"),
            text2: t(
              "errors.firestoreIndexRequired",
              "A database configuration is needed. Please try again later or contact support.",
            ),
            visibilityTime: 5000,
          });
        } else {
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t(
              "profile.fetchUserDataError",
              "Could not fetch profile data.",
            ), // Añadir traducción
          });
        }
      } finally {
        setLoading(false);
      }
    };

    const handleLanguageChange = () => {
      // Refresca los datos para que la fecha se reformatee con el nuevo locale
      if (auth.currentUser) {
        // Solo si hay un usuario
        fetchUserData();
      }
    };

    i18n.on("languageChanged", handleLanguageChange);
    fetchUserData(); // Carga inicial

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [t, i18n.language]); // 't' y 'i18n.language' para que se actualice si cambian

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    // Keep original simple logic if role-based routing isn't needed here
    router.replace("admin/home");
  };

  if (loading) {
    // Keep original simple loading indicator
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={50} color="#FF8C00" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      {/* Header (Keep original inline styles) */}
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
          paddingTop: insets.top + 15,
        }}
      >
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
        <Text
          style={{
            fontSize: isTablet ? 32 : 24,
            fontWeight: "bold",
            color: "white",
            flex: 1,
            textAlign: "center",
            marginHorizontal: 10,
            letterSpacing: 2,
            textShadowColor: "black",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 1,
          }}
        >
          {t("profile.title")}
        </Text>
        <Pressable
          onPress={handleHome}
          style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
        >
          {/* Keep original icon or empty view */}
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content (Keep original inline styles) */}
      <ScrollView style={{ flex: 1, padding: 20 }}>
        {userData ? (
          [
            { label: t("profile.name"), value: userData.firstName },
            { label: t("profile.lastName"), value: userData.lastName },
            { label: t("profile.dni"), value: userData.dni },
            { label: t("profile.telephone"), value: userData.phone },
            { label: t("profile.birth"), value: userData.birthDateFormatted }, // Use formatted date
            { label: t("profile.email"), value: userData.email },
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
              {/* Keep original separator */}
              <View style={{ height: 1, backgroundColor: "#ccc" }} />
            </View>
          ))
        ) : (
          <Text
            style={{
              textAlign: "center",
              fontSize: 16,
              color: "grey",
              marginTop: 50,
            }}
          >
            {t("profile.noDataAvailable", "No profile data available.")}
          </Text>
        )}
      </ScrollView>

      {/* Footer (Keep original inline styles) */}
      <View
        style={{
          backgroundColor: "#006892",
          paddingTop: insets.bottom + 40,
          alignItems: "flex-end",
          borderTopEndRadius: 40,
          borderTopStartRadius: 40, // Round both corners
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
