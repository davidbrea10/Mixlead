import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next"; // Importa la configuración de i18next
import * as Clipboard from "expo-clipboard";

export default function CompanyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [company, setCompany] = useState({
    Name: "",
    Cif: "",
    Telephone: "",
    ContactPerson: "",
    SecurityNumber: "",
    CompanyId: "", // <--- Añadido
  });

  const [loading, setLoading] = useState(true);

  const fields = [
    { key: "Name", label: "company_details.fields.Name" },
    { key: "CompanyId", label: "company_details.fields.CompanyId" }, // <--- Añadido aquí
    { key: "Cif", label: "company_details.fields.Cif" },
    { key: "Telephone", label: "company_details.fields.Telephone" },
    { key: "ContactPerson", label: "company_details.fields.ContactPerson" },
    { key: "SecurityNumber", label: "company_details.fields.SecurityNumber" },
  ];

  // Initialize i18n
  const { t } = useTranslation();

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const docRef = doc(db, "companies", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Si no tiene CompanyId, lo usamos desde el id de Firestore
          setCompany({
            ...data,
            CompanyId: data.CompanyId || id,
          });
        } else {
          alert(t("company_details.alert.not_found"));
          router.back();
        }
      } catch (error) {
        alert(t("company_details.alert.fetch_error"));
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [id]);

  const handleInputChange = (field, value) => {
    setCompany({ ...company, [field]: value });
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, "companies", id);
      await updateDoc(docRef, company);
      alert(t("company_details.alert.update_success"));
      router.push({ pathname: "/admin/companies", params: { refresh: true } });
    } catch (error) {
      alert(t("company_details.alert.update_error"));
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      t("company_details.alert.delete_confirm1"),
      t("company_details.alert.delete_confirm"),
      [
        {
          text: t("company_details.confirm.cancel"),
          style: "cancel",
        },
        {
          text: t("company_details.confirm.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const docRef = doc(db, "companies", id);
              await deleteDoc(docRef);
              alert(t("company_details.alert.delete_success"));
              router.push("/admin/home");
            } catch (error) {
              alert(t("company_details.alert.delete_error"));
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ActivityIndicator size={50} color="#FF8C00" style={{ marginTop: 20 }} />
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
            // Apply platform-specific padding
            ios: 60, // More padding on iOS
            android: 40, // Base padding on Android
          }),
        }}
      >
        <Pressable onPress={() => router.replace("/admin/companies")}>
          <Image
            source={require("../../../assets/go-back.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
        <View style={{ flexDirection: "column", alignItems: "center" }}>
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
            {t("company_details.title")}
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "light",
              color: "white",
              letterSpacing: 2,
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 1,
            }}
          >
            {company?.Name || t("company_details.subtitle")}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/admin/home")}>
          <Image
            source={require("../../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      <ScrollView>
        <View style={{ flex: 1, padding: 20 }}>
          {fields.map(({ key, label }) => (
            <View key={key} style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 18, marginBottom: 5 }}>{t(label)}</Text>

              {key === "CompanyId" ? (
                <Pressable
                  onPress={() => Clipboard.setStringAsync(company[key])}
                  style={{
                    width: "100%",
                    height: 55,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    justifyContent: "center",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  <Text style={{ fontSize: 18, color: "#555" }}>
                    {company[key]}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#999" }}>
                    {t("company_details.tap_to_copy")}
                  </Text>
                </Pressable>
              ) : (
                <TextInput
                  value={company[key]}
                  onChangeText={(text) => handleInputChange(key, text)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "100%",
                    height: 55,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    backgroundColor: "white",
                    fontSize: 18,
                  }}
                />
              )}
            </View>
          ))}

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Pressable
              onPress={handleSave}
              style={{
                backgroundColor: "#006892",
                padding: 15,
                borderRadius: 10,
                alignItems: "center",
                flex: 1,
                marginRight: 10,

                // Sombra para iOS
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,

                // Elevación para Android
                elevation: 5,
              }}
            >
              <Text style={{ color: "white", fontSize: 18 }}>
                {t("company_details.save")}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={{
                backgroundColor: "#D32F2F",
                padding: 15,
                borderRadius: 10,
                alignItems: "center",
                flex: 1,

                // Sombra para iOS
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,

                // Elevación para Android
                elevation: 5,
              }}
            >
              <Text style={{ color: "white", fontSize: 18 }}>
                {t("company_details.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

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
