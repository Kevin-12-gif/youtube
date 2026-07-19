import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { useTheme } from "../ThemeContext";
import { useMusic } from "../MusicContext";
import MuteButton from "../MuteButton";

interface DrawingCanvasProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: "playing" | "paused" | "ended";
}

interface Layer {
  id: number;
  name: string;
  visible: boolean;
  fill: string | null;
}

interface Stroke {
  id: number;
  layerId: number;
  color: string;
  strokeWidth: number;
  path: string;
}

const PALETTE = {
  light: {
    bg: ["#C4EDFF", "#C4EDFF"],
    text: "#1e1b4b",
    subtext: "#6d28d9",
    canvasBg: "#ffffff",
    canvasBorder: "#c7d2fe",
    toolbarBg: "#ffffff",
    swatchBorder: "#c7d2fe",
    swatchBorderActive: "#4f46e5",
    scorePill: "#4f46e5",
    countPill: "#ec4899",
    button: "#6366f1",
    buttonAlt: "#f43f5e",
    buttonThird: "#0ea5e9",
    buttonText: "#ffffff",
    sizeDotBg: "#1e1b4b",
    sizeDotBorderActive: "#4f46e5",
  },
  dark: {
    bg: ["#000000", "#000000"],
    text: "#f1f5f9",
    subtext: "#a78bfa",
    canvasBg: "#161335",
    canvasBorder: "#7c3aed",
    toolbarBg: "rgba(255,255,255,0.03)",
    swatchBorder: "#3b2f6b",
    swatchBorderActive: "#a78bfa",
    scorePill: "#22d3ee",
    countPill: "#f472b6",
    button: "#7c3aed",
    buttonAlt: "#fb7185",
    buttonThird: "#38bdf8",
    buttonText: "#ffffff",
    sizeDotBg: "#f1f5f9",
    sizeDotBorderActive: "#a78bfa",
  },
};

const SWATCHES = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#1e1b4b",
  "#ffffff",
];

const BRUSH_SIZES = [3, 6, 10];
const WHEEL_SIZE = 150;
const WHEEL_SEGMENTS = 48;
const BRIGHTNESS_WIDTH = 220;
const BRIGHTNESS_HEIGHT = 20;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// --- Back Button --------------------------------------------------------

function BackButton({
  onPress,
  isDark,
}: {
  onPress: () => void;
  isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <ExpoLinearGradient
          colors={isDark ? ["#444", "#222"] : ["#888", "#444"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{"←  Back"}</Text>
        </ExpoLinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// --- color helpers ------------------------------------------------------

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = (((g - b) / d) % 6) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

// --- color wheel (hue + saturation) --------------------------------------

function ColorWheel({
  hue,
  saturation,
  onChange,
}: {
  hue: number;
  saturation: number;
  onChange: (hue: number, saturation: number) => void;
}) {
  const radius = WHEEL_SIZE / 2;
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleTouchEvt = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - radius;
    const dy = locationY - radius;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const sat = Math.max(0, Math.min(1, dist / radius));
    onChangeRef.current(angle, sat);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleTouchEvt,
      onPanResponderMove: handleTouchEvt,
    }),
  ).current;

  const wedges = [];
  const step = 360 / WHEEL_SEGMENTS;
  for (let i = 0; i < WHEEL_SEGMENTS; i++) {
    const a0 = (i * step * Math.PI) / 180;
    const a1 = ((i + 1) * step * Math.PI) / 180;
    const x0 = radius + radius * Math.cos(a0);
    const y0 = radius + radius * Math.sin(a0);
    const x1 = radius + radius * Math.cos(a1);
    const y1 = radius + radius * Math.sin(a1);
    const midHue = (i + 0.5) * step;
    wedges.push(
      <Path
        key={i}
        d={`M${radius},${radius} L${x0},${y0} A${radius},${radius} 0 0 1 ${x1},${y1} Z`}
        fill={hsvToHex(midHue, 1, 1)}
      />,
    );
  }

  const markerAngleRad = (hue * Math.PI) / 180;
  const markerDist = saturation * radius;
  const markerX = radius + markerDist * Math.cos(markerAngleRad);
  const markerY = radius + markerDist * Math.sin(markerAngleRad);

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
        <Defs>
          <RadialGradient id="satFade" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <G>{wedges}</G>
        <Circle cx={radius} cy={radius} r={radius} fill="url(#satFade)" />
        <Circle
          cx={markerX}
          cy={markerY}
          r={9}
          fill={hsvToHex(hue, saturation, 1)}
          stroke="#ffffff"
          strokeWidth={3}
        />
      </Svg>
    </View>
  );
}

