import { Link, Stack } from "expo-router";
import { Pressable, View, Text, Image } from "react-native";
import { Logo } from "../components/Logo";
import { CircleInfoIcon } from "../components/Icons";

export default function Layout() {
  return (
    <View className="flex-1">
      {/* Header */}
      <View
        style={{
          backgroundColor: "#FF9300",
        }}
        className="flex-row justify-between items-center bg-orange-500 p-4 rounded-t-lg"
      >
        <Logo />
        <Text className="text-white text-lg font-bold">HOME</Text>
        <Link asChild href="/about">
          <Pressable>
            <CircleInfoIcon />
          </Pressable>
        </Link>
      </View>

      {/* Main Buttons */}
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-blue-100 to-orange-100">
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
    </View>
  );
}
