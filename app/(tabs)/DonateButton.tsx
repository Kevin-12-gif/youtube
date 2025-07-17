import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking } from 'react-native';

const DONATE_URL = 'https://coff.ee/buildwithstars'; // replace this

export default function DonateButton() {
  const handlePress = () => {
    Linking.openURL(DONATE_URL).catch(err =>
      console.error("Failed to open donation link:", err)
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.text}>Donate! ☕</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0dff00f2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});