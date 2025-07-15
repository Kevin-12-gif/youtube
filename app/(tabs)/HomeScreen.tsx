import { NavigationProp, useNavigation } from '@react-navigation/native';
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
  Platform,
} from 'react-native';
import DonateButton from './DonateButton';
import { RootStackParamList } from './types';

import { gql, useQuery } from '@apollo/client';

import mobileAds, { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Updated TypeScript interface for GraphQL query result
interface GamesData {
  games: {
    id: string;
    title: string;
    url?: string;       // URL to launch game
    icon?: string;      // Image icon for game
  }[];
}

const API_KEY = 'AIzaSyD1QZ4sjHOqFE40096MDCKEw1Kum6k2ZhU'; // replace this
const CHANNEL_ID = 'UCtlxqyUjGz31UItA-eQJDNg';

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

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [channelTitle, setChannelTitle] = useState('');
  const [channelIcon, setChannelIcon] = useState('');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(true);

  const { loading: loadingGames, error: errorGames, data } = useQuery<GamesData>(GAMES_QUERY);

  // Interstitial ad setup
  const interstitialAdUnitId = Platform.select({
    ios: 'ca-app-pub-1988887326141459/7661195064',       
    android: 'ca-app-pub-1988887326141459/7581304017', 
    default: TestIds.INTERSTITIAL,
  });

  const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId!);

  const [adLoaded, setAdLoaded] = useState(false);
  const [adClosed, setAdClosed] = useState(false);

  useEffect(() => {
    const adListener = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const adClosedListener = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdClosed(true);
    });

    interstitial.load();

    return () => {
      adListener();
      adClosedListener();
    };
  }, []);

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

  // Show loading + ad screen until ad is closed
  if (!adClosed) {
    if (adLoaded) {
      interstitial.show();
    }

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading Ad...</Text>
      </View>
    );
  }

  if (loadingYouTube || loadingGames)
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  const openGameUrl = (url?: string) => {
    if (url) {
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Alert.alert('Cannot open the game URL.');
          }
        })
        .catch(() => Alert.alert('An error occurred while trying to open the URL.'));
    } else {
      Alert.alert('Game URL not available.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Channel Info */}
      <Image source={{ uri: channelIcon }} style={styles.channelLogo} />
      <Text style={styles.title}>{channelTitle}</Text>

      {/* YouTube Playlists Row */}
      <Text style={styles.rowTitle}>YouTube Playlists</Text>
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
            <Text style={styles.itemName} numberOfLines={1}>
              {playlist.snippet.title}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Games Row */}
      <Text style={styles.rowTitle}>Games</Text>
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
              <Text style={styles.itemName} numberOfLines={1}>
                {game.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Donate Button */}
      <View style={styles.donateWrapper}>
        <DonateButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
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
    width: '100%',
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemName: {
    marginTop: 6,
    fontSize: 14,
    maxWidth: 100,
    textAlign: 'center',
  },
  donateWrapper: {
    marginTop: 20,
    marginBottom: 0,
  },
});
