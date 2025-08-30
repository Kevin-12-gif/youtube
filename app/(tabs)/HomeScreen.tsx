import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useTheme } from "./ThemeContext";
import { RootStackParamList } from "./types";
import DonateButton from "./DonateButton";

const API_KEY = "AIzaSyD1QZ4sjHOqFE40096MDCKEw1Kum6k2ZhU";
const CHANNEL_ID = "UCtlxqyUjGz31UItA-eQJDNg";
const CUSTOM_CHANNEL_ICON = "https://i.imgur.com/kUP7JIq.png";
const CUSTOM_CHANNEL_TITLE = "PlayTime!";

const GAMES: Array<{
  id: string;
  title: string;
  icon: string;
  route: string;
}> = [
  {
    id: '1',
    title: 'Neon 2048',
    icon: 'https://via.placeholder.com/100x100/00ff88/000000?text=2048',
    route: 'Neon2048'
  },
  {
    id: '2',
    title: 'Neon Pong',
    icon: 'https://via.placeholder.com/100x100/ff0088/000000?text=PONG',
    route: 'NeonPong'
  },
  {
    id: '3',
    title: 'Neon Snake',
    icon: 'https://via.placeholder.com/100x100/8800ff/000000?text=SNAKE',
    route: 'NeonSnake'
  },
  {
    id: '4',
    title: 'Neural Sync',
    icon: 'https://via.placeholder.com/100x100/ff8800/000000?text=SYNC',
    route: 'NeuralSync'
  },
  {
    id: '5',
    title: 'Color Crush',
    icon: 'https://via.placeholder.com/100x100/0088ff/000000?text=COLOR',
    route: 'ColorCrush'
  },
  {
    id: '6',
    title: 'Bug Swat Defense',
    icon: 'https://via.placeholder.com/100x100/ff4444/000000?text=BUGS',
    route: 'BugSwatDefense'
  }
];

interface PlaylistItem {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playlistsRef = useRef<ScrollView>(null);
  const gamesRef = useRef<ScrollView>(null);

  const [playlistsScrollX, setPlaylistsScrollX] = useState(0);
  const [gamesScrollX, setGamesScrollX] = useState(0);

  const scroll = (
    ref: React.RefObject<ScrollView | null>,
    direction: "left" | "right",
    currentX: number,
    setScrollX: React.Dispatch<React.SetStateAction<number>>
  ) => {
    if (!ref.current) return;
    const offset = 200;
    const newX = direction === "left" ? Math.max(0, currentX - offset) : currentX + offset;
    ref.current.scrollTo({ x: newX, animated: true });
    setScrollX(newX);
  };

