// components/CustomToastConfig.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Base styles for reusability
const baseStyles = StyleSheet.create({
  container: {
    height: "auto",
    minHeight: 70,
    width: "90%",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: "5%",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  text1: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  text2: {
    fontSize: 15,
    color: "white",
    flexWrap: "wrap",
  },
  closeButton: {
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
});

// Custom Success Toast
const SuccessToast = ({ text1, text2, hide }) => (
  <View style={[baseStyles.container, styles.successContainer]}>
    <View style={[baseStyles.iconContainer, styles.successIconBg]}>
      <Ionicons name="checkmark" size={24} color="white" />
    </View>
    <View style={baseStyles.textContainer}>
      {text1 && <Text style={baseStyles.text1}>{text1}</Text>}
      {text2 && <Text style={baseStyles.text2}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={baseStyles.closeButton}>
      <Ionicons name="close" size={24} color="white" />
    </TouchableOpacity>
  </View>
);

const ErrorToast = ({ text1, text2, hide }) => (
  <View style={[baseStyles.container, styles.errorContainer]}>
    <View style={[baseStyles.iconContainer, styles.errorIconBg]}>
      <Ionicons name="close" size={24} color="white" />
    </View>
    <View style={baseStyles.textContainer}>
      {text1 && <Text style={baseStyles.text1}>{text1}</Text>}
      {text2 && <Text style={baseStyles.text2}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={baseStyles.closeButton}>
      <Ionicons name="close" size={24} color="white" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  successContainer: {
    backgroundColor: "#2E7D32",
  },
  successIconBg: {
    backgroundColor: "#1B5E20",
  },
  errorContainer: {
    backgroundColor: "#C62828",
  },
  errorIconBg: {
    backgroundColor: "#B71C1C",
  },
});

// Configuration object for react-native-toast-message
export const toastConfig = {
  success: (props) => <SuccessToast {...props} />,

  error: (props) => <ErrorToast {...props} />,
};
