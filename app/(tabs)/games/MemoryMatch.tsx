import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { useMusic } from "../MusicContext";
import MuteButton from "../MuteButton";

interface MemoryGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: "playing" | "paused" | "ended";
}

interface CardData {
  id: number;
  symbol: string;
  colorIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

const ALL_SYMBOLS = [
  "⚡",
  "🔮",
  "💎",
  "🌟",
  "⭐",
  "🔥",
  "💫",
  "✨",
  "🎯",
  "🎲",
  "🎪",
  "🎨",
  "🎭",
  "🎵",
  "🎸",
  "🎤",
];

const PALETTE = {
  light: {
    bg: ["#C4EDFF", "#eef2ff"],
    text: "#1e1b4b",
    subtext: "#6d28d9",
    cardBack: "#ffffff",
    cardBackBorder: "#c7d2fe",
    cardBackIcon: "#818cf8",
    cardFace: "#ffffff",
    matchedBorder: "#22c55e",
    matchedGlow: "rgba(34,197,94,0.25)",
    scorePill: "#4f46e5",
    matchesPill: "#ec4899",
    levelPill: "#f59e0b",
    winCardBg: "#ffffff",
    winBorder: "#22c55e",
    winTitle: "#16a34a",
    button: ["#6366f1", "#8b5cf6"],
    buttonText: "#ffffff",
    symbols: [
      "#ef4444",
      "#f59e0b",
      "#22c55e",
      "#0ea5e9",
      "#6366f1",
      "#a855f7",
      "#ec4899",
      "#14b8a6",
    ],
  },
  dark: {
    bg: ["#0b0f2a", "#1a1040"],
    text: "#f1f5f9",
    subtext: "#a78bfa",
    cardBack: "#1e1b4b",
    cardBackBorder: "#7c3aed",
    cardBackIcon: "#a78bfa",
    cardFace: "#161335",
    matchedBorder: "#4ade80",
    matchedGlow: "rgba(74,222,128,0.3)",
    scorePill: "#22d3ee",
    matchesPill: "#f472b6",
    levelPill: "#facc15",
    winCardBg: "#161335",
    winBorder: "#4ade80",
    winTitle: "#4ade80",
    button: ["#7c3aed", "#c026d3"],
    buttonText: "#ffffff",
    symbols: [
      "#f87171",
      "#fbbf24",
      "#4ade80",
      "#38bdf8",
      "#a78bfa",
      "#e879f9",
      "#fb7185",
      "#2dd4bf",
    ],
  },
};

function useFlipAnim(flipped: boolean, matched: boolean) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: flipped || matched ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, [flipped, matched]);
  return anim;
}

