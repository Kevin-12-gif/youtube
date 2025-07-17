import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { gql, useQuery } from '@apollo/client';

import DonateButton from './DonateButton';
import ThemeToggleButton from './ToggleThemeButton';
import { useTheme } from './ThemeContext';
import { RootStackParamList } from './types';

const GAMES_QUERY = gql`
  query {
    games {
      id
      title
      url
      icon
    }
  }
`;

const API_KEY = 'AIzaSyD1QZ4sjHOqFE40096MDCKEw1Kum6k2ZhU';
const CHANNEL_ID = 'UCtlxqyUjGz31UItA-eQJDNg';

interface GamesData {
  games: {
    id: string;
    title: string;
    url?: string;
    icon?: string;
  }[];
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [channelTitle, setChannelTitle] = useState('');
  const [channelIcon, setChannelIcon] = useState('');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(true);

  const { loading: loadingGames, error: errorGames, data } = useQuery<GamesData>(GAMES_QUERY);

  useEffect(() => {
    const fetchChannelAndPlaylists = async () => {
      try {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${CHANNEL_ID}&key=${API_KEY}`
        );
        const channelData = await channelRes.json();
        const channel = channelData.items[0];
        setChannelTitle(channel.snippet.title);
        setChannelIcon(channel.snippet.thumbnails.high.url);

        const playlistsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${CHANNEL_ID}&maxResults=10&key=${API_KEY}`
        );
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingYouTube(false);
      }
    };

    fetchChannelAndPlaylists();
  }, []);

  const openGameUrl = (url?: string) => {
    if (!url) return Alert.alert('Game URL not available.');
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert('Cannot open the game URL.');
      })
      .catch(() => Alert.alert('Error opening the URL.'));
  };

  if (loadingYouTube || loadingGames) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Top Banner with lowered toggle */}
      <View style={[styles.topBanner, { backgroundColor: isDark ? '#222' : '#eee' }]}>
        <View style={styles.topRow}>
          <ThemeToggleButton />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: channelIcon }} style={styles.channelLogo} />
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          {channelTitle}
        </Text>

        <Text style={[styles.rowTitle, { color: isDark ? '#fff' : '#000' }]}>
          YouTube Playlists
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowWrapper}
        >
          {playlists.map((playlist) => (
            <View key={playlist.id} style={styles.item}>
              <TouchableOpacity
                style={styles.itemCircle}
                onPress={() =>
                  navigation.navigate('Playlist', {
                    title: playlist.snippet.title,
                    playlistId: playlist.id,
                  })
                }
              >
                <Image
                  source={{ uri: playlist.snippet.thumbnails.medium.url }}
                  style={styles.itemImage}
                />
              </TouchableOpacity>
              <Text style={[styles.itemName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                {playlist.snippet.title}
              </Text>
            </View>
          ))}
        </ScrollView>

        <Text style={[styles.rowTitle, { color: isDark ? '#fff' : '#000' }]}>Games</Text>
        {errorGames ? (
          <Text style={{ textAlign: 'center', color: 'red' }}>
            Failed to load games.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowWrapper}
          >
            {(data?.games ?? []).map((game) => (
              <View key={game.id} style={styles.item}>
                <TouchableOpacity
                  style={styles.itemCircle}
                  onPress={() => openGameUrl(game.url)}
                >
                  <Image
                    source={{ uri: game.icon || undefined }}
                    style={styles.itemImage}
                  />
                </TouchableOpacity>
                <Text style={[styles.itemName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                  {game.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.donateWrapper}>
          <DonateButton />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
 topBanner: {
  height: 95,
  justifyContent: 'center',
  alignItems: 'flex-end',
  paddingHorizontal: 15,
  marginTop: 30, // ⬅️ Add this line to lower the banner and button
},

  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    marginRight: 15,
  },
  scrollContent: {
    padding: 20,
  },
  channelLogo: {
    width: 300,
    height: 300,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  rowTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  item: {
    alignItems: 'center',
    marginRight: 15,
    width: 100,
  },
  itemCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#ccc',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemName: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  donateWrapper: {
    marginTop: 20,
  },
});
