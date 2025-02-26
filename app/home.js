import { View, Text, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  const handleLogout = () => {
    router.replace("/"); // Vuelve al Login
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      {/* Header */}
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
          source={require("../assets/icon.png")}
          style={{ width: 50, height: 50 }}
        />
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "white",
            letterSpacing: 2, // Cambia esto por una fuente personalizada si tienes una
            textShadowColor: "black",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 1,
          }}
        >
          HOME
        </Text>

        <Pressable onPress={handleLogout}>
          <Image
            source={require("../assets/logout.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Pressable
          style={{
            width: 348,
            height: 76,
            justifyContent: "center",
            marginBottom: 68,
            backgroundColor: "rgba(4, 4, 4, 0.6)",
            borderRadius: 50,
            alignItems: "center",
            borderColor: "white",
            borderWidth: 3,

            // SOMBRA (iOS y Android)
            shadowColor: "#000", // Color de la sombra
            shadowOffset: { width: 0, height: 12 }, // Extiende la sombra hacia abajo
            shadowOpacity: 0.5, // Opacidad de la sombra
            shadowRadius: 10, // Hace la sombra más difusa
            elevation: 20, // Aumenta la sombra en Android
          }}
        >
          <Text style={{ color: "white", fontSize: 18 }}>
            Perform inspection
          </Text>
        </Pressable>

        <Pressable
          style={{
            width: 348,
            height: 76,
            justifyContent: "center",
            marginBottom: 68,
            backgroundColor: "rgba(4, 4, 4, 0.6)",
            borderRadius: 50,
            alignItems: "center",
            borderColor: "white",
            borderWidth: 3,

            // SOMBRA (iOS y Android)
            shadowColor: "#000", // Color de la sombra
            shadowOffset: { width: 0, height: 12 }, // Extiende la sombra hacia abajo
            shadowOpacity: 0.5, // Opacidad de la sombra
            shadowRadius: 10, // Hace la sombra más difusa
            elevation: 20, // Aumenta la sombra en Android
          }}
        >
          <Text style={{ color: "white", fontSize: 18 }}>My Agenda</Text>
        </Pressable>

        <Pressable
          style={{
            width: 348,
            height: 76,
            justifyContent: "center",
            backgroundColor: "rgba(4, 4, 4, 0.6)",
            borderRadius: 50,
            alignItems: "center",
            borderColor: "white",
            borderWidth: 3,

            // SOMBRA (iOS y Android)
            shadowColor: "#000", // Color de la sombra
            shadowOffset: { width: 0, height: 12 }, // Extiende la sombra hacia abajo
            shadowOpacity: 0.5, // Opacidad de la sombra
            shadowRadius: 10, // Hace la sombra más difusa
            elevation: 20, // Aumenta la sombra en Android
          }}
        >
          <Text style={{ color: "white", fontSize: 18, textAlign: "center" }}>
            Calculation of Necessary Distance/Thickness
          </Text>
        </Pressable>
      </View>

      {/* Footer */}
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
        <Pressable>
          <Image
            source={require("../assets/gear-icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>
    </LinearGradient>
  );
}
