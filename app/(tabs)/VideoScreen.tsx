import { RouteProp, useRoute } from '@react-navigation/native';
import React from 'react';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from './types';

type VideoRouteProp = RouteProp<RootStackParamList, 'Video'>;

export default function VideoScreen() {
  const route = useRoute<VideoRouteProp>();
  const { videoId } = route.params;
  const videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Optional Header (can leave it empty or remove entirely) */}
      <View style={styles.header}></View>

      {/* Fullscreen Video */}
      {Platform.OS === 'web' ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            border: 'none',
          }}
        >
          <iframe
            src={videoUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>
      ) : (
        <WebView
          style={styles.webview}
          source={{ uri: videoUrl }}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    padding: 12,
    backgroundColor: '#000',
    zIndex: 1,
  },
  webview: {
    flex: 1,
  },
});t: { color: '#fff' }