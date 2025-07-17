import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from './ThemeContext';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        styles.button,
        { backgroundColor: isDark ? '#333' : '#ddd' },
      ]}
    >
      <Text style={[styles.text, { color: isDark ? '#fff' : '#000' }]}>
        {isDark ? '☀️' : '🌙'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    marginBottom: 20,
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
