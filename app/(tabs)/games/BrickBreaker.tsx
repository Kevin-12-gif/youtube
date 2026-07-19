import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
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

interface BrickBreakerProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: "playing" | "paused" | "ended";
}

type BrickShape = "rect" | "round" | "diamond" | "pill";

interface Brick {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  borderColor: string;
  points: number;
  alive: boolean;
  shape: BrickShape;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isExtra?: boolean;
  expiresAt?: number | null;
  pierceCharges?: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

type PowerUpType = "WIDEN" | "PIERCE" | "LIFE" | "MULTI";

interface PowerUp {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  size: number;
  vy: number;
}

interface EffectState {
  widenUntil: number | null;
}

interface GameSnapshot {
  bricks: Brick[];
  ball: Ball;
  extraBalls: Ball[];
  paddle: Paddle;
  powerUps: PowerUp[];
  score: number;
  level: number;
  lives: number;
  gameOver: boolean;
  levelClearFlash: boolean;
}

const TICK_MS = 16;
const BASE_BALL_SPEED = 4.2;
const PADDLE_SMOOTHING = 0.35;
const BRICK_ROW_COLORS_LIGHT = ["#e11d48", "#f97316", "#facc15", "#22c55e", "#4f46e5"];
const BRICK_ROW_COLORS_DARK = ["#fb7185", "#fb923c", "#fde047", "#4ade80", "#818cf8"];

const POWERUP_DROP_CHANCE = 0.18;
const POWERUP_FALL_SPEED = 2.4;
const POWERUP_SIZE = 28;
const WIDEN_DURATION_MS = 8000;
const WIDEN_MULTIPLIER = 1.6;
const MULTIBALL_DURATION_MS = 10000;

const POWERUP_DEFS: Record<PowerUpType, { color: string; borderColor: string; emoji: string }> = {
  WIDEN: { color: "#22c55e", borderColor: "#15803d", emoji: "↔️" },
  PIERCE: { color: "#38bdf8", borderColor: "#0369a1", emoji: "⚡" },
  LIFE: { color: "#f472b6", borderColor: "#be185d", emoji: "❤️" },
  MULTI: { color: "#facc15", borderColor: "#a16207", emoji: "⚽" },
};

const PALETTE = {
  light: {
    bg: "#C4EDFF",
    boardBg: "#eef2ff",
    boardBorder: "#818cf8",
    text: "#1e1b4b",
    textMuted: "#6d28d9",
    title: "#4f46e5",
    titleAccent: "#f97316",
    paddle: "#4f46e5",
    paddleBorder: "#3730a3",
    ball: "#f59e0b",
    ballGlow: "rgba(245,158,11,0.55)",
    statCardBg: "#ffffff",
    statCardBorder: "#c7d2fe",
    livesGood: "#16a34a",
    livesBad: "#dc2626",
    gameOverBg: "rgba(248,250,252,0.94)",
    gameOverBorder: "#dc2626",
    resetButton: "#4f46e5",
  },
  dark: {
    bg: "#0a0e1f",
    boardBg: "#141a34",
    boardBorder: "#2e3a6b",
    text: "#e2e8f0",
    textMuted: "#a78bfa",
    title: "#38bdf8",
    titleAccent: "#f472b6",
    paddle: "#22d3ee",
    paddleBorder: "#0891b2",
    ball: "#facc15",
    ballGlow: "rgba(250,204,21,0.6)",
    statCardBg: "#141a34",
    statCardBorder: "#2e3a6b",
    livesGood: "#4ade80",
    livesBad: "#f87171",
    gameOverBg: "rgba(10,14,31,0.92)",
    gameOverBorder: "#f87171",
    resetButton: "#38bdf8",
  },
};

type Colors = typeof PALETTE.light;

function shadeColor(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.round(r * factor)));
  g = Math.max(0, Math.min(255, Math.round(g * factor)));
  b = Math.max(0, Math.min(255, Math.round(b * factor)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function BrickView({ brick }: { brick: Brick }) {
  if (brick.shape === "diamond") {
    const size = Math.min(brick.width, brick.height) * 0.92;
    return (
      <View
        style={{
          position: "absolute",
          left: brick.x,
          top: brick.y,
          width: brick.width,
          height: brick.height,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={[
            styles.brickDiamondInner,
            {
              width: size,
              height: size,
              backgroundColor: brick.color,
              borderColor: brick.borderColor,
              transform: [{ rotate: "45deg" }],
            },
          ]}
        >
          <View style={styles.brickHighlight} />
          <View style={styles.brickShadow} />
        </View>
      </View>
    );
  }

  const borderRadius = brick.shape === "round" || brick.shape === "pill" ? brick.height / 2 : 5;

  return (
    <View
      style={[
        styles.brick,
        {
          left: brick.x,
          top: brick.y,
          width: brick.width,
          height: brick.height,
          borderRadius,
          backgroundColor: brick.color,
          borderColor: brick.borderColor,
        },
      ]}
    >
      <View style={styles.brickHighlight} />
      <View style={styles.brickShadow} />
    </View>
  );
}

function PowerUpView({ powerUp }: { powerUp: PowerUp }) {
  const def = POWERUP_DEFS[powerUp.type];
  return (
    <View
      style={[
        styles.powerUp,
        {
          left: powerUp.x,
          top: powerUp.y,
          width: powerUp.size,
          height: powerUp.size,
          backgroundColor: def.color,
          borderColor: def.borderColor,
        },
      ]}
    >
      <Text style={styles.powerUpLabel}>{def.emoji}</Text>
    </View>
  );
}

function BallView({ ball, colors, variant }: { ball: Ball; colors: Colors; variant: "main" | "extra" }) {
  const pierceActive = (ball.pierceCharges ?? 0) > 0;
  return (
    <View
      style={[
        styles.ball,
        {
          left: ball.x,
          top: ball.y,
          width: ball.size,
          height: ball.size,
          backgroundColor: colors.ball,
          shadowColor: colors.ballGlow,
          opacity: variant === "extra" ? 0.85 : 1,
        },
        pierceActive ? { borderWidth: 2, borderColor: "#38bdf8" } : null,
      ]}
    />
  );
}

export default function BrickBreaker({
  onScoreChange = () => {},
  onGameEnd = () => {},
  gameState = "playing",
}: BrickBreakerProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { setTrack } = useMusic();
  const isDark = theme === "dark";

  useFocusEffect(
    useCallback(() => {
      setTrack("Main");
    }, [setTrack])
  );

  const colors: Colors = isDark ? PALETTE.dark : PALETTE.light;
  const rowColors = isDark ? BRICK_ROW_COLORS_DARK : BRICK_ROW_COLORS_LIGHT;
  const { width, height } = useWindowDimensions();

  const getBoardDimensions = () => {
    const boardWidth = Math.min(width - 40, 440);
    // Use flexible percentage of height to prevent controls overflow
    const boardHeight = Math.max(300, Math.min(height * 0.58, 600));
    return { boardWidth, boardHeight };
  };

  const { boardWidth, boardHeight } = getBoardDimensions();

  const PADDLE_WIDTH = Math.max(60, boardWidth * 0.22);
  const PADDLE_HEIGHT = 14;
  const BALL_SIZE = 11;
  const BRICK_ROWS = 5;
  const BRICK_COLS = 7;
  const BRICK_GAP = 6;
  const BRICK_TOP_OFFSET = 40;
  const BRICK_HEIGHT = 18;
  const BRICK_WIDTH = (boardWidth - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS;

  const buildBricks = useCallback(
    (level: number): Brick[] => {
      const patternType = (level - 1) % 4;
      const bricks: Brick[] = [];
      let id = 0;

      if (patternType === 0) {
        for (let row = 0; row < BRICK_ROWS; row++) {
          const color = rowColors[row % rowColors.length];
          for (let col = 0; col < BRICK_COLS; col++) {
            bricks.push({
              id: id++,
              x: BRICK_GAP + col * (BRICK_WIDTH + BRICK_GAP),
              y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_GAP),
              width: BRICK_WIDTH,
              height: BRICK_HEIGHT,
              color,
              borderColor: shadeColor(color, 0.65),
              points: (BRICK_ROWS - row) * 10,
              alive: true,
              shape: "rect",
            });
          }
        }
      } else if (patternType === 1) {
        for (let row = 0; row < BRICK_ROWS; row++) {
          const color = rowColors[row % rowColors.length];
          for (let col = 0; col < BRICK_COLS; col++) {
            if ((row + col) % 2 === 1) continue;
            bricks.push({
              id: id++,
              x: BRICK_GAP + col * (BRICK_WIDTH + BRICK_GAP),
              y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_GAP),
              width: BRICK_WIDTH,
              height: BRICK_HEIGHT,
              color,
              borderColor: shadeColor(color, 0.65),
              points: (BRICK_ROWS - row) * 15,
              alive: true,
              shape: "round",
            });
          }
        }
      } else if (patternType === 2) {
        const maxIndent = Math.floor((BRICK_COLS - 1) / 2);
        for (let row = 0; row < BRICK_ROWS; row++) {
          const indent = Math.min(row, maxIndent);
          const color = rowColors[row % rowColors.length];
          for (let col = indent; col < BRICK_COLS - indent; col++) {
            bricks.push({
              id: id++,
              x: BRICK_GAP + col * (BRICK_WIDTH + BRICK_GAP),
              y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_GAP),
              width: BRICK_WIDTH,
              height: BRICK_HEIGHT,
              color,
              borderColor: shadeColor(color, 0.65),
              points: (BRICK_ROWS - row) * 12,
              alive: true,
              shape: "diamond",
            });
          }
        }
      } else {
        const rows = 4;
        for (let row = 0; row < rows; row++) {
          const color = rowColors[row % rowColors.length];
          for (let col = 0; col < BRICK_COLS; col += 2) {
            const spanTwo = col + 1 < BRICK_COLS;
            const bWidth = spanTwo ? BRICK_WIDTH * 2 + BRICK_GAP : BRICK_WIDTH;
            bricks.push({
              id: id++,
              x: BRICK_GAP + col * (BRICK_WIDTH + BRICK_GAP),
              y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_GAP),
              width: bWidth,
              height: BRICK_HEIGHT,
              color,
              borderColor: shadeColor(color, 0.65),
              points: (rows - row) * 20,
              alive: true,
              shape: "pill",
            });
          }
        }
      }
      return bricks;
    },
    [BRICK_WIDTH, rowColors]
  );

  const makeInitialPaddle = useCallback((): Paddle => ({
    x: boardWidth / 2 - PADDLE_WIDTH / 2,
    y: boardHeight - PADDLE_HEIGHT - 16,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  }), [boardWidth, boardHeight, PADDLE_WIDTH, PADDLE_HEIGHT]);

  const makeInitialBall = useCallback((paddle: Paddle, speedMultiplier = 1): Ball => ({
    id: 0,
    x: paddle.x + paddle.width / 2 - BALL_SIZE / 2,
    y: paddle.y - BALL_SIZE - 2,
    vx: BASE_BALL_SPEED * speedMultiplier * (Math.random() < 0.5 ? -1 : 1) * 0.6,
    vy: -BASE_BALL_SPEED * speedMultiplier,
    size: BALL_SIZE,
  }), [BALL_SIZE]);

  const powerUpIdRef = useRef(0);
  const extraBallIdRef = useRef(1);

  const dataRef = useRef({
    bricks: buildBricks(1),
    paddle: makeInitialPaddle(),
    ball: makeInitialBall(makeInitialPaddle()),
    extraBalls: [] as Ball[],
    powerUps: [] as PowerUp[],
    effects: { widenUntil: null } as EffectState,
    score: 0,
    level: 1,
    lives: 3,
    gameOver: false,
    ballLaunched: false,
    touchTargetX: null as number | null,
    dragStartPaddleX: 0,
    aPressed: false,
    dPressed: false,
  });

  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    bricks: dataRef.current.bricks,
    ball: dataRef.current.ball,
    extraBalls: [],
    paddle: dataRef.current.paddle,
    powerUps: [],
    score: 0,
    level: 1,
    lives: 3,
    gameOver: false,
    levelClearFlash: false,
  });

  const boardFade = useRef(new Animated.Value(0)).current;
  const hitFlash = useRef(new Animated.Value(0)).current;
  const livesShake = useRef(new Animated.Value(0)).current;
  const retryScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(boardFade, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const triggerHitFeedback = useCallback(() => {
    hitFlash.setValue(0.3);
    Animated.timing(hitFlash, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    livesShake.setValue(0);
    Animated.sequence([
      Animated.timing(livesShake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(livesShake, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(livesShake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [hitFlash, livesShake]);

  // WASD / Keyboard controls for Web
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a" || key === "arrowleft") dataRef.current.aPressed = true;
      if (key === "d" || key === "arrowright") dataRef.current.dPressed = true;
      if (key === " " && !dataRef.current.ballLaunched) dataRef.current.ballLaunched = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a" || key === "arrowleft") dataRef.current.aPressed = false;
      if (key === "d" || key === "arrowright") dataRef.current.dPressed = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const data = dataRef.current;
    data.paddle = makeInitialPaddle();
    data.bricks = buildBricks(data.level);
    data.ball = makeInitialBall(data.paddle, 1 + (data.level - 1) * 0.12);
    data.ballLaunched = false;
    setSnapshot(prev => ({ ...prev, paddle: { ...data.paddle }, ball: { ...data.ball } }));
  }, [boardWidth, boardHeight, makeInitialPaddle, makeInitialBall, buildBricks]);

  const resetGame = () => {
    const data = dataRef.current;
    data.paddle = makeInitialPaddle();
    data.bricks = buildBricks(1);
    data.ball = makeInitialBall(data.paddle, 1);
    data.extraBalls = [];
    data.powerUps = [];
    data.effects = { widenUntil: null };
    data.score = 0;
    data.level = 1;
    data.lives = 3;
    data.gameOver = false;
    data.ballLaunched = false;

    setSnapshot({
      bricks: data.bricks,
      ball: { ...data.ball },
      extraBalls: [],
      paddle: { ...data.paddle },
      powerUps: [],
      score: 0,
      level: 1,
      lives: 3,
      gameOver: false,
      levelClearFlash: false,
    });
    boardFade.setValue(0.6);
    Animated.timing(boardFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  };

  const checkColl = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  const applyPowerUp = useCallback((type: PowerUpType) => {
    const data = dataRef.current;
    const now = Date.now();
    switch (type) {
      case "WIDEN":
        const widenW = Math.min(boardWidth * 0.9, PADDLE_WIDTH * WIDEN_MULTIPLIER);
        const centerX = data.paddle.x + data.paddle.width / 2;
        data.paddle.width = widenW;
        data.paddle.x = Math.max(0, Math.min(boardWidth - widenW, centerX - widenW / 2));
        data.effects.widenUntil = now + WIDEN_DURATION_MS;
        break;
      case "PIERCE":
        data.ball.pierceCharges = (data.ball.pierceCharges ?? 0) + 1;
        break;
      case "LIFE":
        data.lives += 1;
        break;
      case "MULTI":
        const sm = 1 + (data.level - 1) * 0.12;
        data.extraBalls.push({
          id: extraBallIdRef.current++,
          x: data.paddle.x + data.paddle.width / 2 - BALL_SIZE / 2,
          y: data.paddle.y - BALL_SIZE - 2,
          vx: BASE_BALL_SPEED * sm * (Math.random() - 0.5),
          vy: -BASE_BALL_SPEED * sm,
          size: BALL_SIZE,
          expiresAt: now + MULTIBALL_DURATION_MS,
        });
        break;
    }
  }, [boardWidth, PADDLE_WIDTH, BALL_SIZE]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const id = setInterval(() => {
      const data = dataRef.current;
      if (data.gameOver) return;
      const now = Date.now();

      if (data.effects.widenUntil && now > data.effects.widenUntil) {
        const cx = data.paddle.x + data.paddle.width / 2;
        data.paddle.width = PADDLE_WIDTH;
        data.paddle.x = Math.max(0, Math.min(boardWidth - PADDLE_WIDTH, cx - PADDLE_WIDTH / 2));
        data.effects.widenUntil = null;
      }

      // Keyboard movement
      if (data.aPressed) data.paddle = { ...data.paddle, x: Math.max(0, data.paddle.x - 10) };
      if (data.dPressed) data.paddle = { ...data.paddle, x: Math.min(boardWidth - data.paddle.width, data.paddle.x + 10) };

      if (data.touchTargetX !== null) {
        const ct = Math.max(0, Math.min(boardWidth - data.paddle.width, data.touchTargetX));
        data.paddle = { ...data.paddle, x: data.paddle.x + (ct - data.paddle.x) * PADDLE_SMOOTHING };
      }

      const stepBall = (b: Ball): Ball | null => {
        let { x, y, vx, vy, size, pierceCharges = 0 } = b;
        x += vx; y += vy;
        if (x <= 0 || x >= boardWidth - size) vx = (x <= 0 ? 1 : -1) * Math.abs(vx);
        if (y <= 0) vy = Math.abs(vy);
        if (vy > 0 && checkColl(x, y, size, size, data.paddle.x, data.paddle.y, data.paddle.width, data.paddle.height)) {
          const hp = (x + size / 2 - data.paddle.x) / data.paddle.width;
          const sp = Math.sqrt(vx * vx + vy * vy);
          vx = sp * Math.sin((hp - 0.5) * 1.2);
          vy = -Math.abs(sp * Math.cos((hp - 0.5) * 1.2));
        }
        for (const brick of data.bricks) {
          if (!brick.alive) continue;
          if (checkColl(x, y, size, size, brick.x, brick.y, brick.width, brick.height)) {
            brick.alive = false; data.score += brick.points;
            if (Math.random() < POWERUP_DROP_CHANCE) {
              const types = Object.keys(POWERUP_DEFS) as PowerUpType[];
              data.powerUps.push({ id: powerUpIdRef.current++, type: types[Math.floor(Math.random() * types.length)], x: brick.x, y: brick.y, size: POWERUP_SIZE, vy: POWERUP_FALL_SPEED });
            }
            if (pierceCharges > 0) pierceCharges--; else vy = -vy;
            break;
          }
        }
        return y > boardHeight ? null : { ...b, x, y, vx, vy, pierceCharges };
      };

      if (!data.ballLaunched) {
        data.ball.x = data.paddle.x + data.paddle.width / 2 - data.ball.size / 2;
        data.ball.y = data.paddle.y - data.ball.size - 2;
      } else {
        const res = stepBall(data.ball);
        if (!res) {
          data.lives--; triggerHitFeedback();
          if (data.lives <= 0) { data.gameOver = true; onGameEndRef.current(data.score); }
          else { data.ball = makeInitialBall(data.paddle, 1 + (data.level - 1) * 0.12); data.ballLaunched = false; }
        } else data.ball = res;
      }

      data.extraBalls = data.extraBalls.map(stepBall).filter(b => b !== null) as Ball[];

      if (!data.bricks.some(b => b.alive)) {
        data.level++; data.bricks = buildBricks(data.level);
        data.ball = makeInitialBall(data.paddle, 1 + (data.level - 1) * 0.12);
        data.ballLaunched = false;
      }

      data.powerUps = data.powerUps.map(pu => ({ ...pu, y: pu.y + pu.vy }))
        .filter(pu => {
          if (checkColl(pu.x, pu.y, pu.size, pu.size, data.paddle.x, data.paddle.y, data.paddle.width, data.paddle.height)) { applyPowerUp(pu.type); return false; }
          return pu.y <= boardHeight;
        });

      setSnapshot({ ...data, levelClearFlash: false });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameState, boardWidth, boardHeight, triggerHitFeedback, buildBricks, applyPowerUp, PADDLE_WIDTH, makeInitialBall]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !dataRef.current.gameOver && gameState === "playing",
      onMoveShouldSetPanResponder: () => !dataRef.current.gameOver && gameState === "playing",
      onPanResponderGrant: () => {
        const data = dataRef.current;
        data.dragStartPaddleX = data.paddle.x;
        data.touchTargetX = data.paddle.x;
        if (!data.ballLaunched) data.ballLaunched = true;
      },
      onPanResponderMove: (_, gs) => { dataRef.current.touchTargetX = dataRef.current.dragStartPaddleX + gs.dx; },
      onPanResponderRelease: () => { dataRef.current.touchTargetX = null; },
    })
  ).current;

  const { bricks, ball, extraBalls, paddle, powerUps, score, level, lives, gameOver } = snapshot;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.title }]}>Brick Breaker</Text>
        <MuteButton />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.statCardBg, borderColor: colors.statCardBorder }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>SCORE</Text>
          <Text style={[styles.statValue, { color: colors.title }]}>{score}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.statCardBg, borderColor: colors.statCardBorder }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>LEVEL</Text>
          <Text style={[styles.statValue, { color: colors.titleAccent }]}>{level}</Text>
        </View>
        <Animated.View style={[styles.statCard, { backgroundColor: colors.statCardBg, borderColor: colors.statCardBorder, transform: [{ translateX: livesShake }] }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIVES</Text>
          <Text style={[styles.statValue, { color: lives > 1 ? colors.livesGood : colors.livesBad }]}>{"●".repeat(Math.max(lives, 0))}</Text>
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: boardFade, transform: [{ scale: boardFade.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
        <View {...panResponder.panHandlers} style={[styles.gameBoard, { backgroundColor: colors.boardBg, borderColor: colors.boardBorder, width: boardWidth, height: boardHeight }]}>
          {bricks.filter(b => b.alive).map(b => <BrickView key={b.id} brick={b} />)}
          {powerUps.map(pu => <PowerUpView key={pu.id} powerUp={pu} />)}
          <View style={[styles.paddle, { left: paddle.x, top: paddle.y, width: paddle.width, height: paddle.height, backgroundColor: colors.paddle, borderColor: colors.paddleBorder }]} />
          <BallView ball={ball} colors={colors} variant="main" />
          {extraBalls.map(eb => <BallView key={eb.id} ball={eb} colors={colors} variant="extra" />)}
          <Animated.View pointerEvents="none" style={[styles.hitFlash, { backgroundColor: colors.livesBad, opacity: hitFlash }]} />
          {gameOver && (
            <View style={styles.gameOverOverlay}>
              <View style={[styles.gameOverContainer, { backgroundColor: colors.gameOverBg, borderColor: colors.gameOverBorder }]}>
                <Text style={[styles.gameOverTitle, { color: colors.livesBad }]}>GAME OVER</Text>
                <Text style={[styles.gameOverScore, { color: colors.text }]}>Score: {score}</Text>
                <TouchableOpacity onPress={resetGame} activeOpacity={0.8}>
                  <Animated.View style={[styles.retryButton, { backgroundColor: colors.resetButton, transform: [{ scale: retryScale }] }]}>
                    <Text style={styles.retryButtonText}>RETRY</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
      <Text style={[styles.controlsInfo, { color: colors.textMuted }]}>A/D or Drag to move · Launch on touch</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, alignItems: "center", justifyContent: 'center' },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 10, marginBottom: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(128,128,128,0.15)" },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { borderRadius: 12, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10, alignItems: "center", minWidth: 68 },
  statLabel: { fontSize: 9, fontWeight: "700" },
  statValue: { fontSize: 14, fontWeight: "800" },
  gameBoard: { borderRadius: 16, position: "relative", borderWidth: 1.5, overflow: "hidden" },
  brick: { position: "absolute", borderRadius: 4, borderWidth: 1 },
  brickDiamondInner: { borderRadius: 2, borderWidth: 1 },
  brickHighlight: { position: "absolute", top: 0, left: 0, right: 0, height: "40%", backgroundColor: "rgba(255,255,255,0.3)" },
  brickShadow: { position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", backgroundColor: "rgba(0,0,0,0.1)" },
  powerUp: { position: "absolute", borderRadius: 8, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  powerUpLabel: { fontSize: 14 },
  paddle: { position: "absolute", borderRadius: 6, borderWidth: 1 },
  ball: { position: "absolute", borderRadius: 999 },
  hitFlash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  gameOverOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", zIndex: 1000 },
  gameOverContainer: { padding: 30, borderRadius: 15, borderWidth: 3, alignItems: "center" },
  gameOverTitle: { fontSize: 24, fontWeight: "800", marginBottom: 10 },
  gameOverScore: { fontSize: 16, marginBottom: 20 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryButtonText: { color: '#fff', fontWeight: "800" },
  controlsInfo: { fontSize: 11, textAlign: "center", marginTop: 10, fontWeight: "600" },
});
