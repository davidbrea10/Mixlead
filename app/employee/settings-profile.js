import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  where,
  getDocs,
  query,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const fadeErrorAnim = useRef(new Animated.Value(1)).current;

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
                setError("No company data found.");
              }
            }
          } else {
            setError("No user data found.");
          }
        } else {
          setError("No authenticated user.");
        }
      } catch (err) {
        setError("Error fetching user data: " + err.message);
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
    router.replace("employee/home");
  };

  const handleCompany = () => {
    setModalVisible(true);
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
        {[
          { label: "Name", value: userData?.firstName || "N/A" },
          { label: "Last Name", value: userData?.lastName || "N/A" },
          { label: "DNI/NIE", value: userData?.dni || "N/A" },
          { label: "Telephone", value: userData?.phone || "N/A" },
          { label: "Birth", value: userData?.birthDate || "N/A" },
          { label: "Email", value: userData?.email || "N/A" },
          userData?.companyId && {
            label: "Company Name",
            value: companyName || "N/A",
          },
          {
            label: "Company Code",
            value: userData?.companyId || "No company assigned",
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

        {!userData?.companyId && (
          <>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginTop: 20 }}>
              ¿You are part of a company?
            </Text>
            <Pressable onPress={handleCompany}>
              <Text style={{ color: "blue", fontSize: 16 }}>Click Here.</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 24,
              borderRadius: 16,
              width: "85%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}
            >
              Are you part of a company?
            </Text>
            <Text style={{ fontSize: 14, marginBottom: 20 }}>
              Enter your company code to confirm your request. Please note that
              you will be sharing your personal data with them. If you don’t
              know it right now, you can change it from the settings.
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
              Company Code
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <TextInput
                value={companyCode}
                onChangeText={(text) => {
                  setCompanyCode(text);
                  setErrorMessage("");
                  setCodeSubmitted(false);
                  fadeAnim.setValue(1); // Reinicia la opacidad al escribir
                }}
                placeholder="Ex: A12345678"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 16,
                }}
              />
              <Pressable
                onPress={async () => {
                  if (companyCode.trim() === "") {
                    setErrorMessage("Company code cannot be empty.");
                    fadeErrorAnim.setValue(1);
                    // eslint-disable-next-line no-undef
                    setTimeout(() => {
                      Animated.timing(fadeErrorAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                      }).start(() => setErrorMessage(""));
                    }, 3000);
                    return;
                  }

                  try {
                    if (!auth.currentUser) {
                      setErrorMessage("User not logged in.");
                      return;
                    }

                    const user = auth.currentUser;
                    const userId = user.uid;

                    const employeesRef = collection(db, "employees");
                    const coordinatorsQuery = query(
                      employeesRef,
                      where("companyId", "==", companyCode),
                      where("role", "==", "coordinator"),
                    );

                    const coordinatorsSnap = await getDocs(coordinatorsQuery);

                    if (coordinatorsSnap.empty) {
                      setErrorMessage("No coordinators found in this company.");
                      return;
                    }

                    let alreadyApplied = false;

                    for (const docSnap of coordinatorsSnap.docs) {
                      const coordinatorId = docSnap.id;

                      const applicationRef = doc(
                        db,
                        "employees",
                        coordinatorId,
                        "applications",
                        userId,
                      );

                      const existingApp = await getDoc(applicationRef);

                      if (!existingApp.exists()) {
                        await setDoc(applicationRef, {
                          id: userId,
                          firstName: userData.firstName,
                          lastName: userData.lastName,
                          dni: userData.dni,
                          createdAt: new Date(),
                        });
                      } else {
                        alreadyApplied = true;
                      }
                    }

                    if (alreadyApplied) {
                      setErrorMessage("You already sent a request.");
                    } else {
                      setCodeSubmitted(true);
                      setErrorMessage("");

                      // eslint-disable-next-line no-undef
                      setTimeout(() => {
                        Animated.timing(fadeAnim, {
                          toValue: 0,
                          duration: 1000,
                          useNativeDriver: true,
                        }).start(() => setCodeSubmitted(false));
                      }, 3000);
                    }
                  } catch (err) {
                    console.error(err);
                    setErrorMessage("Something went wrong. Try again.");
                  }
                }}
                style={{
                  backgroundColor: "#0077B6",
                  padding: 10,
                  borderRadius: 8,
                  marginLeft: 8,
                }}
              >
                <Ionicons name="arrow-forward" size={20} color="white" />
              </Pressable>
            </View>

            {/* Error message */}
            {errorMessage !== "" && (
              <Animated.View style={{ opacity: fadeErrorAnim }}>
                <Text
                  style={{
                    color: "red",
                    marginBottom: 10,
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  {errorMessage}
                </Text>
              </Animated.View>
            )}

            {/* Success message */}
            {codeSubmitted && (
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text
                  style={{
                    color: "#2E7D32",
                    marginBottom: 10,
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  If the company code is correct you will receive news soon.
                </Text>
              </Animated.View>
            )}

            <Pressable
              onPress={() => setModalVisible(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "center",
              }}
            >
              <Text style={{ color: "blue", fontSize: 16 }}>
                Continue as a guest
              </Text>
              <Ionicons
                name="arrow-forward-outline"
                size={16}
                color="blue"
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
          padding: 40,
          alignItems: "flex-end",
          borderTopEndRadius: 40,
          elevation: 10,
        }}
      />
    </LinearGradient>
  );
}
