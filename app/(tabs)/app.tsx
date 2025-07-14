// app/(tabs)/App.tsx
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import HomeScreen from './HomeScreen';
import PlaylistScreen from './PlaylistScreen';
import VideoScreen from './VideoScreen';

import { RootStackParamList } from './types';

// Apollo Client setup
const client = new ApolloClient({
  uri: 'https://oddball-alarmed-translation-hamsaaalasadi.replit.app/graphql',
  cache: new InMemoryCache(),
});

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ApolloProvider client={client}>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: true }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Playlist" component={PlaylistScreen} />
        <Stack.Screen name="Video" component={VideoScreen} />
      </Stack.Navigator>
    </ApolloProvider>
  );
}
