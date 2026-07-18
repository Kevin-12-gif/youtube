
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
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

interface CosmicStrikerProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: "playing" | "paused" | "ended";
}

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  id: number;
}

interface Enemy extends GameObject {
  type: "basic" | "fast" | "heavy" | "tank";
  health: number;
  maxHealth: number;
  speed: number;
  lastShot: number;
}

interface Bullet extends GameObject {
  speed: number;
  isPlayerBullet: boolean;
  vx?: number;
}

interface Spark extends GameObject {
  id: number;
  color: string;
}

interface Powerup extends GameObject {
  type: "rapidfire" | "spread" | "shield" | "repair";
}

interface Player extends GameObject {
  health: number;
  maxHealth: number;
  velocityX: number;
  shieldActive: boolean;
  rapidFireUntil: number;
  spreadUntil: number;
}

interface GameSnapshot {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  sparks: Spark[];
  powerups: Powerup[];
  score: number;
  level: number;
  gameOver: boolean;
}

const TICK_MS = 33; // fixed timestep, ~30fps
const FIRE_COOLDOWN_MS = 220;
const SPARK_LIFETIME_MS = 260;
const HEAVY_ENEMY_SHOT_COOLDOWN_MS = 1400;
const RAPIDFIRE_DURATION_MS = 6000;
const SPREAD_DURATION_MS = 8000;
const POWERUP_FALL_SPEED = 2.6;

const applyPowerupEffect = (
  data: {
    player: Player;
  },
  type: Powerup["type"],
  now: number,
) => {
  switch (type) {
    case "rapidfire":
      data.player.rapidFireUntil = now + RAPIDFIRE_DURATION_MS;
      break;
    case "spread":
      data.player.spreadUntil = now + SPREAD_DURATION_MS;
      break;
    case "shield":
      data.player.shieldActive = true;
      break;
    case "repair":
      data.player.health = Math.min(data.player.maxHealth, data.player.health + 1);
      break;
  }
};

