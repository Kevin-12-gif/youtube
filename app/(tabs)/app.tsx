import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

import HomeScreen from './HomeScreen';
import PlaylistScreen from './PlaylistScreen';
import VideoScreen from './VideoScreen';
import { RootStackParamList } from './types';

import { ThemeProvider, useTheme } from './ThemeContext'; // ✅ Make sure this is here

const Stack = createStackNavigator<RootStackParamList>();

// Navigation wrapped with theme support
function MainNavigator() {
  const { theme } = useTheme(); // ✅ Use theme here

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme === 'dark' ? '#000' : '#fff' }, // ✅ Set background color
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Playlist" component={PlaylistScreen} />
      <Stack.Screen name="Video" component={VideoScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ApolloProvider
      client={new ApolloClient({
        uri: 'https://oddball-alarmed-translation-hamsaaalasadi.replit.app/graphql',
        cache: new InMemoryCache(),
      })}
    >
      <ThemeProvider>
        <MainNavigator />
      </ThemeProvider>
    </ApolloProvider>
  );
}