  const handleGamePress = (route: string) => {
    try {
      // Use type assertion to work with React Navigation's strict typing
      (navigation as any).navigate(route);
    } catch (err) {
      console.error("Navigation error:", err);
      Alert.alert("Error", "Could not open game. Please try again.");
    }
  };

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setError(null);
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${CHANNEL_ID}&maxResults=10&key=${API_KEY}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'YouTube API error');
        }
        
        setPlaylists(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        console.error("YouTube API error:", err);
        setError(err instanceof Error ? err.message : 'Failed to load playlists');
        setPlaylists([]);
      } finally {
        setLoadingYouTube(false);
      }
    };
    
    fetchPlaylists();
  }, []);

  if (loadingYouTube) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? "#000" : "#fff" }]}>
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
        <Text style={[styles.loadingText, { color: isDark ? "#fff" : "#000" }]}>
          Loading...
        </Text>
      </View>
    );
  }

  const arrowColor = isDark ? "#fff" : "#000";

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Channel Header */}
        <Image 
          source={{ uri: CUSTOM_CHANNEL_ICON }} 
          style={styles.channelLogo}
          onError={(e) => console.error("Channel logo failed to load:", e.nativeEvent.error)}
        />
        <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
          {CUSTOM_CHANNEL_TITLE}
        </Text>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Unable to load YouTube playlists: {error}
            </Text>
          </View>
        )}

        {/* Playlists */}
        <Text style={[styles.rowTitle, { color: isDark ? "#fff" : "#000" }]}>
          YouTube Playlists
        </Text>
        
        {playlists.length > 0 ? (
          <View style={styles.rowContainer}>
            <TouchableOpacity
              onPress={() => scroll(playlistsRef, "left", playlistsScrollX, setPlaylistsScrollX)}
              style={styles.arrowButton}
            >
              <Text style={[styles.arrowText, { color: arrowColor }]}>{'<'}</Text>
            </TouchableOpacity>

            <ScrollView
              ref={playlistsRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowWrapper}
              onScroll={(e) => setPlaylistsScrollX(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
            >
              {playlists.map((playlist) => (
                <View key={playlist.id} style={styles.item}>
                  <TouchableOpacity
                    style={styles.itemCircle}
                    onPress={() =>
                      navigation.navigate("Playlist", {
                        title: playlist.snippet.title,
                        playlistId: playlist.id,
                      })
                    }
                  >
                    <Image
                      source={{ uri: playlist.snippet.thumbnails?.medium?.url }}
                      style={styles.itemImage}
                      onError={(e) => console.error("Playlist thumbnail failed to load:", e.nativeEvent.error)}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[styles.itemName, { color: isDark ? "#fff" : "#000" }]}
                    numberOfLines={2}
                  >
                    {playlist.snippet.title}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => scroll(playlistsRef, "right", playlistsScrollX, setPlaylistsScrollX)}
              style={styles.arrowButton}
            >
              <Text style={[styles.arrowText, { color: arrowColor }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noContentContainer}>
            <Text style={[styles.noContentText, { color: isDark ? "#aaa" : "#666" }]}>
              No playlists available
            </Text>
          </View>
        )}

        {/* Games */}
        <Text style={[styles.rowTitle, { color: isDark ? "#fff" : "#000" }]}>Games</Text>
        <View style={styles.rowContainer}>
          <TouchableOpacity
            onPress={() => scroll(gamesRef, "left", gamesScrollX, setGamesScrollX)}
            style={styles.arrowButton}
          >
            <Text style={[styles.arrowText, { color: arrowColor }]}>{'<'}</Text>
          </TouchableOpacity>

          <ScrollView
            ref={gamesRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowWrapper}
            onScroll={(e) => setGamesScrollX(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
          >
            {GAMES.map((game) => (
              <View key={game.id} style={styles.item}>
                <TouchableOpacity 
                  style={styles.itemCircle} 
                  onPress={() => handleGamePress(game.route)}
                >
                  <Image 
                    source={{ uri: game.icon }} 
                    style={styles.itemImage}
                    onError={(e) => console.error("Game icon failed to load:", e.nativeEvent.error)}
                  />
                </TouchableOpacity>
                <Text 
                  style={[styles.itemName, { color: isDark ? "#fff" : "#000" }]} 
                  numberOfLines={2}
                >
                  {game.title}
                </Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => scroll(gamesRef, "right", gamesScrollX, setGamesScrollX)}
            style={styles.arrowButton}
          >
            <Text style={[styles.arrowText, { color: arrowColor }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Donate */}
        <View style={styles.donateWrapper}>
          <DonateButton />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { 
    padding: 20 
  },
  channelLogo: { 
    width: 300, 
    height: 300, 
    borderRadius: 20, 
    alignSelf: "center", 
    marginBottom: 10 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginBottom: 20 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  rowTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginVertical: 10, 
    textAlign: "center" 
  },
  rowContainer: { 
    flexDirection: "row", 
    alignItems: "center",
    minHeight: 120,
  },
  rowWrapper: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10, 
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  item: { 
    alignItems: "center", 
    marginRight: 15, 
    width: 100 
  },
  itemCircle: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    overflow: "hidden", 
    backgroundColor: "#ccc", 
    borderWidth: 5, 
    borderColor: "#8c8a8aff" 
  },
  itemImage: { 
    width: "100%", 
    height: "100%" 
  },
  itemName: { 
    marginTop: 6, 
    fontSize: 14, 
    textAlign: "center",
    height: 40, // Fixed height to prevent layout shifts
  },
  donateWrapper: { 
    marginTop: 20 
  },
  arrowButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44, // Minimum touch target size
    minHeight: 44,
  },
  arrowText: { 
    fontSize: 28,
  },
  noContentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noContentText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});