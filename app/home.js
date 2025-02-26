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
      <View
        style={{
          paddingTop: 40,
          backgroundColor: "#FF9300",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Image
          source={require("../assets/icon.png")}
          style={{ width: 50, height: 50 }}
        />
        <Text
          style={{ fontFamily: "Overpass-Bold", fontSize: 24, color: "white" }}
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
          }}
        >
          <Text style={{ color: "white", fontSize: 18, textAlign: "center" }}>
            Calculation of Necessary Distance/Thickness
          </Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
          padding: 16,
          alignItems: "flex-end",
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
