import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NavigationProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import DonateButton from "./DonateButton";
import MuteButton from "./MuteButton";
import { useTheme } from "./ThemeContext";
import { useMusic } from "./MusicContext";
import { RootStackParamList } from "./types";

const API_KEY = "AIzaSyDf6LuMVpyldU2b4iSLxACYG-TFi21MxPo";
const CHANNEL_ID = "UCtlxqyUjGz31UItA-eQJDNg";
const CUSTOM_CHANNEL_TITLE = "PlayTime!";

interface Playlist {
  id: string;
  snippet: { title: string; thumbnails: { medium: { url: string } } };
}

const LOCAL_GAMES = [
  { id: '2048', title: '2048', screen: 'Game2048', icon: 'grid-outline', iconColor: '#FFC107', bgColor: '#FFF8E1' },
  { id: 'snake', title: 'Snake', screen: 'Snake', icon: 'snake', iconColor: '#4CAF50', bgColor: '#E8F5E9' },
  { id: 'memory', title: 'Memory Match', screen: 'MemoryMatch', icon: 'apps-outline', iconColor: '#2196F3', bgColor: '#E3F2FD' },
  { id: 'canvas', title: 'Canvas', screen: 'CanvasGame', icon: 'brush-outline', iconColor: '#E91E63', bgColor: '#FCE4EC' },
  { id: 'pong', title: 'Pong', screen: 'Pong', icon: 'tennisball-outline', iconColor: '#FF5722', bgColor: '#FBE9E7' },
  { id: 'cosmic', title: 'Cosmic Striker', screen: 'CosmicStriker', icon: 'rocket-outline', iconColor: '#9C27B0', bgColor: '#E8EAF6' },
  { id: 'brick', title: 'Brick Breaker', screen: 'BrickBreaker', icon: 'wall', iconColor: '#E91E63', bgColor: '#FCE4EC' },
];

const palette = {
  dark: {
    bg: "#000000",
    card: "#141922",
    cardBorder: "rgba(255,255,255,0.10)",
    text: "#F5F7FA",
    subtext: "#8B95A5",
    accent: "#4F8CFF",
    accentSoft: "rgba(79,140,255,0.14)",
  },
  light: {
    bg: "#C2F2FF",
    card: "#FFFFFF",
    cardBorder: "rgba(15,23,42,0.10)",
    text: "#0F172A",
    subtext: "#64748B",
    accent: "#2563EB",
    accentSoft: "rgba(37,99,235,0.08)",
  },
};

type Colors = typeof palette.dark;

