
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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

const CELL = 16;

interface SnakeGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: "playing" | "paused" | "ended";
}

interface Point {
  x: number;
  y: number;
}

const PALETTE = {
  light: {
    bg: "#C4EDFF",
    board: "#e0e7ff",
    boardBorder: "#818cf8",
    text: "#1e1b4b",
    subtext: "#6d28d9",
    snakeHead: "#16a34a",
    snakeBody: ["#22c55e", "#4ade80", "#86efac"],
    food: "#f43f5e",
    foodGlow: "rgba(244,63,94,0.45)",
    scorePill: "#4f46e5",
    speedPill: "#f59e0b",
    lengthPill: "#0ea5e9",
    controlsBg: "#ffffff",
    controlBorder: "#c7d2fe",
    controlIcon: "#4f46e5",
    controlPressed: "#eef2ff",
    overOverlay: "rgba(15,23,42,0.55)",
    overCardBg: "#ffffff",
    overBorder: "#f43f5e",
    overTitle: "#e11d48",
    resetButton: "#4f46e5",
  },
  dark: {
    bg: "#0b0f2a",
    board: "#161335",
    boardBorder: "#7c3aed",
    text: "#f1f5f9",
    subtext: "#a78bfa",
    snakeHead: "#4ade80",
    snakeBody: ["#22c55e", "#16a34a", "#15803d"],
    food: "#fb7185",
    foodGlow: "rgba(251,113,133,0.55)",
    scorePill: "#22d3ee",
    speedPill: "#facc15",
    lengthPill: "#f472b6",
    controlsBg: "#1e1b4b",
    controlBorder: "#7c3aed",
    controlIcon: "#a78bfa",
    controlPressed: "#2e1065",
    overOverlay: "rgba(0,0,0,0.65)",
    overCardBg: "#161335",
    overBorder: "#fb7185",
    overTitle: "#fb7185",
    resetButton: "#7c3aed",
  },
};

type Colors = typeof PALETTE.light;

