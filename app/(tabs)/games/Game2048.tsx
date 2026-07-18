import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

interface TwentyFortyEightGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: "playing" | "paused" | "ended";
}

type Direction = "up" | "down" | "left" | "right";
type Grid = number[][];

interface MoveResult {
  grid: Grid;
  moved: boolean;
  points: number;
  mergedCells: string[]; // "row-col" keys that merged this move, for pop animation
}

const SIZE = 4;
const SWIPE_THRESHOLD = 24;

// ---------- pure game logic (no React state in here) ----------

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function getEmptyCells(grid: Grid) {
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function spawnTile(grid: Grid, score: number): Grid {
  const next = cloneGrid(grid);
  const empties = getEmptyCells(next);
  if (empties.length === 0) return next;

  const cell = empties[Math.floor(Math.random() * empties.length)];
  const difficultyBonus = Math.min(score / 10000, 0.15);
  const r = Math.random();

  let value = 2;
  if (r < 0.1 + difficultyBonus) value = 4;
  if (r < 0.02 + difficultyBonus && score > 5000) value = 8;

  next[cell.row][cell.col] = value;
  return next;
}

function collapseLine(line: number[]): {
  line: number[];
  points: number;
  mergedIdx: number[];
} {
  const filtered = line.filter((v) => v !== 0);
  const result: number[] = [];
  const mergedIdx: number[] = [];
  let points = 0;

  let i = 0;
  while (i < filtered.length) {
    if (filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      mergedIdx.push(result.length - 1);
      points += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i += 1;
    }
  }
  while (result.length < SIZE) result.push(0);

  return { line: result, points, mergedIdx };
}

function move(grid: Grid, direction: Direction): MoveResult {
  const next = cloneGrid(grid);
  let moved = false;
  let points = 0;
  const mergedCells: string[] = [];

  const isVertical = direction === "up" || direction === "down";
  const reversed = direction === "right" || direction === "down";

  for (let idx = 0; idx < SIZE; idx++) {
    let line: number[] = [];
    for (let k = 0; k < SIZE; k++) {
      line.push(isVertical ? next[k][idx] : next[idx][k]);
    }
    if (reversed) line = line.reverse();

    const {
      line: collapsed,
      points: linePoints,
      mergedIdx,
    } = collapseLine(line);
    points += linePoints;

    let finalLine = collapsed;
    if (reversed) finalLine = [...collapsed].reverse();

    for (let k = 0; k < SIZE; k++) {
      const value = finalLine[k];
      const prevValue = isVertical ? next[k][idx] : next[idx][k];
      if (prevValue !== value) moved = true;
      if (isVertical) next[k][idx] = value;
      else next[idx][k] = value;
    }

    mergedIdx.forEach((mi) => {
      const realIdx = reversed ? SIZE - 1 - mi : mi;
      const row = isVertical ? realIdx : idx;
      const col = isVertical ? idx : realIdx;
      mergedCells.push(`${row}-${col}`);
    });
  }

  return { grid: next, moved, points, mergedCells };
}

function hasMovesLeft(grid: Grid): boolean {
  if (getEmptyCells(grid).length > 0) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (c < SIZE - 1 && grid[r][c + 1] === v) return true;
      if (r < SIZE - 1 && grid[r + 1][c] === v) return true;
    }
  }
  return false;
}

// ---------- theme ----------

