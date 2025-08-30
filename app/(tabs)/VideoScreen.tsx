import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from './types';
import { WebView } from 'react-native-webview'; // install if not already

type VideoRouteProp = RouteProp<RootStackParamList, 'Video'>;

export default function VideoScreen() {
  const route = useRoute<VideoRouteProp>();
  const navigation = useNavigation();
  const { videoId, title } = route.params;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* YouTube Video */}
      <WebView
        style={styles.webview}
        javaScriptEnabled={true}
        source={{ uri: `https://www.youtube.com/embed/${videoId}?controls=1&autoplay=0` }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111',
  },
  backBtn: { fontSize: 20, color: '#fff', marginRight: 10 },
  title: { fontSize: 16, color: '#fff', flexShrink: 1 },
  webview: { flex: 1 },
});
