import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import HomeScreen from './HomeScreen';
import PlaylistScreen from './PlaylistScreen';
import VideoScreen from './VideoScreen';
import Game2048 from './games/Game2048';
import Snake from './games/Snake';
import MemoryMatch from './games/MemoryMatch';
import CanvasGame from './games/CanvasGame';
import Pong from './games/Pong';
import CosmicStriker from './games/CosmicStriker';
import { RootStackParamList } from './types';

import { ThemeProvider, useTheme } from './ThemeContext';

SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator<RootStackParamList>();

// Navigation wrapped with theme support
function MainNavigator() {
  const { theme } = useTheme(); // ✅ Use theme here

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme === 'dark' ? '#000000' : '#C2F2FF' }, // ✅ Set background color
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Playlist" component={PlaylistScreen} />
      <Stack.Screen name="Video" component={VideoScreen} />
      <Stack.Screen name="Game2048" component={Game2048} />
      <Stack.Screen name="Snake" component={Snake} />
      <Stack.Screen name="MemoryMatch" component={MemoryMatch} />
      <Stack.Screen name="CanvasGame" component={CanvasGame} />
      <Stack.Screen name="Pong" component={Pong} />
      <Stack.Screen name="CosmicStriker" component={CosmicStriker} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            font-family: 'Inter_400Regular', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
        `}} />
      )}
      <MainNavigator />
    </ThemeProvider>
  );
}
