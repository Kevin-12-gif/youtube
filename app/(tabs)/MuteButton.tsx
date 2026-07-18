import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from './MusicContext';
import { useTheme } from './ThemeContext';

export default function MuteButton({ color }: { color?: string }) {
  const { isMuted, toggleMute } = useMusic();
  const { theme } = useTheme();

  const iconColor = color || (theme === 'dark' ? '#F5F7FA' : '#1e1b4b');

  return (
    <TouchableOpacity
      onPress={toggleMute}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={24}
          color={iconColor}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
