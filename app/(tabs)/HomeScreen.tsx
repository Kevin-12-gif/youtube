import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";

import DonateButton from "./DonateButton";
import { useTheme } from "./ThemeContext";
import { RootStackParamList } from "./types";

const API_KEY = "AIzaSyD1QZ4sjHOqFE40096MDCKEw1Kum6k2ZhU";
const CHANNEL_ID = "UCtlxqyUjGz31UItA-eQJDNg";

const CUSTOM_CHANNEL_ICON = "https://i.imgur.com/kUP7JIq.png";
const CUSTOM_CHANNEL_TITLE = "PlayTime!";

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(true);

  const playlistsRef = useRef<ScrollView>(null) as React.RefObject<ScrollView>;
  const [playlistsScrollX, setPlaylistsScrollX] = useState(0);

  const scroll = (
    ref: React.RefObject<ScrollView>,
    direction: "left" | "right",
    currentX: number
  ) => {
    if (!ref.current) return;
    const offset = 200;
    const newX = direction === "left" ? Math.max(0, currentX - offset) : currentX + offset;
    ref.current.scrollTo({ x: newX, animated: true });
  };

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

  if (loadingYouTube) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  const arrowColor = isDark ? "#fff" : "#000";

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
            onPress={() => scroll(playlistsRef, "left", playlistsScrollX)}
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
            onPress={() => scroll(playlistsRef, "right", playlistsScrollX)}
          >
            <Text style={[styles.arrowText, { color: arrowColor }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Games (Local Screens) */}
        <Text style={[styles.rowTitle, { color: isDark ? "#fff" : "#000" }]}>Games</Text>
        <View style={styles.gamesWrapper}>
          {[
            { name: "Bug Swat Defense", screen: "bugswatdefense", gameUrl: "bugswatdefense" },
            { name: "Color Crush", screen: "colorcrush", gameUrl: "colorcrush" },
            { name: "Neon 2048", screen: "neon2048", gameUrl: "neon2048" },
            { name: "Neon Pong", screen: "neonpong", gameUrl: "neonpong" },
            { name: "Neon Snake", screen: "neonsnake", gameUrl: "neonsnake" },
            { name: "Neural Sync", screen: "neuralsync", gameUrl: "neuralsync" },
          ].map((game) => (
            <TouchableOpacity
              key={game.screen}
              style={styles.gameButton}
              onPress={() =>
                navigation.navigate("Game", { gameUrl: game.gameUrl })
              }
            >
              <Text style={styles.gameButtonText}>{game.name}</Text>
            </TouchableOpacity>
          ))}
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
  arrowText: { fontSize: 28, paddingHorizontal: 8 },
  gamesWrapper: { marginTop: 10, gap: 10 },
  gameButton: { backgroundColor: "#007bff", padding: 15, borderRadius: 10 },
  gameButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", textAlign: "center" },
});
