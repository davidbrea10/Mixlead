import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { LinearGradient } from "expo-linear-gradient";

export default function CompanyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [company, setCompany] = useState({
    Name: "",
    Cif: "",
    Telephone: "",
    ContactPerson: "",
    SecurityNumber: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const docRef = doc(db, "companies", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCompany(docSnap.data());
        } else {
          alert("Company not found");
          router.back();
        }
      } catch (error) {
        alert("Error fetching company");
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  });

  const handleInputChange = (field, value) => {
    setCompany({ ...company, [field]: value });
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, "companies", id);
      await updateDoc(docRef, company);
      alert("Company updated successfully");
      router.push({ pathname: "/admin/companies", params: { refresh: true } });
    } catch (error) {
      alert("Error updating company");
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this company?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const docRef = doc(db, "companies", id);
              await deleteDoc(docRef);
              alert("Company deleted successfully");
              router.push("/admin/home");
            } catch (error) {
              alert("Error deleting company");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#FF8C00"
        style={{ marginTop: 20 }}
      />
    );
  }

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
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
            Companies
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
            {company?.Name || "Company Details"}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/admin/home")}>
          <Image
            source={require("../../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      <View style={{ flex: 1, padding: 20 }}>
        {["Name", "Cif", "Telephone", "ContactPerson", "SecurityNumber"].map(
          (key) => (
            <View key={key} style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 18, marginBottom: 5 }}>{key}</Text>
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
                  backgroundColor: "white",
                  fontSize: 18,
                }}
              />
            </View>
          ),
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable
            onPress={handleSave}
            style={{
              backgroundColor: "#006892",
              padding: 15,
              borderRadius: 10,
              alignItems: "center",
              flex: 1,
              marginRight: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 18 }}>Save Changes</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={{
              backgroundColor: "#D32F2F",
              padding: 15,
              borderRadius: 10,
              alignItems: "center",
              flex: 1,
            }}
          >
            <Text style={{ color: "white", fontSize: 18 }}>Delete Company</Text>
          </Pressable>
        </View>
      </View>

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
