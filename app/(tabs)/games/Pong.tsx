
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

interface PongGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: "playing" | "paused" | "ended";
}

const PALETTE = {
  light: {
    bg: "#C4EDFF",
    court: "#e0e7ff",
    courtBorder: "#818cf8",
    centerLine: "#a5b4fc",
    text: "#1e1b4b",
    subtext: "#6d28d9",
    playerPaddle: "#4f46e5",
    aiPaddle: "#f43f5e",
    ball: "#f59e0b",
    ballGlow: "rgba(245,158,11,0.5)",
    playerPill: "#4f46e5",
    aiPill: "#f43f5e",
    controlBg: "#ffffff",
    controlBorder: "#c7d2fe",
    controlIcon: "#4f46e5",
    controlPressed: "#eef2ff",
  },
  dark: {
    bg: "#0b0f2a",
    court: "#161335",
    courtBorder: "#7c3aed",
    centerLine: "#4c1d95",
    text: "#f1f5f9",
    subtext: "#a78bfa",
    playerPaddle: "#22d3ee",
    aiPaddle: "#fb7185",
    ball: "#facc15",
    ballGlow: "rgba(250,204,21,0.6)",
    playerPill: "#22d3ee",
    aiPill: "#fb7185",
    controlBg: "#1e1b4b",
    controlBorder: "#7c3aed",
    controlIcon: "#a78bfa",
    controlPressed: "#2e1065",
  },
};

type Colors = typeof PALETTE.light;

function Pill({
  label,
  color,
  bump,
}: {
  label: string;
  color: string;
  bump: number;
}) {
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (bump === 0) return;
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 1.25,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  }, [bump]);
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

