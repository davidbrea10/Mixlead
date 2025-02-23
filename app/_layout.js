import { Link, Stack } from "expo-router";
import { Pressable, View, Text, Image } from "react-native";
import { CircleInfoIcon } from "../components/Icons";
import { LinearGradient } from "expo-linear-gradient";

export default function Layout() {
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
        }}
        className="flex-row justify-between items-center p-4 rounded-t-lg"
      >
        <Image
          source={require("../assets/icon.png")}
          style={{ width: 50, height: 50 }}
        />
        <Text
          style={{ fontFamily: "Overpass-Bold", fontSize: 24 }}
          className="text-white"
        >
          HOME
        </Text>
        <Link asChild href="/about">
          <Pressable>
            <Image
              source={require("../assets/logout.png")}
              style={{ width: 50, height: 50 }}
            />
          </Pressable>
        </Link>
      </View>

      {/* Main Buttons */}
      <View className="flex-1 justify-center items-center">
        <Pressable
          style={{
            width: 348,
            height: 76,
            justifyContent: "center",
            marginBottom: 68,
            backgroundColor: "rgba(4, 4, 4, 0.6)",
          }}
          className="rounded-full px-6 py-4 flex-row items-center"
        >
          <Text
            style={{ fontFamily: "Overpass-SemiBold", fontSize: 18 }}
            className="text-white text-center"
          >
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
          }}
          className="bg-gray-500 rounded-full px-6 py-4 flex-row items-center"
        >
          <Text
            style={{ fontFamily: "Overpass-SemiBold", fontSize: 18 }}
            className="text-white text-center"
          >
            My Agenda
          </Text>
        </Pressable>
        <Pressable
          style={{
            width: 348,
            height: 76,
            justifyContent: "center",
            backgroundColor: "rgba(4, 4, 4, 0.6)",
          }}
          className="bg-gray-500 rounded-full px-6 py-4 items-center"
        >
          <Text
            style={{ fontFamily: "Overpass-SemiBold", fontSize: 18 }}
            className="text-white text-center"
          >
            Calculation of Neccesary Distance/Thickness
          </Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View
        style={{
          backgroundColor: "#006892",
        }}
        className="p-4 rounded-b-lg items-end"
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
