import { View, Text, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();

  const handleBack = () => {
    router.back(); // Vuelve a la pantalla anterior
  };

  const handleCompany = () => {
    alert("Redirect to Company Screen");
  };

  const handleHome = () => {
    router.replace("employee/home"); // Vuelve al Home reemplazando el Profile
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
        {[
          { label: "Name", value: "Name" },
          { label: "Last Name", value: "Last Name" },
          { label: "DNI/NIE", value: "DNI/NIE" },
          { label: "Telephone", value: "telephone" },
          { label: "Birth", value: "20/01/2020" },
          { label: "Email", value: "email@gmail.com" },
          { label: "Company", value: "Company X" },
          { label: "Company Code", value: "Company X" },
        ].map((item, index) => (
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

        {/* Company Question */}
        <Text style={{ fontSize: 16, fontWeight: "bold", marginTop: 20 }}>
          ¿You are part of a company?
        </Text>
        <Pressable onPress={handleCompany}>
          <Text style={{ color: "blue", fontSize: 16 }}>Click Here.</Text>
        </Pressable>
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
