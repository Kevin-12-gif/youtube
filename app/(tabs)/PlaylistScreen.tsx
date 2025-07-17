import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import { RootStackParamList } from './types';

// Import your useTheme hook here
import { useTheme } from './ThemeContext';

type PlaylistRouteProp = RouteProp<RootStackParamList, 'Playlist'>;
type PlaylistNavProp = NavigationProp<RootStackParamList, 'Playlist'>;

type Video = {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoId: string;
};

export default function PlaylistScreen() {
  const navigation = useNavigation<PlaylistNavProp>();
  const route = useRoute<PlaylistRouteProp>();

  // Use the theme context
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!route.params) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <Text style={[styles.errorText, { color: isDark ? '#fff' : 'red' }]}>
          Error: Missing playlist information.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: isDark ? '#0af' : '#007AFF' }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { playlistId, title } = route.params;

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const API_KEY = 'AIzaSyD1QZ4sjHOqFE40096MDCKEw1Kum6k2ZhU';

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlistId}&key=${API_KEY}`
        );
        const data = await res.json();

        if (!data.items) {
          throw new Error('No videos found.');
        }

        const simplified: Video[] = data.items.map((item: any) => ({
          id: item.id,
          title: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails.medium.url,
          videoId: item.snippet.resourceId.videoId,
        }));

        setVideos(simplified);
      } catch (error) {
        console.error('Error loading playlist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [playlistId]);

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} color={isDark ? '#fff' : '#000'} />;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.videoId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('Video', {
                videoId: item.videoId,
                title: item.title,
              })
            }
          >
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            <Text style={[styles.videoTitle, { color: isDark ? '#fff' : '#000' }]}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    marginVertical: 10,
    marginHorizontal: 12,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  videoTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginBottom: 10 },
  backText: { fontSize: 16 },
});
