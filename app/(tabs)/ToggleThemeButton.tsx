import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from './ThemeContext'; // Adjust if your path is different

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: isDark ? '#444' : '#fff' }]}
        onPress={toggleTheme}
      >
        <Text style={[styles.text, { color: isDark ? '#fff' : '#000' }]}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#aaa',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ThemeToggleButton;