function useThemeColors() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return useMemo(() => {
    const palette = isDark
      ? {
          background: "#0b1020",
          panel: "#141a30",
          boardBg: "#1c2444",
          boardBorder: "#2e3a6b",
          emptyTile: "rgba(255,255,255,0.05)",
          emptyTileBorder: "rgba(255,255,255,0.08)",
          title: "#7dd3fc",
          titleAccent: "#f472b6",
          text: "#e2e8f0",
          scoreLabel: "#94a3b8",
          scoreValue: "#facc15",
          buttonBg: "#1c2444",
          buttonBorder: "#3b4a8f",
          buttonIcon: "#e2e8f0",
          buttonActiveBg: "#2b3568",
          hint: "#64748b",
          overlayBg: "rgba(11,16,32,0.88)",
          winText: "#4ade80",
          overText: "#f87171",
        }
      : {
          background: "#C4EDFF",
          panel: "#ffffff",
          boardBg: "#e7e0d4",
          boardBorder: "#d3c8b4",
          emptyTile: "rgba(0,0,0,0.05)",
          emptyTileBorder: "rgba(0,0,0,0.06)",
          title: "#7c3aed",
          titleAccent: "#f97316",
          text: "#1e1b4b",
          scoreLabel: "#78716c",
          scoreValue: "#16a34a",
          buttonBg: "#ffffff",
          buttonBorder: "#e7e0d4",
          buttonIcon: "#57534e",
          buttonActiveBg: "#f3ede3",
          hint: "#a8a29e",
          overlayBg: "rgba(250,247,242,0.92)",
          winText: "#16a34a",
          overText: "#dc2626",
        };

    const tiles: Record<number, { bg: string; text: string }> = isDark
      ? {
          2: { bg: "#334155", text: "#e2e8f0" },
          4: { bg: "#3f4a6b", text: "#e2e8f0" },
          8: { bg: "#f97316", text: "#1a1a1a" },
          16: { bg: "#fb923c", text: "#1a1a1a" },
          32: { bg: "#f43f5e", text: "#ffffff" },
          64: { bg: "#e11d48", text: "#ffffff" },
          128: { bg: "#a855f7", text: "#ffffff" },
          256: { bg: "#8b5cf6", text: "#ffffff" },
          512: { bg: "#0ea5e9", text: "#ffffff" },
          1024: { bg: "#06b6d4", text: "#0a0a0a" },
          2048: { bg: "#facc15", text: "#1a1a1a" },
        }
      : {
          2: { bg: "#fef3c7", text: "#78350f" },
          4: { bg: "#fde68a", text: "#78350f" },
          8: { bg: "#fb923c", text: "#ffffff" },
          16: { bg: "#f97316", text: "#ffffff" },
          32: { bg: "#f43f5e", text: "#ffffff" },
          64: { bg: "#e11d48", text: "#ffffff" },
          128: { bg: "#a855f7", text: "#ffffff" },
          256: { bg: "#7c3aed", text: "#ffffff" },
          512: { bg: "#0ea5e9", text: "#ffffff" },
          1024: { bg: "#0891b2", text: "#ffffff" },
          2048: { bg: "#16a34a", text: "#ffffff" },
        };

    return { isDark, palette, tiles };
  }, [isDark]);
}

// ---------- animated tile ----------

interface TileProps {
  value: number;
  isNew: boolean;
  isMerged: boolean;
  bg: string;
  textColor: string;
  emptyBg: string;
  emptyBorder: string;
}