// --- brightness slider ----------------------------------------------------

function BrightnessSlider({
  hue,
  saturation,
  brightness,
  onChange,
}: {
  hue: number;
  saturation: number;
  brightness: number;
  onChange: (v: number) => void;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleTouchEvt = (evt: any) => {
    const { locationX } = evt.nativeEvent;
    const v = Math.max(0, Math.min(1, locationX / BRIGHTNESS_WIDTH));
    onChangeRef.current(v);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleTouchEvt,
      onPanResponderMove: handleTouchEvt,
    }),
  ).current;

  const fullColor = hsvToHex(hue, saturation, 1);

  return (
    <View {...panResponder.panHandlers} style={{ width: BRIGHTNESS_WIDTH }}>
      <Svg width={BRIGHTNESS_WIDTH} height={BRIGHTNESS_HEIGHT}>
        <Defs>
          <LinearGradient id="briGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor="#000000" />
            <Stop offset="1" stopColor={fullColor} />
          </LinearGradient>
        </Defs>
        <Path
          d={`M4,0 H${BRIGHTNESS_WIDTH - 4} A4,4 0 0 1 ${BRIGHTNESS_WIDTH},4 V${
            BRIGHTNESS_HEIGHT - 4
          } A4,4 0 0 1 ${BRIGHTNESS_WIDTH - 4},${BRIGHTNESS_HEIGHT} H4 A4,4 0 0 1 0,${
            BRIGHTNESS_HEIGHT - 4
          } V4 A4,4 0 0 1 4,0 Z`}
          fill="url(#briGrad)"
        />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: Math.max(
            0,
            Math.min(BRIGHTNESS_WIDTH - 4, brightness * BRIGHTNESS_WIDTH - 2),
          ),
          top: -2,
          width: 4,
          height: BRIGHTNESS_HEIGHT + 4,
          backgroundColor: "#ffffff",
          borderRadius: 2,
        }}
      />
    </View>
  );
}

// --- buttons --------------------------------------------------------------

function AnimatedButton({
  label,
  emoji,
  color,
  colors,
  onPress,
  disabled,
}: {
  label: string;
  emoji: string;
  color: string;
  colors: typeof PALETTE.light;
  onPress: () => void;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Text
        onPress={disabled ? undefined : onPress}
        onPressIn={() =>
          !disabled &&
          Animated.spring(scale, {
            toValue: 0.94,
            useNativeDriver: true,
            friction: 5,
          }).start()
        }
        onPressOut={() =>
          !disabled &&
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
          }).start()
        }
        style={[
          styles.button,
          {
            backgroundColor: color,
            opacity: disabled ? 0.4 : 1,
            color: colors.buttonText,
          },
        ]}
      >
        {emoji} {label}
      </Text>
    </Animated.View>
  );
}

// --- touch helpers (multi-touch pinch) ------------------------------------

