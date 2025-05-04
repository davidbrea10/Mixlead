import React, { useState, useEffect } from "react"; // Import React
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  // Alert, // Remove Alert import for info/error messages
  Platform,
  ScrollView, // Import ScrollView for potentially long content
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import i18n from "../locales/i18n";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import Toast from "react-native-toast-message"; // 1. Import Toast

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null); // Remove error state

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true); // Ensure loading starts
      // setError(null); // Reset error on fetch start (no longer needed)
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "employees", user.uid); // Assuming coordinators are also in 'employees' collection
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            let formattedBirthDate = "N/A"; // Default

            // Format the birthDate field if it exists
            if (data.birthDate) {
              try {
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
                    // Check validity
                    formattedBirthDate = format(birthDateObj, "dd MMMM yyyy", {
                      locale: i18n.language === "es" ? es : enUS,
                    });
                  } else {
                    console.warn("Invalid birthDate format:", data.birthDate);
                  }
                } else {
                  console.warn("Unexpected birthDate format:", data.birthDate);
                }
              } catch (formatError) {
                console.error("Error formatting birth date:", formatError);
                formattedBirthDate = data.birthDate; // Fallback to original
              }
            }
            // Add formatted date to data object to pass to state
            const processedData = {
              ...data,
              birthDateFormatted: formattedBirthDate,
            };
            setUserData(processedData);

            // Fetch company name if companyId exists
            if (data.companyId) {
              const companyRef = doc(db, "companies", data.companyId);
              const companySnap = await getDoc(companyRef);
              if (companySnap.exists()) {
                setCompanyName(companySnap.data().Name);
              } else {
                // Use Toast for company not found, less critical than user data
                Toast.show({
                  type: "info", // Or 'warn'
                  text1: t("profile.companyNotFoundTitle", "Company Info"),
                  text2: t(
                    "profile.companyNotFoundMessage",
                    "Associated company data not found.",
                  ), // Add translation
                });
                setCompanyName(null); // Explicitly set to null
              }
            } else {
              setCompanyName(null); // No company ID
            }
          } else {
            // 2. Replace setError with Toast
            Toast.show({
              type: "error",
              text1: t("errors.errorTitle", "Error"),
              text2: t("profile.userDataNotFound"),
            });
          }
        } else {
          // 2. Replace setError with Toast
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t("profile.userNotAuthenticated"),
          });
        }
      } catch (err) {
        console.error("Fetch User Data Error:", err);
        // 2. Replace setError with Toast
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t(
            "profile.fetchUserDataError",
            "Could not fetch profile data.",
          ), // Use generic error message
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
  }, [i18n.language, t]); // Add dependencies

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    // Keep original navigation for coordinator
    router.replace("coordinator/home");
  };

  const handleCompany = () => {
    // 3. Replace Alert with Toast
    Toast.show({
      type: "info", // Informational message
      text1: t("profile.companyInfoTitle", "Company Information"), // Add translation
      text2: t("profile.joinCompanyPrompt"), // Use existing translation key
      visibilityTime: 4000, // Longer time for info message
    });
  };

  if (loading) {
    // Keep original simple loading indicator structure
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.5)",
        }}
      >
        <ActivityIndicator size={50} color="#FF9300" />
      </View>
    );
  }

  // Remove the dedicated error display view
  // if (error) {
  //   return <Text style={{ color: "red", padding: 20 }}>{error}</Text>;
  // }

  // Prepare display items only if userData exists
  const profileItems = userData
    ? [
        { label: t("profile.name"), value: userData.firstName },
        { label: t("profile.lastName"), value: userData.lastName },
        { label: t("profile.dni"), value: userData.dni },
        { label: t("profile.telephone"), value: userData.phone },
        { label: t("profile.birth"), value: userData.birthDateFormatted }, // Use formatted date from state
        { label: t("profile.email"), value: userData.email },
        // Conditionally show company name only if companyName state is set
        companyName && { label: t("profile.companyName"), value: companyName },
        // Show company code regardless, indicating if assigned or not
        {
          label: t("profile.companyCode"),
          value: userData.companyId || t("profile.noCompanyAssigned"),
        },
        { label: t("profile.role"), value: userData.role }, // Display role
      ].filter(Boolean)
    : []; // Filter out falsy values (like the conditional companyName)

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
          borderBottomEndRadius: 40, // Also round end radius
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
            textAlign: "center",
            flex: 1,
            marginHorizontal: 10,
          }}
        >
          {t("profile.title")}
        </Text>
        <Pressable onPress={handleHome} style={{ width: 50 }}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content (Keep original inline styles) */}
      <ScrollView style={{ flex: 1, padding: 20 }}>
        {userData
          ? profileItems.map((item, index) => (
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
                  {item.value || "N/A"}
                </Text>
                {/* Keep original separator */}
                <View style={{ height: 1, backgroundColor: "#ccc" }} />
              </View>
            ))
          : !loading && ( // Only show "No data" if not loading and userData is null
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

        {/* Keep original Company Question structure */}
        {!loading && userData && !userData.companyId && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              {t("profile.joinCompanyQuestion")}
            </Text>
            <Pressable onPress={handleCompany} style={{ marginTop: 5 }}>
              <Text
                style={{
                  color: "blue",
                  fontSize: 16,
                  textDecorationLine: "underline",
                }}
              >
                {t("profile.joinCompanyAction")}
              </Text>
            </Pressable>
          </View>
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
