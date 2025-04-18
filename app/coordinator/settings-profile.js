import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next"; // Import the translation hook

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation(); // Initialize translation hook
  const [userData, setUserData] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "employees", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);

            if (data.companyId) {
              const companyRef = doc(db, "companies", data.companyId);
              const companySnap = await getDoc(companyRef);

              if (companySnap.exists()) {
                setCompanyName(companySnap.data().Name);
              } else {
                setError(t("profile.userDataNotFound"));
              }
            }
          } else {
            setError(t("profile.userDataNotFound"));
          }
        } else {
          setError(t("profile.userNotAuthenticated"));
        }
      } catch (err) {
        setError(t("profile.fetchUserDataError") + ": " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("coordinator/home");
  };

  const handleCompany = () => {
    Alert.alert(t("profile.joinCompanyPrompt"));
  };

  if (loading) {
    return <ActivityIndicator size={50} color="#FF9300" />;
  }

  if (error) {
    return <Text style={{ color: "red", padding: 20 }}>{error}</Text>;
  }

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: 40,
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
      <View style={{ flex: 1, padding: 20 }}>
        {[
          { label: t("profile.name"), value: userData?.firstName || "N/A" },
          { label: t("profile.lastName"), value: userData?.lastName || "N/A" },
          { label: t("profile.dni"), value: userData?.dni || "N/A" },
          { label: t("profile.telephone"), value: userData?.phone || "N/A" },
          { label: t("profile.birth"), value: userData?.birthDate || "N/A" },
          { label: t("profile.email"), value: userData?.email || "N/A" },
          userData?.companyId && {
            label: t("profile.companyName"),
            value: companyName || "N/A",
          },
          {
            label: t("profile.companyCode"),
            value: userData?.companyId || t("profile.noCompanyAssigned"),
          },
        ]
          .filter(Boolean)
          .map((item, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 16, color: "grey", marginBottom: 5 }}>
                {item.value}
              </Text>
              <View style={{ height: 1, backgroundColor: "black" }} />
            </View>
          ))}

        {/* Company Question if companyId is empty */}
        {!userData?.companyId && (
          <>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginTop: 20 }}>
              {t("profile.joinCompanyQuestion")}
            </Text>
            <Pressable onPress={handleCompany}>
              <Text style={{ color: "blue", fontSize: 16 }}>
                {t("profile.joinCompanyAction")}
              </Text>
            </Pressable>
          </>
        )}
      </View>

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
    </LinearGradient>
  );
}
