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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import i18n from "../locales/i18n";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import Toast from "react-native-toast-message"; // 1. Import Toast

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const authInstance = getAuth(); // Use getAuth() instance
        const user = authInstance.currentUser;

        if (!user) {
          // 2. Replace Alert with Toast
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"), // Use generic title or add specific one
            text2: t("profile.userNotAuthenticated"),
          });
          setLoading(false);
          // Optionally redirect
          // router.replace("/");
          return;
        }

        const docRef = doc(db, "employees", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // Formatear la fecha de nacimiento si existe
          if (data.birthDate) {
            try {
              // Handle potential invalid date strings from Firestore
              const dateParts = data.birthDate.split("-"); // Assuming YYYY-MM-DD
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
                    "dd MMMM yyyy",
                    {
                      locale: i18n.language === "es" ? es : enUS,
                    },
                  );
                } else {
                  data.birthDateFormatted = data.birthDate;
                } // Show original if invalid
              } else {
                data.birthDateFormatted = data.birthDate;
              } // Show original if format wrong
            } catch (formatError) {
              console.error("Error formatting birth date:", formatError);
              data.birthDateFormatted = data.birthDate; // Fallback
            }
          } else {
            data.birthDateFormatted = "N/A"; // Handle missing date explicitly
          }

          setUserData(data);
        } else {
          // 3. Replace Alert with Toast
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t("profile.userDataNotFound"),
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // 4. Replace Alert with Toast (show generic message)
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          // Use original specific error key + fallback generic message
          text2: t(
            "profile.fetchUserDataError",
            "Could not fetch profile data.",
          ),
        });
      } finally {
        setLoading(false);
      }
    };

    // Listen for language changes to reformat date
    const handleLanguageChange = () => {
      fetchUserData(); // Refetch data to reformat date on language change
    };
    i18n.on("languageChanged", handleLanguageChange);

    fetchUserData();

    // Cleanup listener on unmount
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [t, i18n.language]); // Add t and i18n.language as dependencies

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
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          borderBottomStartRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10,
          paddingTop: Platform.select({
            ios: 60,
            android: 40,
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
            textAlign: "center", // Ensure title centers if space allows
            flex: 1, // Allow text to take available space
            marginHorizontal: 10, // Add some spacing around title
          }}
        >
          {t("profile.title")}
        </Text>
        <Pressable onPress={handleHome} style={{ width: 50 }}>
          {/* Keep original icon or empty view */}
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
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
          padding: 40,
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