function touchDistance(touches: any[]) {
  const dx = touches[0].locationX - touches[1].locationX;
  const dy = touches[0].locationY - touches[1].locationY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchMidpoint(touches: any[]) {
  return {
    x: (touches[0].locationX + touches[1].locationX) / 2,
    y: (touches[0].locationY + touches[1].locationY) / 2,
  };
}

// --- main component ---------------------------------------------------------

export function DrawingCanvas({
  onScoreChange = () => {},
  onGameEnd = () => {},
  gameState = "playing",
}: DrawingCanvasProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { setTrack } = useMusic();
  const isDark = theme === "dark";
  const colors = isDark ? PALETTE.dark : PALETTE.light;

  useFocusEffect(
    useCallback(() => {
      setTrack("DrawPad");
    }, [setTrack])
  );

  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [activeSize, setActiveSize] = useState(BRUSH_SIZES[1]);

  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const activeColor = useMemo(
    () => hsvToHex(hue, saturation, brightness),
    [hue, saturation, brightness],
  );

  const [layers, setLayers] = useState<Layer[]>([
    { id: 1, name: "Layer 1", visible: true, fill: null },
  ]);
  const [activeLayerId, setActiveLayerId] = useState(1);
  const nextLayerId = useRef(2);

  const nextStrokeId = useRef(1);
  const currentPathRef = useRef("");

  // --- zoom / pan state (expressed as an SVG viewBox) ---
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const pinchRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialUserMidX: number;
    initialUserMidY: number;
  } | null>(null);

  const canvasWidth = Math.min(width - 40, 400);
  const canvasHeight = Math.min(height * 0.48, 500);

  const vbW = canvasWidth / zoom;
  const vbH = canvasHeight / zoom;
  const vbX = panX;
  const vbY = panY;

  const toUserSpace = (locationX: number, locationY: number) => ({
    x: vbX + (locationX / canvasWidth) * vbW,
    y: vbY + (locationY / canvasHeight) * vbH,
  });

  useEffect(() => {
    onScoreChange(strokes.length);
  }, [strokes.length, onScoreChange]);

  const activeLayerVisible =
    layers.find((l) => l.id === activeLayerId)?.visible !== false;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;

          if (touches.length === 2) {
            const dist = touchDistance(touches);
            const mid = touchMidpoint(touches);
            const midUser = toUserSpace(mid.x, mid.y);
            pinchRef.current = {
              initialDistance: dist,
              initialZoom: zoom,
              initialUserMidX: midUser.x,
              initialUserMidY: midUser.y,
            };
            currentPathRef.current = "";
            setCurrentPath("");
            return;
          }

          if (!(gameState === "playing" && activeLayerVisible)) return;

          const { locationX, locationY } = evt.nativeEvent;
          const p = toUserSpace(locationX, locationY);

          currentPathRef.current = `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          setCurrentPath(currentPathRef.current);
        },
        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;

          if (touches.length === 2 && pinchRef.current) {
            const dist = touchDistance(touches);
            const mid = touchMidpoint(touches);
            const scaleDelta = dist / pinchRef.current.initialDistance;
            const newZoom = Math.max(
              MIN_ZOOM,
              Math.min(MAX_ZOOM, pinchRef.current.initialZoom * scaleDelta),
            );
            const newVbW = canvasWidth / newZoom;
            const newVbH = canvasHeight / newZoom;
            let newPanX =
              pinchRef.current.initialUserMidX - (mid.x / canvasWidth) * newVbW;
            let newPanY =
              pinchRef.current.initialUserMidY - (mid.y / canvasHeight) * newVbH;
            newPanX = Math.max(0, Math.min(canvasWidth - newVbW, newPanX));
            newPanY = Math.max(0, Math.min(canvasHeight - newVbH, newPanY));
            setZoom(newZoom);
            setPanX(newPanX);
            setPanY(newPanY);
            return;
          }

          if (pinchRef.current) return; // mid-pinch, ignore stray single-touch moves
          if (!(gameState === "playing" && activeLayerVisible)) return;

          const { locationX, locationY } = evt.nativeEvent;
          const p = toUserSpace(locationX, locationY);
          currentPathRef.current += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          setCurrentPath(currentPathRef.current);
        },
        onPanResponderRelease: () => {
          if (pinchRef.current) {
            pinchRef.current = null;
            return;
          }

          const path = currentPathRef.current;
          if (path && path.includes("L")) {
            setStrokes((prev) => [
              ...prev,
              {
                id: nextStrokeId.current++,
                layerId: activeLayerId,
                color: activeColor,
                strokeWidth: activeSize,
                path: path,
              },
            ]);
          }
          currentPathRef.current = "";
          setCurrentPath("");
        },
        onPanResponderTerminate: () => {
          if (pinchRef.current) {
            pinchRef.current = null;
          }
          const path = currentPathRef.current;
          if (path && path.includes("L")) {
            setStrokes((prev) => [
              ...prev,
              {
                id: nextStrokeId.current++,
                layerId: activeLayerId,
                color: activeColor,
                strokeWidth: activeSize,
                path: path,
              },
            ]);
          }
          currentPathRef.current = "";
          setCurrentPath("");
        },
      }),
    [
      activeColor,
      activeSize,
      gameState,
      activeLayerId,
      activeLayerVisible,
      zoom,
      panX,
      panY,
      canvasWidth,
      canvasHeight,
    ],
  );

  const undo = () => {
    setStrokes((prev) => {
      const idx = [...prev].reverse().findIndex((s) => s.layerId === activeLayerId);
      if (idx === -1) return prev;
      const removeAt = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== removeAt);
    });
  };

  const clearLayer = () => {
    setStrokes((prev) => prev.filter((s) => s.layerId !== activeLayerId));
    setLayers((prev) =>
      prev.map((l) => (l.id === activeLayerId ? { ...l, fill: null } : l)),
    );
  };

  const clearAll = () => {
    setStrokes([]);
    setLayers((prev) => prev.map((l) => ({ ...l, fill: null })));
    onGameEnd(0);
  };

  const handleSwatchPress = (hex: string) => {
    const { h, s, v } = hexToHsv(hex);
    setHue(h);
    setSaturation(s);
    setBrightness(v);
  };

  const addLayer = () => {
    const id = nextLayerId.current++;
    setLayers((prev) => {
      const maxNum = prev.reduce((max, l) => {
        const match = l.name.match(/Layer (\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      return [
        { id, name: `Layer ${maxNum + 1}`, visible: true, fill: null },
        ...prev,
      ];
    });
    setActiveLayerId(id);
  };

  const toggleLayerVisibility = (id: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  };

  const removeLayer = (id: number) => {
    if (layers.length <= 1) return;
    const remaining = layers.filter((l) => l.id !== id);
    setLayers(remaining);
    setStrokes((prev) => prev.filter((s) => s.layerId !== id));
    if (activeLayerId === id) {
      setActiveLayerId(remaining[remaining.length - 1].id);
    }
  };

  // moves a layer's position in the stack — "up" renders it above other layers
  const moveLayer = (id: number, direction: "up" | "down") => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // zoom in/out around the current viewBox center, clamped to canvas bounds
  const zoomBy = (factor: number) => {
    const oldZoom = zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
    const oldVbW = canvasWidth / oldZoom;
    const oldVbH = canvasHeight / oldZoom;
    const newVbW = canvasWidth / newZoom;
    const newVbH = canvasHeight / newZoom;
    const centerX = panX + oldVbW / 2;
    const centerY = panY + oldVbH / 2;
    const newPanX = Math.max(0, Math.min(canvasWidth - newVbW, centerX - newVbW / 2));
    const newPanY = Math.max(0, Math.min(canvasHeight - newVbH, centerY - newVbH / 2));
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const activeLayerStrokeCount = strokes.filter(
    (s) => s.layerId === activeLayerId,
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg[0] }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🎨 Draw Pad</Text>
        <View style={styles.headerActions}>
          <MuteButton color={colors.text} />
        </View>
      </View>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: colors.countPill }]}>
          <Text style={styles.pillText}>{strokes.length} strokes</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.scorePill }]}>
          <Text style={styles.pillText}>🖌️ {activeSize}px</Text>
        </View>
      </View>

      <View
        style={[
          styles.canvasWrap,
          {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: colors.canvasBg,
            borderColor: colors.canvasBorder,
          },
        ]}
        collapsable={false}
        {...panResponder.panHandlers}
      >
        <Svg
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          pointerEvents="none"
        >
          {[...layers].reverse().map((layer) => (
            <G key={layer.id}>
              {layer.visible && layer.fill ? (
                <Path
                  d={`M0,0 H${canvasWidth} V${canvasHeight} H0 Z`}
                  fill={layer.fill}
                />
              ) : null}
              {layer.visible
                ? strokes
                    .filter((s) => s.layerId === layer.id)
                    .map((s) => (
                      <Path
                        key={s.id}
                        d={s.path}
                        stroke={s.color}
                        strokeWidth={s.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ))
                : null}
            </G>
          ))}
          {currentPath && activeLayerVisible ? (
            <Path
              d={currentPath}
              stroke={activeColor}
              strokeWidth={activeSize}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.toolbarBg }]}>
        {/* layers */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.layerRow}
          style={styles.layerScroll}
        >
          {layers.map((layer) => (
            <View
              key={layer.id}
              style={[
                styles.layerChip,
                {
                  backgroundColor: colors.canvasBg,
                  borderColor:
                    activeLayerId === layer.id
                      ? colors.swatchBorderActive
                      : colors.swatchBorder,
                },
              ]}
            >
              <Text
                onPress={() => setActiveLayerId(layer.id)}
                numberOfLines={1}
                style={[styles.layerChipLabel, { color: colors.text }]}
              >
                {layer.name}
              </Text>
              <Text
                onPress={() => toggleLayerVisibility(layer.id)}
                style={styles.layerChipIcon}
              >
                {layer.visible ? "👁️" : "🚫"}
              </Text>
            </View>
          ))}
          <Text
            onPress={addLayer}
            style={[
              styles.addLayerChip,
              { borderColor: colors.swatchBorderActive, color: colors.swatchBorderActive },
            ]}
          >
            + Add
          </Text>
        </ScrollView>

        {/* layer actions */}
        <View style={styles.layerActionRow}>
          <Text
            onPress={() => moveLayer(activeLayerId, "down")}
            style={[styles.layerActionButton, { borderColor: colors.swatchBorder, color: colors.text }]}
          >
            ⬇️ Down
          </Text>
          <Text
            onPress={() => moveLayer(activeLayerId, "up")}
            style={[styles.layerActionButton, { borderColor: colors.swatchBorder, color: colors.text }]}
          >
            ⬆️ Up
          </Text>
          {layers.length > 1 && (
            <Text
              onPress={() => removeLayer(activeLayerId)}
              style={[styles.layerActionButton, { borderColor: colors.buttonAlt, color: colors.buttonAlt }]}
            >
              ✕ Delete
            </Text>
          )}
        </View>

        {/* zoom controls */}
        <View style={styles.zoomRow}>
          <Text
            onPress={() => zoomBy(0.8)}
            style={[styles.zoomButton, { borderColor: colors.swatchBorder, color: colors.text }]}
          >
            −
          </Text>
          <Text style={[styles.zoomLabel, { color: colors.text }]}>
            {Math.round(zoom * 100)}%
          </Text>
          <Text
            onPress={() => zoomBy(1.25)}
            style={[styles.zoomButton, { borderColor: colors.swatchBorder, color: colors.text }]}
          >
            +
          </Text>
        </View>

        {/* color wheel + brightness */}
        <View style={styles.wheelRow}>
          <ColorWheel
            hue={hue}
            saturation={saturation}
            onChange={(h, s) => {
              setHue(h);
              setSaturation(s);
            }}
          />
          <View style={styles.wheelSideControls}>
            <View
              style={[
                styles.previewSwatch,
                { backgroundColor: activeColor, borderColor: colors.swatchBorder },
              ]}
            />
            <BrightnessSlider
              hue={hue}
              saturation={saturation}
              brightness={brightness}
              onChange={setBrightness}
            />
          </View>
        </View>

        {/* quick swatches */}
        <View style={styles.swatchRow}>
          {SWATCHES.map((c) => (
            <Text
              key={c}
              onPress={() => handleSwatchPress(c)}
              style={[
                styles.swatch,
                {
                  backgroundColor: c,
                  borderColor:
                    activeColor.toLowerCase() === c.toLowerCase()
                      ? colors.swatchBorderActive
                      : colors.swatchBorder,
                  borderWidth: activeColor.toLowerCase() === c.toLowerCase() ? 3 : 1.5,
                },
              ]}
            />
          ))}
        </View>

        {/* brush sizes */}
        <View style={styles.sizeRow}>
          {BRUSH_SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              onPress={() => setActiveSize(size)}
              activeOpacity={0.7}
              style={[
                styles.sizeOption,
                {
                  borderColor:
                    activeSize === size
                      ? colors.sizeDotBorderActive
                      : colors.swatchBorder,
                },
              ]}
            >
              <View
                style={{
                  width: size + 6,
                  height: size + 6,
                  borderRadius: (size + 6) / 2,
                  backgroundColor: colors.sizeDotBg,
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <AnimatedButton
            label="Undo"
            emoji="↩️"
            color={colors.button}
            colors={colors}
            onPress={undo}
            disabled={activeLayerStrokeCount === 0}
          />
          <AnimatedButton
            label="Clear Layer"
            emoji="🧹"
            color={colors.buttonThird}
            colors={colors}
            onPress={clearLayer}
            disabled={activeLayerStrokeCount === 0 && !layers.find((l) => l.id === activeLayerId)?.fill}
          />
          <AnimatedButton
            label="Clear All"
            emoji="🗑️"
            color={colors.buttonAlt}
            colors={colors}
            onPress={clearAll}
            disabled={strokes.length === 0}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center" },
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 10, letterSpacing: 0.5 },
  pillRow: { flexDirection: "row", gap: 8 },
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
  pillText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  canvasWrap: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  toolbar: { width: "100%", borderRadius: 16, padding: 14, alignItems: "center" },
  layerScroll: { width: "100%", marginBottom: 14 },
  layerRow: { flexDirection: "row", gap: 8, paddingHorizontal: 2 },
  layerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  layerChipLabel: { fontSize: 13, fontWeight: "700", maxWidth: 100 },
  layerChipIcon: { fontSize: 15 },
  addLayerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
    fontSize: 13,
    fontWeight: "700",
  },
  layerActionRow: { flexDirection: "row", gap: 10, marginBottom: 16, width: "100%", justifyContent: "center" },
  layerActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  zoomButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 18,
    fontWeight: "800",
  },
  zoomLabel: { fontSize: 13, fontWeight: "700", minWidth: 44, textAlign: "center" },
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  wheelSideControls: { alignItems: "center", gap: 10 },
  previewSwatch: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  sizeRow: { flexDirection: "row", gap: 14, marginBottom: 16, alignItems: "center" },
  sizeOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    fontWeight: "800",
    fontSize: 13,
    overflow: "hidden",
    textAlign: "center",
  },
});export default DrawingCanvas;