function DirectionButton({
  symbol,
  colors,
  disabled,
  onPress,
}: {
  symbol: string;
  colors: Colors;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  const pressIn = () => {
    setIsPressed(true);
    Animated.spring(scale, {
      toValue: 0.86,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };
  const pressOut = () => {
    setIsPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View
        style={[
          styles.dirButton,
          {
            backgroundColor: isPressed
              ? colors.controlPressed
              : colors.controlsBg,
            borderColor: colors.controlBorder,
            opacity: disabled ? 0.35 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[styles.dirButtonText, { color: colors.controlIcon }]}>
          {symbol}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  const pop = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [label]);
  return (
    <Animated.View
      style={[
        styles.pill,
        { backgroundColor: color, transform: [{ scale: pop }] },
      ]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Animated.View>
  );
}

function AnimatedButton({
  label,
  emoji,
  color,
  onPress,
}: {
  label: string;
  emoji: string;
  color: string;
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
          styles.resetButton,
          { backgroundColor: color, transform: [{ scale }] },
        ]}
      >
        <Text style={styles.resetButtonText}>
          {emoji} {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function SnakeGame({
  onScoreChange = () => {},
  onGameEnd = () => {},
  gameState = "playing",
}: SnakeGameProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { setTrack } = useMusic();
  const isDark = theme === "dark";
  const colors: Colors = isDark ? PALETTE.dark : PALETTE.light;

  useFocusEffect(
    useCallback(() => {
      setTrack("Snake");
    }, [setTrack])
  );

  const [score, setScore] = useState(0);
  const [snakeBody, setSnakeBody] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 });
  const [pulseKey, setPulseKey] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameLoop = useRef<ReturnType<typeof setInterval> | null>(null);
  const titlePulse = useRef(new Animated.Value(1)).current;
  const foodPulse = useRef(new Animated.Value(1)).current;
  const headBounce = useRef(new Animated.Value(1)).current;
  const overScale = useRef(new Animated.Value(0)).current;

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const gameWidth = useMemo(() => {
    const raw = SCREEN_WIDTH - 60;
    return Math.floor(raw / CELL) * CELL;
  }, [SCREEN_WIDTH]);

  const boardRows = useMemo(() => {
    // Calculate available height: Screen height minus Header, Pills, and Controls
    // Using percentages to be more adaptive
    const headerHeight = 60;
    const pillsHeight = 50;
    const footerHeight = 220; // Controls at the bottom
    const safePadding = 40;

    const availableHeight = SCREEN_HEIGHT - headerHeight - pillsHeight - footerHeight - safePadding;
    const gameHeight = Math.max(240, Math.min(availableHeight, gameWidth * 1.5));
    return Math.max(8, Math.floor(gameHeight / CELL));
  }, [gameWidth, SCREEN_HEIGHT]);

  const boardCols = gameWidth / CELL;
  const gameHeight = boardRows * CELL;

  const getGameSpeed = () => {
    const baseSpeed = 190;
    const speedIncrease = Math.floor(score / 50) * 14;
    return Math.max(85, baseSpeed - speedIncrease);
  };

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== "playing" || isGameOver) return;
        const key = e.key.toLowerCase();
        if (key === "arrowup" || key === "w") changeDirection({ x: 0, y: -1 });
        else if (key === "arrowdown" || key === "s") changeDirection({ x: 0, y: 1 });
        else if (key === "arrowleft" || key === "a") changeDirection({ x: -1, y: 0 });
        else if (key === "arrowright" || key === "d") changeDirection({ x: 1, y: 0 });
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [gameState, isGameOver, direction]);

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(titlePulse, {
          toValue: 1.05,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(titlePulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(foodPulse, {
          toValue: 1.3,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(foodPulse, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const bumpHead = () => {
    Animated.sequence([
      Animated.timing(headBounce, {
        toValue: 1.35,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(headBounce, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();
  };

  const placeFood = (snake: Point[]) => {
    let next: Point;
    let guard = 0;
    do {
      next = {
        x: Math.floor(Math.random() * boardCols),
        y: Math.floor(Math.random() * boardRows),
      };
      guard += 1;
    } while (
      snake.some((seg) => seg.x === next.x && seg.y === next.y) &&
      guard < 200
    );
    return next;
  };

  const resetGame = () => {
    const start = [{ x: 10, y: 10 }];
    overScale.setValue(0);
    setIsGameOver(false);
    setScore(0);
    setSnakeBody(start);
    setDirection({ x: 1, y: 0 });
    setFood(placeFood(start));
  };

  // Classic mode: hitting a wall or your own tail ends the game.
  useEffect(() => {
    if (gameState === "playing" && !isGameOver) {
      gameLoop.current = setInterval(() => {
        setSnakeBody((prevSnake) => {
          const newSnake = [...prevSnake];
          const head = { ...newSnake[0] };
          head.x += direction.x;
          head.y += direction.y;

          const hitWall =
            head.x < 0 ||
            head.x >= boardCols ||
            head.y < 0 ||
            head.y >= boardRows;
          const hitSelf = newSnake.some(
            (seg) => seg.x === head.x && seg.y === head.y,
          );

          if (hitWall || hitSelf) {
            setIsGameOver(true);
            onGameEnd(score);
            Animated.spring(overScale, {
              toValue: 1,
              useNativeDriver: true,
              friction: 6,
            }).start();
            return prevSnake;
          }

          if (head.x === food.x && head.y === food.y) {
            setTimeout(() => setScore((prev) => prev + 10), 0);
            bumpHead();
            setPulseKey((k) => k + 1);
            setFood(placeFood([head, ...newSnake]));
            newSnake.unshift(head);
          } else {
            newSnake.pop();
            newSnake.unshift(head);
          }

          return newSnake;
        });
      }, getGameSpeed());
    } else if (gameLoop.current) {
      clearInterval(gameLoop.current);
      gameLoop.current = null;
    }

    return () => {
      if (gameLoop.current) {
        clearInterval(gameLoop.current);
        gameLoop.current = null;
      }
    };
  }, [gameState, direction, food, score, boardCols, boardRows, isGameOver]);

  const changeDirection = (newDirection: Point) => {
    if (direction.x !== 0 && newDirection.x === -direction.x) return;
    if (direction.y !== 0 && newDirection.y === -direction.y) return;
    setDirection(newDirection);
  };

  const canSteer = gameState === "playing" && !isGameOver;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
          🐍 Classic Snake
        </Animated.Text>
        <MuteButton color={colors.text} />
      </View>

      <View style={styles.pillRow}>
        <Pill
          key={`score-${pulseKey}`}
          label={`⭐ ${score}`}
          color={colors.scorePill}
        />
        <Pill label={`🔗 ${snakeBody.length}`} color={colors.lengthPill} />
        <Pill
          label={`⚡ ${Math.round(1000 / getGameSpeed())}x`}
          color={colors.speedPill}
        />
      </View>

      <View style={styles.gameContainer}>
        <View
          style={[
            styles.gameBoard,
            {
              backgroundColor: colors.board,
              borderColor: colors.boardBorder,
              width: gameWidth,
              height: gameHeight,
            },
          ]}
        >
          {snakeBody.map((segment, index) => {
            const isHead = index === 0;
            return (
              <Animated.View
                key={index}
                style={[
                  styles.snakeSegment,
                  {
                    left: segment.x * CELL,
                    top: segment.y * CELL,
                    width: CELL - 2,
                    height: CELL - 2,
                    backgroundColor: isHead
                      ? colors.snakeHead
                      : colors.snakeBody[index % colors.snakeBody.length],
                    borderRadius: isHead ? 7 : 4,
                    opacity: Math.max(0.55, 1 - index * 0.015),
                    zIndex: isHead ? 3 : 1,
                    transform: isHead
                      ? [{ scale: headBounce }]
                      : [{ scale: 1 }],
                  },
                ]}
              />
            );
          })}
          <Animated.View
            style={[
              styles.food,
              {
                left: food.x * CELL,
                top: food.y * CELL,
                width: CELL - 2,
                height: CELL - 2,
                backgroundColor: colors.food,
                shadowColor: colors.foodGlow,
                transform: [{ scale: foodPulse }],
              },
            ]}
          />

          {isGameOver && (
            <View
              style={[
                styles.overOverlay,
                { backgroundColor: colors.overOverlay },
              ]}
            >
              <Animated.View
                style={[
                  styles.overCard,
                  {
                    backgroundColor: colors.overCardBg,
                    borderColor: colors.overBorder,
                    transform: [{ scale: overScale }],
                  },
                ]}
              >
                <Text style={styles.overEmoji}>💥</Text>
                <Text style={[styles.overTitle, { color: colors.overTitle }]}>
                  Game Over
                </Text>
                <Text style={[styles.overScore, { color: colors.text }]}>
                  Final Score: {score}
                </Text>
                <AnimatedButton
                  label="Play Again"
                  emoji="🔁"
                  color={colors.resetButton}
                  onPress={resetGame}
                />
              </Animated.View>
            </View>
          )}
        </View>

        <View
          style={[
            styles.controls,
            {
              backgroundColor: colors.controlsBg,
              borderColor: colors.controlBorder,
            },
          ]}
        >
          <Text style={[styles.controlsInfo, { color: colors.subtext }]}>
            {isGameOver ? "Tap Play Again to restart" : "Steer with the arrows"}
          </Text>

          <DirectionButton
            symbol="↑"
            colors={colors}
            disabled={!canSteer}
            onPress={() => changeDirection({ x: 0, y: -1 })}
          />
          <View style={styles.controlRow}>
            <DirectionButton
              symbol="←"
              colors={colors}
              disabled={!canSteer}
              onPress={() => changeDirection({ x: -1, y: 0 })}
            />
            <DirectionButton
              symbol="→"
              colors={colors}
              disabled={!canSteer}
              onPress={() => changeDirection({ x: 1, y: 0 })}
            />
          </View>
          <DirectionButton
            symbol="↓"
            colors={colors}
            disabled={!canSteer}
            onPress={() => changeDirection({ x: 0, y: 1 })}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    alignItems: "center",
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
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
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
    fontSize: 12,
  },
  gameContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  gameBoard: {
    borderRadius: 16,
    marginBottom: 18,
    position: "relative",
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  snakeSegment: {
    position: "absolute",
    margin: 1,
  },
  food: {
    position: "absolute",
    margin: 1,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  overOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overCard: {
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 26,
    borderRadius: 20,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  overEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  overTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  overScore: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  resetButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  controls: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 2,
  },
  controlRow: {
    flexDirection: "row",
    gap: 44,
    marginVertical: 8,
  },
  dirButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  dirButtonText: {
    fontSize: 22,
    fontWeight: "800",
  },
  controlsInfo: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "700",
  },
});
export default SnakeGame;
