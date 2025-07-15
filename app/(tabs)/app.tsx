import React, { useState, useEffect } from 'react';
import {
  View,
  StatusBar,
  StyleSheet,
  Platform,
  Button,
  TextInput,
  Text,
} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './HomeScreen';
import PlaylistScreen from './PlaylistScreen';
import VideoScreen from './VideoScreen';

import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [manualMode, setManualMode] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Scheduled times (24h format, e.g. 20 = 8PM)
  const [startHour, setStartHour] = useState('20'); // dark mode start
  const [endHour, setEndHour] = useState('6'); // dark mode end

  useEffect(() => {
    if (!manualMode) {
      const interval = setInterval(() => {
        const now = new Date();
        const hour = now.getHours();

        // Determine if we are in dark mode hours
        // Supports overnight (e.g. start=20, end=6)
        const isDark =
          startHour !== '' &&
          endHour !== '' &&
          ((startHour <= endHour && hour >= Number(startHour) && hour < Number(endHour)) ||
           (startHour > endHour && (hour >= Number(startHour) || hour < Number(endHour))));

        setDarkMode(isDark);
      }, 60000); // check every minute

      return () => clearInterval(interval);
    }
  }, [manualMode, startHour, endHour]);

  const backgroundColor = darkMode ? '#111111' : '#FFFFFF';

  const navTheme: Theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: backgroundColor,
      card: backgroundColor,
      text: '#000000',
      primary: '#000000',
    },
  };

  // HeaderRight component with toggle and inputs
  const HeaderRight = () => (
    <View style={styles.headerRight}>
      <Button
        title={manualMode ? (darkMode ? 'Light Mode' : 'Dark Mode') : 'Schedule'}
        onPress={() => {
          if (manualMode) {
            setDarkMode(!darkMode);
          } else {
            setDarkMode(false);
          }
          setManualMode(!manualMode);
        }}
        color="#000"
      />
      {!manualMode && (
        <View style={styles.timeInputs}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start</Text>
            <TextInput
              value={startHour}
              onChangeText={setStartHour}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.input}
              placeholder="20"
              placeholderTextColor="#666"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>End</Text>
            <TextInput
              value={endHour}
              onChangeText={setEndHour}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.input}
              placeholder="6"
              placeholderTextColor="#666"
            />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
      />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerTintColor: '#000000',
            headerTitleStyle: { color: '#000000' },
            headerStyle: { backgroundColor: backgroundColor },
            contentStyle: { backgroundColor: backgroundColor },
            headerRight: HeaderRight,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Playlist" component={PlaylistScreen} />
          <Stack.Screen name="Video" component={VideoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 20 : 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  timeInputs: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  inputGroup: {
    marginHorizontal: 5,
    alignItems: 'center',
  },
  label: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  input: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: '#000',
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 4,
    padding: 0,
  },
});
