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
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { useTranslation } from "react-i18next";

export default function EmployeesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "employees", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userCompanyId = userData.companyId; // Asegúrate de que 'companyId' existe

          if (!userCompanyId) {
            console.error(t("myEmployees.errors.noCompanyId"));
            return;
          }

          const employeesQuery = query(
            collection(db, "employees"),
            where("companyId", "==", userCompanyId),
          );
          const employeesSnapshot = await getDocs(employeesQuery);

          const employeesList = employeesSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              name: `${doc.data().firstName || ""} ${doc.data().lastName || ""}`.trim(),
              companyId: doc.data().companyId || null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setEmployees(employeesList);
          setFilteredEmployees(employeesList);
        } else {
          console.error(t("myEmployees.errors.documentNotFound"));
        }
      } catch (error) {
        console.error(t("myEmployees.errors.fetchError"), error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSearch = (text) => {
    setSearchText(text);
    setFilteredEmployees(
      employees.filter((emp) =>
        emp.name.toLowerCase().includes(text.toLowerCase()),
      ),
    );
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
            ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
            android: 40, // Base padding on Android (adjust value as needed)
          }),
        }}
      >
        <Pressable onPress={() => router.replace("/coordinator/home")}>
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
          {t("myEmployees.title")}
        </Text>
        <Pressable onPress={() => router.replace("/coordinator/home")}>
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
          placeholder={t("myEmployees.searchPlaceholder")}
          value={searchText}
          onChangeText={handleSearch}
          style={{ flex: 1, fontSize: 16 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size={50}
          color="#FF8C00"
          style={{
            marginTop: 20,
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/coordinator/employee/${item.id}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(4, 4, 4, 0.6)",
                borderColor: "white",
                borderWidth: 2,
                padding: 10,
                borderRadius: 10,
                marginTop: 10,
                marginHorizontal: 10,
              }}
            >
              <Image
                source={require("../../assets/employee.png")}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  marginRight: 15,
                  borderColor: "white",
                  borderWidth: 1,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    color: "white",
                    fontWeight: "bold",
                    marginBottom: 5,
                  }}
                >
                  {item.name}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
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
