import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 700; // Básico: si el ancho es mayor a 768px, consideramos tablet

// Tamaños dinámicos
const FONT_SIZE_1 = isTablet ? 22 : 18;
const FONT_SIZE_2 = isTablet ? 18 : 15;
const ICON_SIZE = isTablet ? 28 : 24;
const CONTAINER_MIN_HEIGHT = isTablet ? 90 : 70;
const BORDER_RADIUS = isTablet ? 20 : 15;

const baseStyles = StyleSheet.create({
  container: {
    minHeight: CONTAINER_MIN_HEIGHT,
    width: "90%",
    borderRadius: BORDER_RADIUS,
    paddingVertical: isTablet ? 14 : 10,
    paddingHorizontal: isTablet ? 20 : 15,
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
    width: ICON_SIZE + 16,
    height: ICON_SIZE + 16,
    borderRadius: (ICON_SIZE + 16) / 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: isTablet ? 16 : 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  text1: {
    fontSize: FONT_SIZE_1,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  text2: {
    fontSize: FONT_SIZE_2,
    color: "white",
    flexWrap: "wrap",
  },
  closeButton: {
    paddingLeft: isTablet ? 16 : 10,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
});

// Custom Success Toast
const SuccessToast = ({ text1, text2, hide }) => (
  <View style={[baseStyles.container, styles.successContainer]}>
    <View style={[baseStyles.iconContainer, styles.successIconBg]}>
      <Ionicons name="checkmark" size={ICON_SIZE} color="white" />
    </View>
    <View style={baseStyles.textContainer}>
      {text1 && <Text style={baseStyles.text1}>{text1}</Text>}
      {text2 && <Text style={baseStyles.text2}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={baseStyles.closeButton}>
      <Ionicons name="close" size={ICON_SIZE} color="white" />
    </TouchableOpacity>
  </View>
);

const ErrorToast = ({ text1, text2, hide }) => (
  <View style={[baseStyles.container, styles.errorContainer]}>
    <View style={[baseStyles.iconContainer, styles.errorIconBg]}>
      <Ionicons name="close" size={ICON_SIZE} color="white" />
    </View>
    <View style={baseStyles.textContainer}>
      {text1 && <Text style={baseStyles.text1}>{text1}</Text>}
      {text2 && <Text style={baseStyles.text2}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={baseStyles.closeButton}>
      <Ionicons name="close" size={ICON_SIZE} color="white" />
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

export const toastConfig = {
  success: (props) => <SuccessToast {...props} />,
  error: (props) => <ErrorToast {...props} />,
};