export function CosmicStriker({
  onScoreChange = () => {},
  onGameEnd = () => {},
  gameState = "playing",
}: CosmicStrikerProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { setTrack } = useMusic();
  const isDark = theme === "dark";

  useFocusEffect(
    useCallback(() => {
      setTrack("CosmicStriker");
    }, [setTrack])
  );

  const { width, height } = useWindowDimensions();

  const getGameDimensions = () => {
    const gWidth = width - 40;
    const titleHeight = 40;
    const scoreHeight = 30;
    const healthHeight = 30;
    const controlsHeight = 160;
    const padding = 60;

    const availableHeight =
      height -
      titleHeight -
      scoreHeight -
      healthHeight -
      controlsHeight -
      padding;
    const gHeight = Math.max(400, Math.min(availableHeight, 600));

    return { gameWidth: gWidth, gameHeight: gHeight };
  };

  const { gameWidth, gameHeight } = getGameDimensions();

  // Ship enlarged from 40x40 -> 52x52
  const PLAYER_SIZE = 52;

  const initialPlayer: Player = {
    x: gameWidth / 2 - PLAYER_SIZE / 2,
    y: gameHeight - PLAYER_SIZE - 20,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    id: 0,
    health: 3,
    maxHealth: 3,
    velocityX: 0,
    shieldActive: false,
    rapidFireUntil: 0,
    spreadUntil: 0,
  };

  // ---- Fast-changing game data lives in a ref (the "model"). ----
  const dataRef = useRef({
    player: { ...initialPlayer },
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    sparks: [] as Spark[],
    powerups: [] as Powerup[],
    lastShot: 0,
    leftPressed: false,
    rightPressed: false,
    firePressed: false,
    score: 0,
    level: 1,
    gameOver: false,
  });

  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    player: initialPlayer,
    enemies: [],
    bullets: [],
    sparks: [],
    powerups: [],
    score: 0,
    level: 1,
    gameOver: false,
  });

  const [leftPressedUI, setLeftPressedUI] = useState(false);
  const [rightPressedUI, setRightPressedUI] = useState(false);
  const [firePressedUI, setFirePressedUI] = useState(false);

  const nextId = useRef(1);

  const onScoreChangeRef = useRef(onScoreChange);
  const onGameEndRef = useRef(onGameEnd);
  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  // ---- animation refs ----
  const boardFade = useRef(new Animated.Value(0)).current;
  const hitFlash = useRef(new Animated.Value(0)).current;
  const healthShake = useRef(new Animated.Value(0)).current;
  const leftScale = useRef(new Animated.Value(1)).current;
  const rightScale = useRef(new Animated.Value(1)).current;
  const fireScale = useRef(new Animated.Value(1)).current;
  const retryScale = useRef(new Animated.Value(1)).current;

  const getThemeColors = () => {
    if (isDark) {
      return {
        background: "#0a0e1f",
        gameBackground: "#141a34",
        text: "#e2e8f0",
        textMuted: "#8b93b8",
        title: "#38bdf8",
        titleAccent: "#f472b6",
        player: "#22d3ee",
        playerBorder: "#0891b2",
        playerAccent: "#ffffff",
        enemyBasic: "#f472b6",
        enemyFast: "#fbbf24",
        enemyHeavy: "#a78bfa",
        enemyTank: "#60a5fa",
        bullet: "#22d3ee",
        enemyBullet: "#fb7185",
        border: "#2e3a6b",
        buttonBackground: "#141a34",
        buttonActiveBackground: "#2b3568",
        buttonBorder: "#3b4a8f",
        buttonText: "#e2e8f0",
        fireButtonBackground: "#7c2d12",
        fireButtonActiveBackground: "#9a3412",
        fireButtonBorder: "#fb923c",
        fireButtonText: "#fdba74",
        controlsBackground: "rgba(255,255,255,0.03)",
        resetButton: "#38bdf8",
        healthGood: "#4ade80",
        healthWarn: "#facc15",
        healthBad: "#f87171",
        healthBarBg: "#241934",
        stars: "rgba(226,232,240,0.35)",
        gameOverBg: "rgba(10,14,31,0.92)",
        gameOverBorder: "#f87171",
      };
    } else {
      return {
        background: "#C4EDFF",
        gameBackground: "#eef2ff",
        text: "#1e293b",
        textMuted: "#64748b",
        title: "#4f46e5",
        titleAccent: "#f97316",
        player: "#0ea5e9",
        playerBorder: "#0369a1",
        playerAccent: "#ffffff",
        enemyBasic: "#e11d48",
        enemyFast: "#d97706",
        enemyHeavy: "#7c3aed",
        enemyTank: "#0891b2",
        bullet: "#2563eb",
        enemyBullet: "#dc2626",
        border: "#c7d2fe",
        buttonBackground: "#ffffff",
        buttonActiveBackground: "#e0e7ff",
        buttonBorder: "#c7d2fe",
        buttonText: "#4338ca",
        fireButtonBackground: "#fff7ed",
        fireButtonActiveBackground: "#fed7aa",
        fireButtonBorder: "#f97316",
        fireButtonText: "#c2410c",
        controlsBackground: "rgba(79,70,229,0.04)",
        resetButton: "#4f46e5",
        healthGood: "#16a34a",
        healthWarn: "#d97706",
        healthBad: "#dc2626",
        healthBarBg: "#fee2e2",
        stars: "rgba(79,70,229,0.15)",
        gameOverBg: "rgba(248,250,252,0.94)",
        gameOverBorder: "#dc2626",
      };
    }
  };

  const themeColors = getThemeColors();

  const stars = useRef(
    Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() < 0.2 ? 3 : 1.5,
    })),
  ).current;

  const getEnemySpeed = (level: number) => {
    const levelSpeedMap: Record<number, number> = {
      1: 1.2,
      2: 1.45,
      3: 1.7,
      4: 2.0,
      5: 2.35,
      6: 2.75,
      7: 3.2,
    };
    return levelSpeedMap[Math.min(level, 7)] ?? 3.2;
  };

  const getSpawnRate = (level: number) => Math.max(550, 2800 - level * 220);
  const getPowerupSpawnRate = (level: number) => Math.max(4200, 10000 - level * 650);

  useEffect(() => {
    Animated.timing(boardFade, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const triggerHitFeedback = useCallback(() => {
    hitFlash.setValue(0.35);
    Animated.timing(hitFlash, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    healthShake.setValue(0);
    Animated.sequence([
      Animated.timing(healthShake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(healthShake, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(healthShake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [hitFlash, healthShake]);

  const applyDamage = useCallback(() => {
    const data = dataRef.current;
    if (data.player.shieldActive) {
      data.player.shieldActive = false;
      return;
    }
    data.player.health = Math.max(0, data.player.health - 1);
    triggerHitFeedback();
    if (data.player.health <= 0 && !data.gameOver) {
      data.gameOver = true;
      onGameEndRef.current(data.score);
    }
  }, [triggerHitFeedback]);

  const fireBullets = useCallback((now: number) => {
    const data = dataRef.current;
    const baseX = data.player.x + data.player.width / 2 - 2;
    const y = data.player.y;
    if (data.player.spreadUntil > now) {
      data.bullets.push(
        { x: baseX, y, width: 4, height: 12, id: nextId.current++, speed: 13, isPlayerBullet: true, vx: -3.2 },
        { x: baseX, y, width: 4, height: 12, id: nextId.current++, speed: 13, isPlayerBullet: true, vx: 0 },
        { x: baseX, y, width: 4, height: 12, id: nextId.current++, speed: 13, isPlayerBullet: true, vx: 3.2 },
      );
    } else {
      data.bullets.push({ x: baseX, y, width: 4, height: 12, id: nextId.current++, speed: 13, isPlayerBullet: true, vx: 0 });
    }
  }, []);

  const checkCollision = (obj1: GameObject, obj2: GameObject) =>
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y;

  const spawnEnemy = () => {
    const data = dataRef.current;
    const level = data.level;

    const enemyTypes: Array<{ type: Enemy["type"]; health: number; speed: number; size: number }> = [
      { type: "basic", health: 1, speed: getEnemySpeed(level), size: 30 },
      { type: "fast", health: 1, speed: getEnemySpeed(level) * 2.2, size: 26 },
      { type: "heavy", health: 3, speed: getEnemySpeed(level) * 0.5, size: 34 },
      { type: "tank", health: 6, speed: getEnemySpeed(level) * 0.32, size: 40 },
    ];

    const weights =
      level < 3
        ? [0.9, 0.1, 0, 0]
        : level < 5
          ? [0.65, 0.22, 0.13, 0]
          : level < 8
            ? [0.5, 0.22, 0.18, 0.1]
            : [0.38, 0.22, 0.24, 0.16];

    const random = Math.random();
    let selected = enemyTypes[0];
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        selected = enemyTypes[i];
        break;
      }
    }

    data.enemies.push({
      x: Math.random() * (gameWidth - selected.size),
      y: -selected.size,
      width: selected.size,
      height: selected.size,
      id: nextId.current++,
      type: selected.type,
      health: selected.health,
      maxHealth: selected.health,
      speed: selected.speed,
      lastShot: Date.now(),
    });
  };

  const spawnPowerup = () => {
    const data = dataRef.current;
    const types: Powerup["type"][] = ["rapidfire", "spread", "shield", "repair"];
    const type = types[Math.floor(Math.random() * types.length)];
    data.powerups.push({
      x: Math.random() * (gameWidth - 28),
      y: -28,
      width: 28,
      height: 28,
      id: nextId.current++,
      type,
    });
  };

  const resetGame = () => {
    const data = dataRef.current;
    data.player = {
      ...initialPlayer,
      x: gameWidth / 2 - PLAYER_SIZE / 2,
      y: gameHeight - PLAYER_SIZE - 20,
    };
    data.enemies = [];
    data.bullets = [];
    data.sparks = [];
    data.powerups = [];
    data.lastShot = 0;
    data.score = 0;
    data.level = 1;
    data.gameOver = false;

    setSnapshot({
      player: { ...data.player },
      enemies: [],
      bullets: [],
      sparks: [],
      powerups: [],
      score: 0,
      level: 1,
      gameOver: false,
    });

    boardFade.setValue(0.6);
    Animated.timing(boardFade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    dataRef.current.player.x = gameWidth / 2 - PLAYER_SIZE / 2;
    dataRef.current.player.y = gameHeight - PLAYER_SIZE - 20;
  }, [gameWidth, gameHeight]);

  useEffect(() => {
    if (gameState !== "playing" || snapshot.gameOver) return;
    const id = setInterval(spawnEnemy, getSpawnRate(dataRef.current.level));
    return () => clearInterval(id);
  }, [gameState, snapshot.level, snapshot.gameOver, gameWidth]);

  useEffect(() => {
    if (gameState !== "playing" || snapshot.gameOver) return;
    const id = setInterval(spawnPowerup, getPowerupSpawnRate(dataRef.current.level));
    return () => clearInterval(id);
  }, [gameState, snapshot.level, snapshot.gameOver, gameWidth]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const id = setInterval(() => {
      const data = dataRef.current;
      if (data.gameOver) return;

      const now = Date.now();

      // player movement (sliding physics)
      let vx = data.player.velocityX * 0.82;
      if (data.leftPressed) vx -= 2.2;
      if (data.rightPressed) vx += 2.2;
      vx = Math.max(-12, Math.min(12, vx));
      data.player.x = Math.max(0, Math.min(gameWidth - data.player.width, data.player.x + vx));
      data.player.velocityX = vx;

      const cooldown = data.player.rapidFireUntil > now ? FIRE_COOLDOWN_MS / 2 : FIRE_COOLDOWN_MS;
      if (data.firePressed && now - data.lastShot >= cooldown) {
        data.lastShot = now;
        fireBullets(now);
      }

      data.enemies.forEach((enemy) => {
        if ((enemy.type === "heavy" || enemy.type === "tank") && now - enemy.lastShot > HEAVY_ENEMY_SHOT_COOLDOWN_MS) {
          enemy.lastShot = now;
          data.bullets.push({
            x: enemy.x + enemy.width / 2 - 2,
            y: enemy.y + enemy.height,
            width: 4,
            height: 10,
            id: nextId.current++,
            speed: enemy.type === "tank" ? 5 : 6,
            isPlayerBullet: false,
          });
        }
      });

      data.bullets = data.bullets
        .map((b) => ({
          ...b,
          y: b.isPlayerBullet ? b.y - b.speed : b.y + b.speed,
          x: b.x + (b.vx || 0),
        }))
        .filter((b) => b.y > -20 && b.y < gameHeight + 20 && b.x > -20 && b.x < gameWidth + 20);

      data.sparks = data.sparks.filter((s) => now - s.id < SPARK_LIFETIME_MS);

      data.powerups = data.powerups
        .map((p) => ({ ...p, y: p.y + POWERUP_FALL_SPEED }))
        .filter((p) => {
          if (p.y > gameHeight) return false;
          if (checkCollision(p, data.player)) {
            applyPowerupEffect(data, p.type, now);
            return false;
          }
          return true;
        });

      const survivors: Enemy[] = [];
      for (const enemy of data.enemies) {
        const moved = { ...enemy, y: enemy.y + enemy.speed };
        if (moved.y > gameHeight) {
          applyDamage();
        } else {
          survivors.push(moved);
        }
      }
      data.enemies = survivors;

      const remainingBullets: Bullet[] = [];
      for (const bullet of data.bullets) {
        if (!bullet.isPlayerBullet) {
          remainingBullets.push(bullet);
          continue;
        }
        let hit = false;
        data.enemies = data.enemies
          .map((enemy) => {
            if (!hit && checkCollision(bullet, enemy)) {
              hit = true;
              const newHealth = enemy.health - 1;
              if (newHealth <= 0) {
                const points =
                  enemy.type === "basic" ? 10 : enemy.type === "fast" ? 15 : enemy.type === "heavy" ? 30 : 50;
                data.sparks.push({
                  id: now + Math.random(),
                  x: enemy.x,
                  y: enemy.y,
                  width: enemy.width,
                  height: enemy.height,
                  color: themeColors.titleAccent,
                });
                data.score += points;
                const newLevel = Math.floor(data.score / 200) + 1;
                if (newLevel > data.level) data.level = newLevel;
                return { ...enemy, health: 0 };
              }
              return { ...enemy, health: newHealth };
            }
            return enemy;
          })
          .filter((enemy) => enemy.health > 0);
        if (!hit) remainingBullets.push(bullet);
      }

      data.bullets = remainingBullets.filter((bullet) => {
        if (bullet.isPlayerBullet) return true;
        if (checkCollision(bullet, data.player)) {
          applyDamage();
          return false;
        }
        return true;
      });

      const enemiesAfterContact: Enemy[] = [];
      for (const enemy of data.enemies) {
        if (checkCollision(enemy, data.player)) {
          applyDamage();
        } else {
          enemiesAfterContact.push(enemy);
        }
      }
      data.enemies = enemiesAfterContact;

      setSnapshot({
        player: { ...data.player },
        enemies: data.enemies,
        bullets: data.bullets,
        sparks: data.sparks,
        powerups: data.powerups,
        score: data.score,
        level: data.level,
        gameOver: data.gameOver,
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [gameState, gameWidth, gameHeight, triggerHitFeedback, themeColors.titleAccent, applyDamage, fireBullets]);

  useEffect(() => {
    onScoreChangeRef.current(snapshot.score);
  }, [snapshot.score]);

  const pressIn = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 0.88, useNativeDriver: true, friction: 6 }).start();
  const pressOut = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 160 }).start();

  const handleTouchStart = (direction: "left" | "right" | "fire") => {
    if (snapshot.gameOver || gameState !== "playing") return;
    if (direction === "left") {
      dataRef.current.leftPressed = true;
      setLeftPressedUI(true);
      pressIn(leftScale);
    } else if (direction === "right") {
      dataRef.current.rightPressed = true;
      setRightPressedUI(true);
      pressIn(rightScale);
    } else {
      dataRef.current.firePressed = true;
      setFirePressedUI(true);
      pressIn(fireScale);
      const data = dataRef.current;
      const now = Date.now();
      const cooldown = data.player.rapidFireUntil > now ? FIRE_COOLDOWN_MS / 2 : FIRE_COOLDOWN_MS;
      if (now - data.lastShot >= cooldown) {
        data.lastShot = now;
        fireBullets(now);
      }
    }
  };

  const handleTouchEnd = (direction: "left" | "right" | "fire") => {
    if (direction === "left") {
      dataRef.current.leftPressed = false;
      setLeftPressedUI(false);
      pressOut(leftScale);
    } else if (direction === "right") {
      dataRef.current.rightPressed = false;
      setRightPressedUI(false);
      pressOut(rightScale);
    } else {
      dataRef.current.firePressed = false;
      setFirePressedUI(false);
      pressOut(fireScale);
    }
  };

  // Keyboard support for Web
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (snapshot.gameOver || gameState !== "playing") return;
      const key = e.key.toLowerCase();

      if (key === "a" || key === "arrowleft") {
        if (!dataRef.current.leftPressed) {
          dataRef.current.leftPressed = true;
          setLeftPressedUI(true);
          pressIn(leftScale);
        }
      } else if (key === "d" || key === "arrowright") {
        if (!dataRef.current.rightPressed) {
          dataRef.current.rightPressed = true;
          setRightPressedUI(true);
          pressIn(rightScale);
        }
      } else if (key === " " || key === "f") {
        if (!dataRef.current.firePressed) {
          dataRef.current.firePressed = true;
          setFirePressedUI(true);
          pressIn(fireScale);

          // immediate fire logic
          const data = dataRef.current;
          const now = Date.now();
          const cooldown = data.player.rapidFireUntil > now ? FIRE_COOLDOWN_MS / 2 : FIRE_COOLDOWN_MS;
          if (now - data.lastShot >= cooldown) {
            data.lastShot = now;
            fireBullets(now);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a" || key === "arrowleft") {
        dataRef.current.leftPressed = false;
        setLeftPressedUI(false);
        pressOut(leftScale);
      } else if (key === "d" || key === "arrowright") {
        dataRef.current.rightPressed = false;
        setRightPressedUI(false);
        pressOut(rightScale);
      } else if (key === " " || key === "f") {
        dataRef.current.firePressed = false;
        setFirePressedUI(false);
        pressOut(fireScale);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState, snapshot.gameOver, leftScale, rightScale, fireScale, fireBullets]);

  const getEnemyColor = (enemy: Enemy) => {
    switch (enemy.type) {
      case "basic":
        return themeColors.enemyBasic;
      case "fast":
        return themeColors.enemyFast;
      case "heavy":
        return themeColors.enemyHeavy;
      case "tank":
        return themeColors.enemyTank;
      default:
        return themeColors.enemyBasic;
    }
  };

  const getEnemyEmoji = (enemy: Enemy) => {
    switch (enemy.type) {
      case "basic":
        return "👾";
      case "fast":
        return "🐝";
      case "heavy":
        return "🛸";
      case "tank":
        return "🐙";
      default:
        return "👾";
    }
  };

  const getPowerupEmoji = (type: Powerup["type"]) => {
    switch (type) {
      case "rapidfire":
        return "⚡";
      case "spread":
        return "✳️";
      case "shield":
        return "🛡️";
      case "repair":
        return "❤️";
    }
  };

  const getPowerupColor = (type: Powerup["type"]) => {
    switch (type) {
      case "rapidfire":
        return "#facc15";
      case "spread":
        return "#38bdf8";
      case "shield":
        return "#4ade80";
      case "repair":
        return "#f472b6";
    }
  };

  const { player, enemies, bullets, sparks, powerups, score, level, gameOver } = snapshot;
  const healthPct = player.health / player.maxHealth;
  const healthColor =
    healthPct > 0.66
      ? themeColors.healthGood
      : healthPct > 0.33
        ? themeColors.healthWarn
        : themeColors.healthBad;

  const now = Date.now();
  const rapidFireActive = player.rapidFireUntil > now;
  const spreadActive = player.spreadUntil > now;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: themeColors.title }]}>COSMIC STRIKER</Text>
          <View style={[styles.titleDot, { backgroundColor: themeColors.titleAccent }]} />
        </View>
        <MuteButton />
      </View>

      <View style={styles.gameInfo}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: themeColors.gameBackground, borderColor: themeColors.border }]}>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>SCORE</Text>
            <Text style={[styles.statValue, { color: themeColors.title }]}>{score}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: themeColors.gameBackground, borderColor: themeColors.border }]}>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>LEVEL</Text>
            <Text style={[styles.statValue, { color: themeColors.titleAccent }]}>{level}</Text>
          </View>
        </View>

        <Animated.View style={[styles.healthBar, { transform: [{ translateX: healthShake }] }]}>
          <Text style={[styles.healthText, { color: themeColors.textMuted }]}>HULL</Text>
          <View style={[styles.healthBarContainer, { backgroundColor: themeColors.healthBarBg }]}>
            <View style={[styles.healthBarFill, { backgroundColor: healthColor, width: `${healthPct * 100}%` }]} />
          </View>
        </Animated.View>

        <View style={styles.powerupIndicatorRow}>
          <View
            style={[
              styles.powerupIndicator,
              { borderColor: themeColors.border, backgroundColor: themeColors.gameBackground, opacity: rapidFireActive ? 1 : 0.3 },
            ]}
          >
            <Text style={styles.powerupIndicatorEmoji}>⚡</Text>
          </View>
          <View
            style={[
              styles.powerupIndicator,
              { borderColor: themeColors.border, backgroundColor: themeColors.gameBackground, opacity: spreadActive ? 1 : 0.3 },
            ]}
          >
            <Text style={styles.powerupIndicatorEmoji}>✳️</Text>
          </View>
          <View
            style={[
              styles.powerupIndicator,
              { borderColor: themeColors.border, backgroundColor: themeColors.gameBackground, opacity: player.shieldActive ? 1 : 0.3 },
            ]}
          >
            <Text style={styles.powerupIndicatorEmoji}>🛡️</Text>
          </View>
        </View>
      </View>

      <Animated.View
        style={{
          opacity: boardFade,
          transform: [{ scale: boardFade.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
        }}
      >
        <View
          style={[
            styles.gameBoard,
            { backgroundColor: themeColors.gameBackground, borderColor: themeColors.border, width: gameWidth, height: gameHeight },
          ]}
        >
          {stars.map((s, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: s.x * gameWidth,
                top: s.y * gameHeight,
                width: s.size,
                height: s.size,
                borderRadius: s.size,
                backgroundColor: themeColors.stars,
              }}
            />
          ))}

          <View
            style={[
              styles.gameObject,
              {
                left: player.x,
                top: player.y,
                width: player.width,
                height: player.height,
              },
            ]}
          >
            {player.shieldActive && (
              <View
                style={[
                  styles.shieldRing,
                  { borderColor: themeColors.healthGood, width: player.width + 14, height: player.height + 14 },
                ]}
              />
            )}
            <Image source={require("../../../assets/images/spaceship.png")} style={styles.spaceshipImage} resizeMode="contain" />
          </View>

          {enemies.map((enemy) => {
            const color = getEnemyColor(enemy);
            return (
              <View key={enemy.id} style={[styles.gameObject, { left: enemy.x, top: enemy.y, width: enemy.width, height: enemy.height }]}>
                <Text style={[styles.enemyEmoji, { color, fontSize: enemy.width * 0.75, lineHeight: enemy.width * 0.75 }]}>
                  {getEnemyEmoji(enemy)}
                </Text>
                {enemy.maxHealth > 1 && (
                  <View style={styles.enemyHealthTrack}>
                    <View style={[styles.enemyHealthFill, { width: `${(enemy.health / enemy.maxHealth) * 100}%` }]} />
                  </View>
                )}
              </View>
            );
          })}

          {bullets.map((bullet) => (
            <View
              key={bullet.id}
              style={[
                styles.bullet,
                {
                  left: bullet.x,
                  top: bullet.y,
                  width: bullet.width,
                  height: bullet.height,
                  backgroundColor: bullet.isPlayerBullet ? themeColors.bullet : themeColors.enemyBullet,
                  shadowColor: bullet.isPlayerBullet ? themeColors.bullet : themeColors.enemyBullet,
                },
              ]}
            />
          ))}

          {sparks.map((spark) => (
            <View
              key={spark.id}
              style={[styles.spark, { left: spark.x, top: spark.y, width: spark.width, height: spark.height, borderColor: spark.color }]}
            />
          ))}

          {powerups.map((p) => (
            <View key={p.id} style={[styles.gameObject, { left: p.x, top: p.y, width: p.width, height: p.height }]}>
              <View style={[styles.powerupBadge, { backgroundColor: getPowerupColor(p.type), borderColor: themeColors.border }]}>
                <Text style={styles.powerupEmoji}>{getPowerupEmoji(p.type)}</Text>
              </View>
            </View>
          ))}

          <Animated.View pointerEvents="none" style={[styles.hitFlash, { backgroundColor: themeColors.healthBad, opacity: hitFlash }]} />

          {gameOver && (
            <View style={[styles.gameOverOverlay, { backgroundColor: themeColors.gameOverBg }]}>
              <View style={[styles.gameOverContainer, { borderColor: themeColors.gameOverBorder }]}>
                <Text style={[styles.gameOverTitle, { color: themeColors.healthBad }]}>GAME OVER</Text>
                <Text style={[styles.gameOverScore, { color: themeColors.text }]}>Final Score: {score}</Text>
                <Text style={[styles.gameOverLevel, { color: themeColors.textMuted }]}>Level Reached: {level}</Text>
                <TouchableOpacity
                  onPress={resetGame}
                  onPressIn={() => pressIn(retryScale)}
                  onPressOut={() => pressOut(retryScale)}
                  activeOpacity={0.9}
                >
                  <Animated.View style={[styles.retryButton, { backgroundColor: themeColors.resetButton, transform: [{ scale: retryScale }] }]}>
                    <Text style={[styles.retryButtonText, { color: isDark ? "#0a0e1f" : "#ffffff" }]}>↻ RETRY</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <View style={[styles.controls, { backgroundColor: themeColors.controlsBackground }]}>
        <Text style={[styles.controlsInfo, { color: themeColors.textMuted }]}>Hold to move and fire</Text>

        <View style={styles.controlRow}>
          <TouchableOpacity
            onPressIn={() => handleTouchStart("left")}
            onPressOut={() => handleTouchEnd("left")}
            disabled={gameState !== "playing" || gameOver}
            activeOpacity={0.9}
          >
            <Animated.View
              style={[
                styles.controlButton,
                {
                  backgroundColor: leftPressedUI ? themeColors.buttonActiveBackground : themeColors.buttonBackground,
                  borderColor: themeColors.buttonBorder,
                  transform: [{ scale: leftScale }],
                  opacity: gameState !== "playing" || gameOver ? 0.4 : 1,
                },
              ]}
            >
              <Text style={[styles.controlButtonText, { color: themeColors.buttonText }]}>←</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => handleTouchStart("fire")}
            onPressOut={() => handleTouchEnd("fire")}
            disabled={gameState !== "playing" || gameOver}
            activeOpacity={0.9}
          >
            <Animated.View
              style={[
                styles.shootButton,
                {
                  backgroundColor: firePressedUI ? themeColors.fireButtonActiveBackground : themeColors.fireButtonBackground,
                  borderColor: themeColors.fireButtonBorder,
                  transform: [{ scale: fireScale }],
                  opacity: gameState !== "playing" || gameOver ? 0.4 : 1,
                },
              ]}
            >
              <Text style={[styles.controlButtonText, { color: themeColors.fireButtonText }]}>●</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => handleTouchStart("right")}
            onPressOut={() => handleTouchEnd("right")}
            disabled={gameState !== "playing" || gameOver}
            activeOpacity={0.9}
          >
            <Animated.View
              style={[
                styles.controlButton,
                {
                  backgroundColor: rightPressedUI ? themeColors.buttonActiveBackground : themeColors.buttonBackground,
                  borderColor: themeColors.buttonBorder,
                  transform: [{ scale: rightScale }],
                  opacity: gameState !== "playing" || gameOver ? 0.4 : 1,
                },
              ]}
            >
              <Text style={[styles.controlButtonText, { color: themeColors.buttonText }]}>→</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, alignItems: "center" },
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
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: 1 },
  titleDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 6, marginBottom: 12 },
  gameInfo: { alignItems: "center", marginBottom: 10 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: { borderRadius: 12, borderWidth: 1, paddingVertical: 5, paddingHorizontal: 16, alignItems: "center", minWidth: 78 },
  statLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  statValue: { fontSize: 17, fontWeight: "800" },
  healthBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  healthText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  healthBarContainer: { width: 100, height: 8, borderRadius: 4, overflow: "hidden" },
  healthBarFill: { height: "100%", borderRadius: 4 },
  powerupIndicatorRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  powerupIndicator: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  powerupIndicatorEmoji: { fontSize: 13 },
  gameBoard: { borderRadius: 16, marginBottom: 15, position: "relative", borderWidth: 1.5, overflow: "hidden" },
  gameObject: { position: "absolute", justifyContent: "center", alignItems: "center" },
  spaceshipImage: { width: "100%", height: "100%" },
  shieldRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.85,
  },
  enemyEmoji: { textAlign: "center" },
  enemyHealthTrack: {
    position: "absolute",
    bottom: -6,
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  enemyHealthFill: { height: "100%", backgroundColor: "#ffffff" },
  bullet: { position: "absolute", borderRadius: 2, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  spark: { position: "absolute", borderWidth: 2, borderRadius: 8 },
  powerupBadge: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  powerupEmoji: { fontSize: 16 },
  hitFlash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  gameOverOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1000 },
  gameOverContainer: { backgroundColor: "transparent", padding: 30, borderRadius: 15, borderWidth: 3, alignItems: "center", minWidth: 250 },
  gameOverTitle: { fontSize: 26, fontWeight: "800", marginBottom: 12 },
  gameOverScore: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  gameOverLevel: { fontSize: 14, fontWeight: "600", marginBottom: 20 },
  retryButton: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25 },
  retryButtonText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  controls: { alignItems: "center", paddingVertical: 10, borderRadius: 14, paddingHorizontal: 20 },
  controlRow: { flexDirection: "row", gap: 20, marginVertical: 10, alignItems: "center" },
  controlButton: { width: 58, height: 58, borderRadius: 29, justifyContent: "center", alignItems: "center", borderWidth: 1.5 },
  shootButton: { width: 68, height: 68, borderRadius: 34, justifyContent: "center", alignItems: "center", borderWidth: 1.5 },
  controlButtonText: { fontSize: 22, fontWeight: "800" },
  controlsInfo: { fontSize: 12, textAlign: "center", marginBottom: 10, fontWeight: "600" },
});

export default CosmicStriker;
