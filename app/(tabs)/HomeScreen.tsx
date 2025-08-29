 import React, { useEffect, useRef, useState } from "react";
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
  Dimensions,
} from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { gql, useQuery } from "@apollo/client";

import DonateButton from "./DonateButton";
import { useTheme } from "./ThemeContext";
import { RootStackParamList } from "./types";

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

const API_KEY = "AIzaSyD1QZ4sjHOqFE40096MDCKEw1Kum6k2ZhU";
const CHANNEL_ID = "UCtlxqyUjGz31UItA-eQJDNg";

const CUSTOM_CHANNEL_ICON = "https://i.imgur.com/kUP7JIq.png";
const CUSTOM_CHANNEL_TITLE = "PlayTime!";

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
  const isDark = theme === "dark";

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(true);

  const { loading: loadingGames, error: errorGames, data } =
    useQuery<GamesData>(GAMES_QUERY);

  const playlistsRef = useRef<ScrollView>(null) as React.RefObject<ScrollView>;
  const gamesRef = useRef<ScrollView>(null) as React.RefObject<ScrollView>;

  const [playlistsScrollX, setPlaylistsScrollX] = useState(0);
  const [gamesScrollX, setGamesScrollX] = useState(0);

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${CHANNEL_ID}&maxResults=10&key=${API_KEY}`
        );
        const data = await res.json();
        setPlaylists(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        console.error(err);
        setPlaylists([]);
      } finally {
        setLoadingYouTube(false);
      }
    };
    fetchPlaylists();
  }, []);

  const openGameUrl = (url?: string) => {
    if (!url) return Alert.alert("Game URL not available.");
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert("Cannot open the game URL.");
      })
      .catch(() => Alert.alert("Error opening the URL."));
  };

  const scroll = (
    ref: React.RefObject<ScrollView>,
    direction: "left" | "right",
    currentX: number
  ) => {
    if (!ref.current) return;
    const offset = 200; // scroll amount
    const newX = direction === "left" ? Math.max(0, currentX - offset) : currentX + offset;
    ref.current.scrollTo({ x: newX, animated: true });
  };

  if (loadingYouTube || loadingGames) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Channel Header */}
        <Image source={{ uri: CUSTOM_CHANNEL_ICON }} style={styles.channelLogo} />
        <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
          {CUSTOM_CHANNEL_TITLE}
        </Text>

        {/* Playlists */}
        <Text style={[styles.rowTitle, { color: isDark ? "#fff" : "#000" }]}>
          YouTube Playlists
        </Text>
        <View style={styles.rowContainer}>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => scroll(playlistsRef, "left", playlistsScrollX)}
          >
            <Text style={{ color: isDark ? "#000" : "#fff", fontSize: 24 }}>{"<"}</Text>
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
                    source={{ uri: playlist.snippet.thumbnails.medium.url }}
                    style={styles.itemImage}
                  />
                </TouchableOpacity>
                <Text
                  style={[styles.itemName, { color: isDark ? "#fff" : "#000" }]}
                  numberOfLines={1}
                >
                  {playlist.snippet.title}
                </Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => scroll(playlistsRef, "right", playlistsScrollX)}
          >
            <Text style={{ color: isDark ? "#000" : "#fff", fontSize: 24 }}>{">"}</Text>
          </TouchableOpacity>
        </View>

        {/* Games */}
        <Text style={[styles.rowTitle, { color: isDark ? "#fff" : "#000" }]}>Games</Text>
        {errorGames ? (
          <Text style={{ textAlign: "center", color: "red" }}>Failed to load games.</Text>
        ) : (
          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => scroll(gamesRef, "left", gamesScrollX)}
            >
              <Text style={{ color: isDark ? "#000" : "#fff", fontSize: 24 }}>{"<"}</Text>
            </TouchableOpacity>

            <ScrollView
              ref={gamesRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowWrapper}
              onScroll={(e) => setGamesScrollX(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
            >
              {(data?.games ?? []).map((game) => (
                <View key={game.id} style={styles.item}>
                  <TouchableOpacity style={styles.itemCircle} onPress={() => openGameUrl(game.url)}>
                    <Image source={{ uri: game.icon || undefined }} style={styles.itemImage} />
                  </TouchableOpacity>
                  <Text style={[styles.itemName, { color: isDark ? "#fff" : "#000" }]} numberOfLines={1}>
                    {game.title}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => scroll(gamesRef, "right", gamesScrollX)}
            >
              <Text style={{ color: isDark ? "#000" : "#fff", fontSize: 24 }}>{">"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Donate */}
        <View style={styles.donateWrapper}>
          <DonateButton />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  channelLogo: { width: 300, height: 300, borderRadius: 20, alignSelf: "center", marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  rowTitle: { fontSize: 20, fontWeight: "bold", marginVertical: 10, textAlign: "center" },
  rowContainer: { flexDirection: "row", alignItems: "center" },
  rowWrapper: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  item: { alignItems: "center", marginRight: 15, width: 100 },
  itemCircle: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", backgroundColor: "#ccc", borderWidth: 5, borderColor: "#8c8a8aff" },
  itemImage: { width: "100%", height: "100%" },
  itemName: { marginTop: 6, fontSize: 14, textAlign: "center" },
  donateWrapper: { marginTop: 20 },
  arrowButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(200,200,200,0.3)",
    marginHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});