function GameCard({
  card,
  size,
  colors,
  disabled,
  onPress,
}: {
  card: CardData;
  size: number;
  colors: typeof PALETTE.light;
  disabled: boolean;
  onPress: () => void;
}) {
  const flip = useFlipAnim(card.isFlipped, card.isMatched);
  const pressScale = useRef(new Animated.Value(1)).current;
  const matchPop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (card.isMatched) {
      Animated.sequence([
        Animated.timing(matchPop, {
          toValue: 1.15,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(matchPop, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
        }),
      ]).start();
    }
  }, [card.isMatched]);

  const frontRotateY = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotateY = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = flip.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flip.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const handlePressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 5,
    }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();

  const symbolColor =
    colors.symbols[ALL_SYMBOLS.indexOf(card.symbol) % colors.symbols.length];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ width: size, height: size, margin: 5 }}
    >
      <Animated.View
        style={[
          styles.cardFace,
          {
            width: size,
            height: size,
            backgroundColor: colors.cardBack,
            borderColor: colors.cardBackBorder,
            transform: [
              { perspective: 800 },
              { rotateY: frontRotateY },
              { scale: pressScale },
            ],
            opacity: frontOpacity,
          },
        ]}
      >
        <Text
          style={[
            styles.backIcon,
            { fontSize: size * 0.34, color: colors.cardBackIcon },
          ]}
        >
          ?
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.cardFace,
          styles.cardFaceAbsolute,
          {
            width: size,
            height: size,
            backgroundColor: card.isMatched
              ? colors.matchedGlow
              : colors.cardFace,
            borderColor: card.isMatched
              ? colors.matchedBorder
              : colors.cardBackBorder,
            borderWidth: card.isMatched ? 3 : 2,
            transform: [
              { perspective: 800 },
              { rotateY: backRotateY },
              { scale: Animated.multiply(pressScale, matchPop) },
            ],
            opacity: backOpacity,
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.42, color: symbolColor }}>
          {card.symbol}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function AnimatedButton({
  label,
  emoji,
  colors,
  onPress,
}: {
  label: string;
  emoji: string;
  colors: typeof PALETTE.light;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: 0.94,
          useNativeDriver: true,
          friction: 5,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
        }).start()
      }
    >
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: colors.button[0], transform: [{ scale }] },
        ]}
      >
        <Text style={styles.buttonText}>
          {emoji} {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function MemoryGame({
  onScoreChange = () => {},
  onGameEnd = () => {},
  gameState = "playing",
}: MemoryGameProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { setTrack } = useMusic();
  const isDark = theme === "dark";
  const colors = isDark ? PALETTE.dark : PALETTE.light;

  useFocusEffect(
    useCallback(() => {
      setTrack("RelaxedScene");
    }, [setTrack])
  );

  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [score, setScore] = useState(0);
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [level, setLevel] = useState(1);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [combo, setCombo] = useState(0);

  const winScale = useRef(new Animated.Value(0)).current;
  const titlePulse = useRef(new Animated.Value(1)).current;

  const getPairsForLevel = (currentLevel: number) =>
    Math.min(8, 3 + currentLevel);

  const getGridDimensions = (totalCards: number) => {
    if (totalCards <= 8) return { cols: 4, rows: 2 };
    if (totalCards <= 12) return { cols: 4, rows: 3 };
    return { cols: 4, rows: 4 };
  };

  const initializeGame = () => {
    const pairCount = getPairsForLevel(level);
    const levelSymbols = ALL_SYMBOLS.slice(0, pairCount);
    const gameCards = [...levelSymbols, ...levelSymbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: Date.now() + index,
        symbol,
        colorIndex: index % colors.symbols.length,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(gameCards);
    setFlippedCards([]);
    setMatches(0);
    setCombo(0);
    setIsLevelComplete(false);
  };

  useEffect(() => {
    initializeGame();
  }, [level]);

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === "r") {
          restartLevel();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [level]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      const firstCard = cards[first];
      const secondCard = cards[second];

      if (firstCard && secondCard && firstCard.symbol === secondCard.symbol) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card, index) =>
              index === first || index === second
                ? { ...card, isMatched: true, isFlipped: true }
                : card,
            ),
          );
          setMatches((prev) => prev + 1);
          setCombo((prev) => prev + 1);
          setScore((currentScore) => currentScore + 20 + combo * 5);
          setFlippedCards([]);
        }, 450);
      } else {
        setCombo(0);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card, index) =>
              index === first || index === second
                ? { ...card, isFlipped: false }
                : card,
            ),
          );
          setFlippedCards([]);
        }, 850);
      }
    }
  }, [flippedCards]);

  useEffect(() => {
    const requiredMatches = getPairsForLevel(level);
    if (matches === requiredMatches && cards.length > 0 && !isLevelComplete) {
      setIsLevelComplete(true);
      setScore((prev) => prev + 50);
      Animated.spring(winScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }
  }, [matches, level, cards.length, isLevelComplete]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(titlePulse, {
          toValue: 1.04,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(titlePulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const flipCard = (index: number) => {
    if (
      flippedCards.length === 2 ||
      cards[index].isFlipped ||
      cards[index].isMatched ||
      gameState !== "playing"
    ) {
      return;
    }
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, isFlipped: true } : card,
      ),
    );
    setFlippedCards((prev) => [...prev, index]);
  };

  const nextLevel = () => {
    winScale.setValue(0);
    setLevel((prev) => prev + 1);
  };

  const restartLevel = () => {
    winScale.setValue(0);
    setIsLevelComplete(false);
    initializeGame();
  };

  const gridDimensions = useMemo(
    () => getGridDimensions(cards.length),
    [cards.length],
  );
  const cardSize = cards.length <= 8 ? 68 : cards.length <= 12 ? 58 : 50;
  const requiredMatches = getPairsForLevel(level);
  const progress = requiredMatches > 0 ? matches / requiredMatches : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg[0] }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Animated.Text
          style={[
            styles.title,
            { color: colors.text, transform: [{ scale: titlePulse }] },
          ]}
        >
          🧠 Memory Match
        </Animated.Text>
        <MuteButton color={colors.text} />
      </View>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: colors.levelPill }]}>
          <Text style={styles.pillText}>LVL {level}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.matchesPill }]}>
          <Text style={styles.pillText}>
            {matches}/{requiredMatches} ✅
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.scorePill }]}>
          <Text style={styles.pillText}>⭐ {score}</Text>
        </View>
      </View>

      <View
        style={[
          styles.progressTrack,
          {
            borderColor: colors.cardBackBorder,
            width: Math.min(260, SCREEN_WIDTH * 0.7),
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(progress, 1) * 100}%`,
              backgroundColor: colors.matchedBorder,
            },
          ]}
        />
      </View>

      {combo > 1 && (
        <Text style={[styles.comboText, { color: colors.subtext }]}>
          🔥 Combo x{combo}!
        </Text>
      )}

      <View
        style={[
          styles.grid,
          {
            width: gridDimensions.cols * (cardSize + 10),
          },
        ]}
      >
        {cards.map((card, index) => (
          <GameCard
            key={card.id}
            card={card}
            size={cardSize}
            colors={colors}
            disabled={gameState !== "playing"}
            onPress={() => flipCard(index)}
          />
        ))}
      </View>

      {isLevelComplete && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.winCard,
              {
                backgroundColor: colors.winCardBg,
                borderColor: colors.winBorder,
                transform: [{ scale: winScale }],
              },
            ]}
          >
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={[styles.winTitle, { color: colors.winTitle }]}>
              Level {level} Complete!
            </Text>
            <Text style={[styles.winScore, { color: colors.text }]}>
              Score: {score}
            </Text>
            <View style={styles.winButtons}>
              <AnimatedButton
                label="Replay"
                emoji="🔁"
                colors={colors}
                onPress={restartLevel}
              />
              <AnimatedButton
                label="Next Level"
                emoji="🚀"
                colors={colors}
                onPress={nextLevel}
              />
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 10,
    paddingTop: Platform.OS === 'web' ? 10 : 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  pillText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  comboText: {
    marginTop: 8,
    fontWeight: "700",
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  cardFace: {
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cardFaceAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  backIcon: {
    fontWeight: "900",
    opacity: 0.6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  winCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  winEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  winTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  winScore: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 18,
  },
  winButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
});
export default MemoryGame;