function Tile({
  value,
  isNew,
  isMerged,
  bg,
  textColor,
  emptyBg,
  emptyBorder,
}: TileProps) {
  const scale = useRef(new Animated.Value(value && isNew ? 0 : 1)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isNew) {
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [isNew, value]);

  useEffect(() => {
    if (isMerged) {
      pop.setValue(1);
      Animated.sequence([
        Animated.timing(pop, {
          toValue: 1.18,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pop, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isMerged]);

  const fontSize = value >= 1024 ? 20 : value >= 100 ? 24 : 28;

  return (
    <View
      style={[
        styles.tileSlot,
        { backgroundColor: emptyBg, borderColor: emptyBorder },
      ]}
    >
      {value !== 0 && (
        <Animated.View
          style={[
            styles.tileInner,
            {
              backgroundColor: bg,
              transform: [{ scale: Animated.multiply(scale, pop) }],
            },
          ]}
        >
          <Text style={[styles.tileText, { color: textColor, fontSize }]}>
            {value}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ---------- control button ----------

interface ControlButtonProps {
  label: string;
  glyph: string;
  onPress: () => void;
  bg: string;
  border: string;
  activeBg: string;
  iconColor: string;
  size?: number;
}

function ControlButton({
  label,
  glyph,
  onPress,
  bg,
  border,
  activeBg,
  iconColor,
  size = 52,
}: ControlButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const handlePressIn = () => {
    setPressed(true);
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };
  const handlePressOut = () => {
    setPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 160,
    }).start();
  };

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      activeOpacity={0.85}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.controlTouchable}
    >
      <Animated.View
        style={[
          styles.controlButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: pressed ? activeBg : bg,
            borderColor: border,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[styles.controlGlyph, { color: iconColor }]}>{glyph}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ---------- main component ----------

export function TwentyFortyEightGame({
  onScoreChange = () => {},
  onGameEnd = () => {},
  gameState = "playing",
}: TwentyFortyEightGameProps) {
  const navigation = useNavigation();
  const { isDark, palette, tiles } = useThemeColors();
  const { setTrack } = useMusic();

  useFocusEffect(
    useCallback(() => {
      setTrack("RelaxedScene");
    }, [setTrack])
  );

  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [newCells, setNewCells] = useState<Set<string>>(new Set());
  const [mergedCells, setMergedCells] = useState<Set<string>>(new Set());
  const [hasWon, setHasWon] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [dismissedWin, setDismissedWin] = useState(false);

  const shakeX = useRef(new Animated.Value(0)).current;
  const boardFade = useRef(new Animated.Value(0)).current;
  const startTimeRef = useRef(Date.now());

  // initial mount: starting tiles + entrance animation
  useEffect(() => {
    startTimeRef.current = Date.now();

    let seeded = spawnTile(emptyGrid(), 0);
    seeded = spawnTile(seeded, 0);
    setGrid(seeded);
    setNewCells(new Set(getFilledKeys(seeded)));

    Animated.timing(boardFade, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    onScoreChange(score);
    setBest((prev) => Math.max(prev, score));
  }, [score, onScoreChange]);

  useEffect(() => {
    if (isOver) onGameEnd(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOver]);

  function getFilledKeys(g: Grid): string[] {
    const keys: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] !== 0) keys.push(`${r}-${c}`);
      }
    }
    return keys;
  }

  const runShake = useCallback(() => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: 6,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeX]);

  const doMove = useCallback(
    (direction: Direction) => {
      if (isAnimating || gameState !== "playing" || isOver) return;

      const beforeKeys = new Set(getFilledKeys(grid));
      const result = move(grid, direction);

      if (!result.moved) {
        runShake();
        return;
      }

      setIsAnimating(true);
      setMergedCells(new Set(result.mergedCells));
      setGrid(result.grid);
      setScore((prev) => prev + result.points);

      if (!hasWon && result.grid.some((row) => row.some((v) => v >= 2048))) {
        setHasWon(true);
      }

      setTimeout(() => {
        const withNewTile = spawnTile(result.grid, score + result.points);
        const afterKeys = getFilledKeys(withNewTile);
        const spawned = afterKeys.filter(
          (k) => !beforeKeys.has(k) && !result.grid.flat().length,
        );
        const newlyAdded = new Set<string>();
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (withNewTile[r][c] !== 0 && result.grid[r][c] === 0) {
              newlyAdded.add(`${r}-${c}`);
            }
          }
        }

        setGrid(withNewTile);
        setNewCells(newlyAdded);
        setIsAnimating(false);

        if (!hasMovesLeft(withNewTile)) {
          setIsOver(true);
        }
      }, 150);
    },
    [grid, isAnimating, gameState, isOver, hasWon, score, runShake],
  );

  const restart = useCallback(() => {
    let seeded = spawnTile(emptyGrid(), 0);
    seeded = spawnTile(seeded, 0);
    setGrid(seeded);
    setNewCells(new Set(getFilledKeys(seeded)));
    setMergedCells(new Set());
    setScore(0);
    setHasWon(false);
    setIsOver(false);
    setDismissedWin(false);
    boardFade.setValue(0.6);
    Animated.timing(boardFade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [boardFade]);

  // keyboard support (web)
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    ) {
      return undefined;
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const key = event.key.toLowerCase();
      const map: Record<string, Direction> = {
        w: "up",
        arrowup: "up",
        s: "down",
        arrowdown: "down",
        a: "left",
        arrowleft: "left",
        d: "right",
        arrowright: "right",
      };
      if (map[key]) {
        event.preventDefault();
        doMove(map[key]);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [doMove, gameState]);

  // swipe support (touch)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,
        onPanResponderRelease: (_, gesture) => {
          const { dx, dy } = gesture;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            doMove(dx > 0 ? "right" : "left");
          } else {
            doMove(dy > 0 ? "down" : "up");
          }
        },
      }),
    [doMove],
  );

  const flatValues = grid.flat();
  const highestTile = Math.max(0, ...flatValues);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.title }]}>2048</Text>
          <View
            style={[styles.titleDot, { backgroundColor: palette.titleAccent }]}
          />
        </View>
        <MuteButton color={palette.text} />
      </View>

      <View style={styles.scoreRow}>
          <View
            style={[
              styles.scoreCard,
              {
                backgroundColor: palette.panel,
                borderColor: palette.boardBorder,
              },
            ]}
          >
            <Text style={[styles.scoreLabel, { color: palette.scoreLabel }]}>
              SCORE
            </Text>
            <Text style={[styles.scoreValue, { color: palette.scoreValue }]}>
              {score}
            </Text>
          </View>
          <View
            style={[
              styles.scoreCard,
              {
                backgroundColor: palette.panel,
                borderColor: palette.boardBorder,
              },
            ]}
          >
            <Text style={[styles.scoreLabel, { color: palette.scoreLabel }]}>
              BEST
            </Text>
            <Text style={[styles.scoreValue, { color: palette.title }]}>
              {best}
            </Text>
          </View>
        </View>

      <Animated.View
        style={{
          opacity: boardFade,
          transform: [
            { translateX: shakeX },
            {
              scale: boardFade.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.board,
            {
              backgroundColor: palette.boardBg,
              borderColor: palette.boardBorder,
            },
          ]}
        >
          {grid.map((row, r) => (
            <View key={r} style={styles.boardRow}>
              {row.map((value, c) => {
                const key = `${r}-${c}`;
                return (
                  <Tile
                    key={key}
                    value={value}
                    isNew={newCells.has(key)}
                    isMerged={mergedCells.has(key)}
                    bg={
                      value
                        ? (tiles[value]?.bg ?? palette.titleAccent)
                        : palette.emptyTile
                    }
                    textColor={value ? (tiles[value]?.text ?? "#fff") : "#fff"}
                    emptyBg={palette.emptyTile}
                    emptyBorder={palette.emptyTileBorder}
                  />
                );
              })}
            </View>
          ))}

          {(isOver || (hasWon && !dismissedWin)) && (
            <View
              style={[styles.overlay, { backgroundColor: palette.overlayBg }]}
            >
              <Text
                style={[
                  styles.overlayTitle,
                  {
                    color:
                      hasWon && !isOver ? palette.winText : palette.overText,
                  },
                ]}
              >
                {hasWon && !isOver ? "You made 2048!" : "Game over"}
              </Text>
              <Text
                style={[styles.overlaySubtitle, { color: palette.scoreLabel }]}
              >
                Final score: {score}
              </Text>
              <View style={styles.overlayButtonRow}>
                {hasWon && !isOver && (
                  <TouchableOpacity
                    onPress={() => setDismissedWin(true)}
                    style={[
                      styles.overlayButton,
                      { borderColor: palette.title },
                    ]}
                  >
                    <Text
                      style={[
                        styles.overlayButtonText,
                        { color: palette.title },
                      ]}
                    >
                      Keep going
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={restart}
                  style={[
                    styles.overlayButton,
                    styles.overlayButtonPrimary,
                    { backgroundColor: palette.title },
                  ]}
                >
                  <Text
                    style={[styles.overlayButtonText, { color: "#0b1020" }]}
                  >
                    New game
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={[styles.hint, { color: palette.hint }]}>
          Swipe, use WASD, or tap the arrows
        </Text>

        <View style={styles.dpad}>
          <ControlButton
            label="Move up"
            glyph="↑"
            onPress={() => doMove("up")}
            bg={palette.buttonBg}
            border={palette.buttonBorder}
            activeBg={palette.buttonActiveBg}
            iconColor={palette.buttonIcon}
          />
          <View style={styles.dpadMiddleRow}>
            <ControlButton
              label="Move left"
              glyph="←"
              onPress={() => doMove("left")}
              bg={palette.buttonBg}
              border={palette.buttonBorder}
              activeBg={palette.buttonActiveBg}
              iconColor={palette.buttonIcon}
            />
            <TouchableOpacity
              onPress={restart}
              style={[
                styles.resetButton,
                {
                  borderColor: palette.boardBorder,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <Text style={[styles.resetGlyph, { color: palette.titleAccent }]}>
                ↻
              </Text>
            </TouchableOpacity>
            <ControlButton
              label="Move right"
              glyph="→"
              onPress={() => doMove("right")}
              bg={palette.buttonBg}
              border={palette.buttonBorder}
              activeBg={palette.buttonActiveBg}
              iconColor={palette.buttonIcon}
            />
          </View>
          <ControlButton
            label="Move down"
            glyph="↓"
            onPress={() => doMove("down")}
            bg={palette.buttonBg}
            border={palette.buttonBorder}
            activeBg={palette.buttonActiveBg}
            iconColor={palette.buttonIcon}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 360,
    marginBottom: 20,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1,
  },
  titleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    marginBottom: 18,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  scoreCard: {
    flex: 1,
    maxWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  board: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    position: "relative",
    overflow: "hidden",
  },
  boardRow: {
    flexDirection: "row",
  },
  tileSlot: {
    width: 72,
    height: 72,
    margin: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tileInner: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontWeight: "800",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  overlaySubtitle: {
    fontSize: 14,
    marginBottom: 18,
  },
  overlayButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  overlayButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  overlayButtonPrimary: {
    borderWidth: 0,
  },
  overlayButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    marginTop: 26,
  },
  hint: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  dpad: {
    alignItems: "center",
  },
  dpadMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 8,
  },
  controlTouchable: {
    padding: 2,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  controlGlyph: {
    fontSize: 22,
    fontWeight: "800",
  },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resetGlyph: {
    fontSize: 18,
    fontWeight: "800",
  },
});
export default TwentyFortyEightGame;
