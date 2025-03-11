import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function CompaniesScreen() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "companies"));
        const companyList = querySnapshot.docs.map((doc) => {
          console.log(doc.data()); // Verificar qué campos se están obteniendo
          return {
            id: doc.id,
            name: doc.data().name || doc.data().Name || "Nombre no disponible",
          };
        });
        setCompanies(companyList);
        setFilteredCompanies(companyList);
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleSearch = (text) => {
    setSearchText(text);
    const filtered =
      text.trim() === ""
        ? companies
        : companies.filter((company) =>
            company.name.toLowerCase().includes(text.toLowerCase()),
          );
    setFilteredCompanies(filtered);
  };

  const handleBack = () => {
    router.replace("/admin/home");
  };

  const handleHome = () => {
    router.replace("/admin/home");
  };

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
          Companies
        </Text>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          padding: 8,
          borderRadius: 10,
          marginTop: 10,
          paddingHorizontal: 10,
          marginHorizontal: 20,
        }}
      >
        <Ionicons
          name="search"
          size={20}
          color="gray"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Search"
          value={searchText}
          onChangeText={handleSearch}
          style={{ flex: 1, fontSize: 16 }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF8C00"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={filteredCompanies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/admin/company/${item.id}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#CCC",
                padding: 15,
                borderRadius: 10,
                marginTop: 10,
              }}
            >
              <Image
                source={require("../../assets/radiacion-blanco.png")}
                style={{ width: 40, height: 40, marginRight: 10 }}
              />
              <Text style={{ fontSize: 18, flex: 1, fontWeight: "bold" }}>
                {item.name || "Nombre no disponible"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          backgroundColor: "#006892",
          width: 70,
          height: 70,
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          marginBottom: 20,
        }}
        onPress={() => router.push("/admin/addCompany")}
      >
        <Image
          source={require("../../assets/addCompany.png")}
          style={{ width: 50, height: 50 }}
        />
      </TouchableOpacity>

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
