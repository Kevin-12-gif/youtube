import React, { useEffect, useState } from 'react';
import { Button, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';

import HomeScreen from './HomeScreen';
import PlaylistScreen from './PlaylistScreen';
import VideoScreen from './VideoScreen';
import { RootStackParamList } from './types';

const client = new ApolloClient({
  uri: 'https://oddball-alarmed-translation-hamsaaalasadi.replit.app/graphql',
  cache: new InMemoryCache(),
});

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [mode, setMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Auto switch between light/dark by time
  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      setTheme(hour >= 6 && hour < 19 ? 'light' : 'dark');
    };

    if (mode === 'auto') {
      updateTheme();
      const interval = setInterval(updateTheme, 5 * 60 * 1000); // every 5 min
      return () => clearInterval(interval);
    } else {
      setTheme(mode);
    }
  }, [mode]);

  return (
    <ApolloProvider client={client}>
      <NavigationContainer theme={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack.Navigator
          screenOptions={{
            headerRight: () => (
              <View style={{ marginRight: 10 }}>
                <Button
                  title={mode === 'auto' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}
                  onPress={() =>
                    setMode((prev) =>
                      prev === 'auto' ? 'light' : prev === 'light' ? 'dark' : 'auto'
                    )
                  }
                />
              </View>
            ),
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Playlist" component={PlaylistScreen} />
          <Stack.Screen name="Video" component={VideoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ApolloProvider>
  );
}