function PaddleButton({
  symbol,
  colors,
  onPressIn,
  onPressOut,
}: {
  symbol: string;
  colors: Colors;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const handleIn = () => {
    setPressed(true);
    Animated.spring(scale, {
      toValue: 0.86,
      useNativeDriver: true,
      friction: 5,
    }).start();
    onPressIn();
  };
  const handleOut = () => {
    setPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
    onPressOut();
  };

  return (
    <Pressable onPressIn={handleIn} onPressOut={handleOut}>
      <Animated.View
        style={[
          styles.controlButton,
          {
            backgroundColor: pressed ? colors.controlPressed : colors.controlBg,
            borderColor: colors.controlBorder,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[styles.controlButtonText, { color: colors.controlIcon }]}>
          {symbol}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function PongGame({
  onScoreChange = () => {},
  onGameEnd = () => {},
  gameState = "playing",
}: PongGameProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { setTrack } = useMusic();
  const isDark = theme === "dark";
  const colors: Colors = isDark ? PALETTE.dark : PALETTE.light;

  useFocusEffect(
    useCallback(() => {
      setTrack("Pong");
    }, [setTrack])
  );

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const gameAreaWidth = SCREEN_WIDTH - 40;
  // Use percentage-based height to ensure controls fit on all phones
  const gameAreaHeight = Math.max(260, Math.min(SCREEN_HEIGHT * 0.45, 400));
  const paddleHeight = 60;
  const paddleWidth = 8;
  const ballSize = 10;

  const [score, setScore] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [ballPosition, setBallPosition] = useState({
    x: gameAreaWidth / 2,
    y: gameAreaHeight / 2,
  });
  const [leftPaddleY, setLeftPaddleY] = useState(
    (gameAreaHeight - paddleHeight) / 2,
  );
  const [rightPaddleY, setRightPaddleY] = useState(
    (gameAreaHeight - paddleHeight) / 2,
  );
  const [scoreFlash, setScoreFlash] = useState<"player" | "ai" | null>(null);
  const [playerBump, setPlayerBump] = useState(0);
  const [aiBump, setAiBump] = useState(0);

  // Refs mirror state so the single game-loop interval never needs to be
  // torn down and recreated on every tick (avoids a perf bug where the
  // loop restarted 60x/sec because ballPosition was a hook dependency).
  const ballPosRef = useRef(ballPosition);
  const ballVelRef = useRef({ x: 3, y: 3 });
  const leftPaddleRef = useRef(leftPaddleY);
  const rightPaddleRef = useRef(rightPaddleY);
  const paddleMovementRef = useRef<"up" | "down" | null>(null);
  const scoreRef = useRef(score);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const titlePulse = useRef(new Animated.Value(1)).current;
  const ballGlow = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

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
        Animated.timing(ballGlow, {
          toValue: 1.35,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(ballGlow, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (!scoreFlash) return;
    flashOpacity.setValue(0.55);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setScoreFlash(null);
    });
  }, [scoreFlash]);

  const getAISpeed = () => Math.min(6, 2.2 + scoreRef.current / 40);

  useEffect(() => {
    if (gameState !== "playing") {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      // Player paddle
      if (paddleMovementRef.current === "up") {
        leftPaddleRef.current = Math.max(0, leftPaddleRef.current - 5);
        setLeftPaddleY(leftPaddleRef.current);
      } else if (paddleMovementRef.current === "down") {
        leftPaddleRef.current = Math.min(
          gameAreaHeight - paddleHeight,
          leftPaddleRef.current + 5,
        );
        setLeftPaddleY(leftPaddleRef.current);
      }

      // AI paddle with occasional human-like mistakes
      const targetY = ballPosRef.current.y - paddleHeight / 2;
      const speed = getAISpeed();
      const makeMistake = Math.random() < 0.1;
      let accuracy = 0.85;
      let nextRightY = rightPaddleRef.current;

      if (makeMistake) {
        accuracy = 0.3;
        const mistakeType = Math.random();
        if (mistakeType < 0.4) {
          const wrongDirection =
            ballPosRef.current.y > rightPaddleRef.current + paddleHeight / 2
              ? -1
              : 1;
          nextRightY = rightPaddleRef.current + wrongDirection * speed * 0.5;
        } else if (mistakeType < 0.7) {
          const diff = targetY - rightPaddleRef.current;
          nextRightY =
            rightPaddleRef.current +
            Math.sign(diff) * Math.min(Math.abs(diff), speed * 0.3);
        } else {
          const randomOffset = (Math.random() - 0.5) * 20 * (1 - accuracy);
          const diff = targetY + randomOffset - rightPaddleRef.current;
          nextRightY =
            rightPaddleRef.current +
            Math.sign(diff) * Math.min(Math.abs(diff), speed);
        }
      } else {
        const randomOffset = (Math.random() - 0.5) * 20 * (1 - accuracy);
        const diff = targetY + randomOffset - rightPaddleRef.current;
        nextRightY =
          rightPaddleRef.current +
          Math.sign(diff) * Math.min(Math.abs(diff), speed);
      }
      nextRightY = Math.max(
        0,
        Math.min(gameAreaHeight - paddleHeight, nextRightY),
      );
      rightPaddleRef.current = nextRightY;
      setRightPaddleY(nextRightY);

      // Ball
      let { x, y } = ballPosRef.current;
      let { x: vx, y: vy } = ballVelRef.current;
      x += vx;
      y += vy;

      if (y <= 0 || y >= gameAreaHeight - ballSize) {
        vy = -vy;
        y = y <= 0 ? 0 : gameAreaHeight - ballSize;
      }

      if (
        x <= paddleWidth &&
        y >= leftPaddleRef.current &&
        y <= leftPaddleRef.current + paddleHeight
      ) {
        vx = Math.abs(vx) * 1.05;
        vy = vy * 1.05;
        x = paddleWidth;
      }

      if (
        x >= gameAreaWidth - paddleWidth - ballSize &&
        y >= rightPaddleRef.current &&
        y <= rightPaddleRef.current + paddleHeight
      ) {
        vx = -Math.abs(vx) * 1.05;
        vy = vy * 1.05;
        x = gameAreaWidth - paddleWidth - ballSize;
      }

      if (x < 0) {
        setAiScore((prev) => prev + 1);
        setAiBump((b) => b + 1);
        setScoreFlash("ai");
        x = gameAreaWidth / 2;
        y = gameAreaHeight / 2;
        vx = 3;
        vy = Math.random() * 4 - 2;
      } else if (x > gameAreaWidth) {
        setPlayerScore((prev) => prev + 1);
        setPlayerBump((b) => b + 1);
        setScoreFlash("player");
        setScore((prev) => prev + 10);
        x = gameAreaWidth / 2;
        y = gameAreaHeight / 2;
        vx = -3;
        vy = Math.random() * 4 - 2;
      }

      ballPosRef.current = { x, y };
      ballVelRef.current = { x: vx, y: vy };
      setBallPosition({ x, y });
    }, 16);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState, gameAreaWidth, gameAreaHeight]);

  const startPaddleMovement = (direction: "up" | "down") => {
    paddleMovementRef.current = direction;
  };
  const stopPaddleMovement = () => {
    paddleMovementRef.current = null;
  };

  // Keyboard support for web
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowUp" || e.key === "w") startPaddleMovement("up");
        if (e.key === "ArrowDown" || e.key === "s") startPaddleMovement("down");
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "ArrowDown" || e.key === "s") stopPaddleMovement();
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, []);

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
          🏓 Classic Pong
        </Animated.Text>
        <MuteButton color={colors.text} />
      </View>

      <View style={styles.pillRow}>
        <Pill
          label={`🧑 You: ${playerScore}`}
          color={colors.playerPill}
          bump={playerBump}
        />
        <Pill label={`🤖 AI: ${aiScore}`} color={colors.aiPill} bump={aiBump} />
      </View>

      <View
        style={[
          styles.court,
          {
            width: gameAreaWidth,
            height: gameAreaHeight,
            backgroundColor: colors.court,
            borderColor: colors.courtBorder,
          },
        ]}
      >
        <View
          style={[styles.centerLine, { backgroundColor: colors.centerLine }]}
        />

        <View
          style={[
            styles.paddle,
            {
              left: 0,
              top: leftPaddleY,
              backgroundColor: colors.playerPaddle,
              width: paddleWidth,
              height: paddleHeight,
            },
          ]}
        />
        <View
          style={[
            styles.paddle,
            {
              right: 0,
              top: rightPaddleY,
              backgroundColor: colors.aiPaddle,
              width: paddleWidth,
              height: paddleHeight,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.ball,
            {
              left: ballPosition.x,
              top: ballPosition.y,
              width: ballSize,
              height: ballSize,
              backgroundColor: colors.ball,
              shadowColor: colors.ballGlow,
              transform: [{ scale: ballGlow }],
            },
          ]}
        />

        {scoreFlash && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flashOverlay,
              {
                opacity: flashOpacity,
                backgroundColor:
                  scoreFlash === "player"
                    ? colors.playerPaddle
                    : colors.aiPaddle,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.controlsRow}>
        <PaddleButton
          symbol="↑"
          colors={colors}
          onPressIn={() => startPaddleMovement("up")}
          onPressOut={stopPaddleMovement}
        />
        <PaddleButton
          symbol="↓"
          colors={colors}
          onPressIn={() => startPaddleMovement("down")}
          onPressOut={stopPaddleMovement}
        />
      </View>

      <Text style={[styles.controlsInfo, { color: colors.subtext }]}>
        Hold the arrows to move your paddle
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
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
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  court: {
    borderRadius: 16,
    position: "relative",
    borderWidth: 2,
    marginBottom: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  centerLine: {
    position: "absolute",
    left: "50%",
    top: 10,
    bottom: 10,
    width: 2,
    opacity: 0.5,
    marginLeft: -1,
    borderRadius: 2,
  },
  paddle: {
    position: "absolute",
    borderRadius: 5,
  },
  ball: {
    position: "absolute",
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 14,
  },
  controlButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  controlButtonText: {
    fontSize: 24,
    fontWeight: "800",
  },
  controlsInfo: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
  },
});

export default PongGame;