function AnimatedTile({
  imageUri,
  label,
  onPress,
  index,
  colors,
  fallbackIcon = "game-controller-outline",
  iconColor,
  bgColor,
}: {
  imageUri?: string;
  label: string;
  onPress: () => void;
  index: number;
  colors: Colors;
  fallbackIcon?: string;
  iconColor?: string;
  bgColor?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index * 55, 400),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

  const renderIcon = () => {
    if (imageUri) return <Image source={{ uri: imageUri }} style={styles.tileImage} />;

    if (fallbackIcon === 'snake' || fallbackIcon === 'wall') {
      return <MaterialCommunityIcons name={fallbackIcon as any} size={26} color={iconColor || "#4CAF50"} />;
    }

    return <Ionicons name={fallbackIcon as any} size={26} color={iconColor || colors.accent} />;
  };

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={styles.tile}
      >
        <View
          style={[
            styles.tileImageWrap,
            { backgroundColor: bgColor || "#FFFFFF", borderColor: colors.cardBorder },
          ]}
        >
          {renderIcon()}
        </View>
        <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function Section({
  title,
  icon,
  children,
  scrollRef,
  onScroll,
  colors,
  onArrow,
  iconColor,
  iconBg,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children?: React.ReactNode;
  scrollRef: React.RefObject<ScrollView | null>;
  onScroll: (e: any) => void;
  colors: Colors;
  onArrow: (dir: "left" | "right") => void;
  iconColor?: string;
  iconBg?: string;
}) {
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: headerFade,
          transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconWrap, { backgroundColor: iconBg || colors.accent, borderColor: iconBg || colors.accent }]}>
            <Ionicons name={icon} size={15} color={iconColor || "#FFFFFF"} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
      </View>

      <View style={styles.carouselContainer}>
        <TouchableOpacity
          style={[styles.sideArrow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
          onPress={() => onArrow("left")}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.subtext} />
        </TouchableOpacity>

        <ScrollView
          ref={scrollRef}
          horizontal
          style={{ flex: 1 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowWrapper}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {children}
        </ScrollView>

        <TouchableOpacity
          style={[styles.sideArrow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
          onPress={() => onArrow("right")}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { setTrack } = useMusic();
  const isDark = theme === "dark";
  const colors = isDark ? palette.dark : palette.light;

  useFocusEffect(
    useCallback(() => {
      setTrack("Main");
    }, [setTrack])
  );

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(true);

  const playlistsRef = useRef<ScrollView>(null);
  const gamesRef = useRef<ScrollView>(null);
  const playlistsScrollX = useRef(0);
  const gamesScrollX = useRef(0);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
    ]).start();
  }, []);

  const scroll = (
    ref: React.RefObject<ScrollView | null>,
    direction: "left" | "right",
    scrollXRef: React.MutableRefObject<number>
  ) => {
    if (!ref.current) return;
    const offset = 230;
    const currentX = scrollXRef.current;
    const newX = direction === "left" ? Math.max(0, currentX - offset) : currentX + offset;
    ref.current.scrollTo({ x: newX, animated: true });
  };

  useEffect(() => {
    let cancelled = false;
    const fetchPlaylists = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${CHANNEL_ID}&maxResults=10&key=${API_KEY}`
        );
        const json = await res.json();
        if (!cancelled) {
          setPlaylists(Array.isArray(json?.items) ? json.items : []);
          setLoadingYouTube(false);
        }
      } catch (err) {
        if (!cancelled) setLoadingYouTube(false);
      }
    };
    fetchPlaylists();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topActions}>
        <MuteButton />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: headerFade,
            transform: [
              { translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
              { scale: headerScale },
            ],
            alignItems: "center",
          }}
        >
          <View style={[styles.logoRingWrap, { borderColor: "#FFFFFF" }]}>
            <LinearGradient
              colors={isDark ? ["#1B2433", "#0A0E14"] : ["#E4EFFF", "#B7D9FF"]}
              style={styles.logoRing}
            >
              <Image source={{ uri: "https://i.imgur.com/kUP7JIq.png" }} style={styles.channelLogo} />
            </LinearGradient>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{CUSTOM_CHANNEL_TITLE}</Text>
        </Animated.View>

        <Section
          title="Playlists"
          icon="logo-youtube"
          iconColor="#FF0000"
          iconBg="#FFFFFF"
          scrollRef={playlistsRef}
          colors={colors}
          onScroll={(e: any) => (playlistsScrollX.current = e.nativeEvent.contentOffset.x)}
          onArrow={(dir) => scroll(playlistsRef, dir, playlistsScrollX)}
        >
          {playlists.map((playlist, i) => (
            <AnimatedTile
              key={playlist.id}
              index={i}
              colors={colors}
              imageUri={playlist.snippet.thumbnails.medium.url}
              label={playlist.snippet.title}
              fallbackIcon="albums-outline"
              onPress={() =>
                navigation.navigate("Playlist", {
                  title: playlist.snippet.title,
                  playlistId: playlist.id,
                })
              }
            />
          ))}
        </Section>

        <Section
          title="Games"
          icon="game-controller-outline"
          iconColor="#000000"
          iconBg="#FFFFFF"
          scrollRef={gamesRef}
          colors={colors}
          onScroll={(e: any) => (gamesScrollX.current = e.nativeEvent.contentOffset.x)}
          onArrow={(dir) => scroll(gamesRef, dir, gamesScrollX)}
        >
          {LOCAL_GAMES.map((game, i) => (
            <AnimatedTile
              key={game.id}
              index={i}
              colors={colors}
              label={game.title}
              fallbackIcon={game.icon as any}
              onPress={() => navigation.navigate(game.screen as any)}
              iconColor={game.iconColor}
              bgColor={game.bgColor}
            />
          ))}
        </Section>

        <DonateButton />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topActions: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  scrollContent: { padding: 18, paddingBottom: 44 },
  logoRingWrap: {
    width: 260,
    height: 260,
    borderRadius: 48,
    borderWidth: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  logoRing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  channelLogo: { width: "100%", height: "100%" },
  title: { fontSize: 26, fontFamily: "Inter_800ExtraBold", textAlign: "center", letterSpacing: 0.2, marginBottom: 32 },
  section: { marginBottom: 26 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center" },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.1 },
  carouselContainer: { flexDirection: "row", alignItems: "center" },
  sideArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  rowWrapper: { flexDirection: "row", gap: 12, paddingVertical: 4, paddingHorizontal: 10 },
  tile: { alignItems: "center", width: 84 },
  tileImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tileImage: { width: "100%", height: "100%" },
  tileLabel: { marginTop: 8, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
});