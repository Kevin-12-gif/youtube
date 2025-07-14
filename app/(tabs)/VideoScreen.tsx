import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from './types';

type VideoRouteProp = RouteProp<RootStackParamList, 'Video'>;

export default function VideoScreen() {
  const route = useRoute<VideoRouteProp>();
  const navigation = useNavigation();
  const { videoId } = route.params;

  const videoUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
      </View>

      {/* YouTube Video */}
      {Platform.OS === 'web' ? (
        <div
          style={{
            width: '100%',
            height: 240,
            border: 'none',
            overflow: 'hidden',
          }}
        >
          <iframe
            width="100%"
            height="100%"
            src={videoUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
          ></iframe>
        </div>
      ) : (
        <WebView
          style={styles.webview}
          source={{ uri: videoUrl }}
          allowsFullscreenVideo
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
});
