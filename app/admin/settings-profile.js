import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function Profile() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          Alert.alert("Error", "No user is authenticated");
          return;
        }

        const docRef = doc(db, "employees", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          Alert.alert("Error", "User data not found");
        }
      } catch (error) {
        Alert.alert("Error fetching user data", error.message);
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
    router.replace("admin/home");
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
          Your Profile
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
        {userData &&
          [
            { label: "Name", value: userData.firstName },
            { label: "Last Name", value: userData.lastName },
            { label: "DNI/NIE", value: userData.dni },
            { label: "Telephone", value: userData.phone },
            { label: "Birth", value: userData.birthDate },
            { label: "Email", value: userData.email },
          ].map((item, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 16, color: "grey", marginBottom: 5 }}>
                {item.value || "N/A"}
              </Text>
              <View style={{ height: 1, backgroundColor: "black" }} />
            </View>
          ))}
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
