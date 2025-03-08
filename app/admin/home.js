import { View, Text, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { auth } from "../../firebase/config"; // Importa la configuración de Firebase
import { signOut } from "firebase/auth";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth); // Cierra sesión en Firebase
      router.replace("/"); // Redirige al login
    } catch (error) {
      alert("Error logging out: " + error.message);
    }
  };

  const handleSettings = () => {
    router.push("/admin/settings");
  };

  const handleCompanies = () => {
    router.push("/admin/companies");
  };

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
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 50, height: 50 }}
        />
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
          HOME
        </Text>

        <Pressable onPress={handleLogout}>
          <Image
            source={require("../../assets/logout.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Pressable
          onPress={handleCompanies}
          style={{
            width: 348,
            height: 76,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(4, 4, 4, 0.6)",
            borderRadius: 50,
            borderColor: "white",
            borderWidth: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 20,
            paddingLeft: 20, // Asegura que el icono no quede pegado al borde
            marginBottom: 100,
          }}
        >
          <Image
            source={require("../../assets/companies.png")}
            style={{
              width: 40,
              height: 40,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                textAlign: "center",
                paddingHorizontal: 10, // Evita que el texto toque los bordes
              }}
            >
              Companies
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={{
            width: 348,
            height: 76,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(4, 4, 4, 0.6)",
            borderRadius: 50,
            borderColor: "white",
            borderWidth: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 20,
            paddingLeft: 20,
          }}
        >
          <Image
            source={require("../../assets/employees.png")}
            style={{
              width: 40,
              height: 40,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                textAlign: "center",
                paddingHorizontal: 10, // Evita que el texto toque los bordes
              }}
            >
              Employees
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
          padding: 16,
          alignItems: "flex-end",
          borderTopEndRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <Pressable onPress={handleSettings}>
          <Image
            source={require("../../assets/gear-icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>
    </LinearGradient>
  );
}
