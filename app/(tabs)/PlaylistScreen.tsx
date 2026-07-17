import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { RootStackParamList } from "./types";
import { useTheme } from "./ThemeContext";

type PlaylistRouteProp = RouteProp<RootStackParamList, "Playlist">;
type PlaylistNavProp = NavigationProp<RootStackParamList, "Playlist">;

type Video = {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoId: string;
};

// ⚠️ Restrict this key to YouTube Data API v3 in Google Cloud Console.
const API_KEY = "AIzaSyDf6LuMVpyldU2b4iSLxACYG-TFi21MxPo";

function AnimatedCard({
  video,
  index,
  isDark,
  onPress,
}: {
  video: Video;
  index: number;
  isDark: boolean;
  onPress: () => void;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index, 8) * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          { scale },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[styles.card, { backgroundColor: isDark ? "#161B22" : "#fff" }]}
      >
        <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
        <View style={styles.playBadge}>
          <Ionicons name="play" size={16} color="#fff" />
        </View>
        <Text
          style={[styles.videoTitle, { color: isDark ? "#fff" : "#111" }]}
          numberOfLines={2}
        >
          {video.title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PlaylistScreen() {
  const navigation = useNavigation<PlaylistNavProp>();
  const route = useRoute<PlaylistRouteProp>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  const playlistId = route.params?.playlistId;

  useEffect(() => {
    if (!playlistId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const fetchVideos = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlistId}&key=${API_KEY}`
        );
        const data = await res.json();

        if (data.error) {
          console.error("YouTube API error:", data.error.code, data.error.message);
          if (!cancelled) setError("Couldn't load this playlist right now.");
          return;
        }

        const simplified: Video[] = (data.items ?? [])
          .map((item: any) => {
            const snippet = item.snippet;
            if (!snippet?.resourceId?.videoId) return null;
            const thumbnailUrl =
              snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url;
            if (!thumbnailUrl) return null;
            return {
              id: item.id,
              title: snippet.title ?? "Untitled",
              thumbnailUrl,
              videoId: snippet.resourceId.videoId,
            };
          })
          .filter((v: Video | null): v is Video => v !== null);

        if (!cancelled) setVideos(simplified);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Something went wrong loading videos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const bg = isDark ? "#000000" : "#C2F2FF";
  const textColor = isDark ? "#fff" : "#111";

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const Header = (
    <Animated.View
      style={{
        opacity: headerFade,
        transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
      }}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={textColor} />
        </TouchableOpacity>
        {route.params?.title ? (
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
            {route.params.title}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );

  if (!playlistId) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={isDark ? "#fff" : "#E5484D"} />
          <Text style={[styles.errorText, { color: textColor }]}>Missing playlist information.</Text>
          <TouchableOpacity onPress={goBack} style={styles.retryButton}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.centered}>
          <LoadingPulse isDark={isDark} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={isDark ? "#fff" : "#E5484D"} />
          <Text style={[styles.errorText, { color: textColor }]}>{error}</Text>
          <TouchableOpacity onPress={goBack} style={styles.retryButton}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.centered}>
          <Ionicons name="videocam-off-outline" size={40} color={isDark ? "#aaa" : "#555"} />
          <Text style={[styles.errorText, { color: textColor }]}>This playlist has no public videos.</Text>
          <TouchableOpacity onPress={goBack} style={styles.retryButton}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {Header}
      <FlatList
        data={videos}
        keyExtractor={(item) => item.videoId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <AnimatedCard
            video={item}
            index={index}
            isDark={isDark}
            onPress={() =>
              navigation.navigate("Video", { videoId: item.videoId, title: item.title })
            }
          />
        )}
      />
    </View>
  );
}

function LoadingPulse({ isDark }: { isDark: boolean }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity: pulse }}>
      <Ionicons name="film-outline" size={48} color={isDark ? "#fff" : "#2563EB"} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(120,120,120,0.15)",
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flexShrink: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: { width: "100%", height: 190, backgroundColor: "#ccc" },
  playBadge: {
    position: "absolute",
    top: 150,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", padding: 12, paddingTop: 10 },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 12, marginBottom: 16 },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  retryText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});