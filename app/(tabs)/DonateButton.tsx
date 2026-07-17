import React, { useEffect, useRef } from "react";
import { Animated, Easing, Linking, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const DONATE_URL = "https://coff.ee/buildwithstars";

export default function DonateButton() {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

  const handlePress = () => {
    Linking.openURL(DONATE_URL).catch((err) =>
      console.error("Failed to open donation link!:", err)
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={handlePress}
      >
        <LinearGradient
          colors={["#FFDD57", "#FF9F1C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Ionicons name="cafe" size={18} color="#1a1a1a" style={{ marginRight: 8 }} />
          <Text style={styles.text}>Donate!</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignSelf: "center",
  },
  text: {
    color: "#1a1a1a",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});