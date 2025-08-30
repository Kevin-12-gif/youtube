import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ColorCrushGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: 'playing' | 'paused' | 'ended';
  theme?: 'light' | 'dark';
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
}

export function ColorCrushGame({ 
  onScoreChange = () => {}, 
  onGameEnd = () => {},
  gameState = 'playing',
  theme = 'light',
  showThemeToggle = true,
  onThemeToggle = () => {}
}: ColorCrushGameProps) {
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
  }>>([]);
  const [targetColor, setTargetColor] = useState('#00ffff');
  const [timeLeft, setTimeLeft] = useState(3);
  const [gameTime, setGameTime] = useState(0);

  const colors = ['#00ffff', '#ff0080', '#00ff00', '#ffff00', '#ff4000', '#8000ff'];
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimeRef = useRef<NodeJS.Timeout | null>(null);

  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        background: '#0f172a',
        gameBackground: '#1e3a8a',
      };
    } else {
      return {
        background: '#f8fafc',
        gameBackground: '#e2e8f0',
      };
    }
  };

  const themeColors = getThemeColors();

  const getSpeedMultiplier = () => {
    return 1 + (gameTime / 30) * 0.5;
  };

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  const startNewTarget = (newTargetColor: string) => {
    setTargetColor(newTargetColor);
    setTimeLeft(3);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          const remainingTargetBalls = balls.filter(b => b.color === newTargetColor);
          if (remainingTargetBalls.length > 0) {
            setScore((prev: number) => Math.max(0, prev - 20));
          }

          const availableColors = [...new Set(balls.map(ball => ball.color))];
          if (availableColors.length > 0) {
            const nextTarget = availableColors[Math.floor(Math.random() * availableColors.length)];
            setTimeout(() => startNewTarget(nextTarget), 100);
          }

          return 3;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (balls.length === 0) {
      const initialBalls = [];
      const initialTargetColor = colors[Math.floor(Math.random() * colors.length)];

      for (let i = 0; i < 10; i++) {
        const arenaWidth = width - 40;
        const arenaHeight = height - 300;
        const ballSize = 25 + Math.random() * 15;
        const ballRadius = ballSize / 2;
        initialBalls.push({
          id: i,
          x: Math.random() * (arenaWidth - ballSize) + ballRadius,
          y: Math.random() * (arenaHeight - ballSize) + ballRadius,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: ballSize
        });
      }
      setBalls(initialBalls);
      startNewTarget(initialTargetColor);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gameTimeRef.current) clearInterval(gameTimeRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      gameTimeRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    } else {
      if (gameTimeRef.current) clearInterval(gameTimeRef.current);
    }

    return () => {
      if (gameTimeRef.current) clearInterval(gameTimeRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        const speedMultiplier = getSpeedMultiplier();

        setBalls(prevBalls => 
          prevBalls.map(ball => {
            let newX = ball.x + (ball.vx * speedMultiplier);
            let newY = ball.y + (ball.vy * speedMultiplier);
            let newVx = ball.vx;
            let newVy = ball.vy;

            const arenaWidth = width - 40;
            const arenaHeight = height - 300;
            const ballRadius = ball.size / 2;

            if (newX <= ballRadius || newX >= arenaWidth - ballRadius) {
              newVx = -newVx;
              newX = newX <= ballRadius ? ballRadius : arenaWidth - ballRadius;
            }
            if (newY <= ballRadius || newY >= arenaHeight - ballRadius) {
              newVy = -newVy;
              newY = newY <= ballRadius ? ballRadius : arenaHeight - ballRadius;
            }

            return { ...ball, x: newX, y: newY, vx: newVx, vy: newVy };
          })
        );
      }, 50);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, gameTime]);

  const hitBall = (ballId: number) => {
    const ball = balls.find(b => b.id === ballId);
    if (!ball) return;

    if (ball.color === targetColor) {
      setScore((prev: number) => prev + 15);

      setBalls(prevBalls => {
        const newBalls = prevBalls.filter(b => b.id !== ballId);
        const remainingTargetBalls = newBalls.filter(b => b.color === targetColor);

        if (remainingTargetBalls.length === 0) {
          const availableColors = [...new Set(newBalls.map(ball => ball.color))];
          if (availableColors.length > 0) {
            const newTargetColor = availableColors[Math.floor(Math.random() * availableColors.length)];
            setTimeout(() => startNewTarget(newTargetColor), 100);
          }
        }

        if (newBalls.length === 0) {
          const freshBalls = [];
          const arenaWidth = width - 40;
          const arenaHeight = height - 300;
          for (let i = 0; i < 10; i++) {
            const ballSize = 25 + Math.random() * 15;
            const ballRadius = ballSize / 2;
            freshBalls.push({
              id: Date.now() + i,
              x: Math.random() * (arenaWidth - ballSize) + ballRadius,
              y: Math.random() * (arenaHeight - ballSize) + ballRadius,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: ballSize
            });
          }

          const newTargetColor = colors[Math.floor(Math.random() * colors.length)];
          setTimeout(() => startNewTarget(newTargetColor), 100);

          return freshBalls;
        }

        return newBalls;
      });
    } else {
      setScore((prev: number) => Math.max(0, prev - 5));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.colorCrushHeader}>
        <Text style={styles.colorCrushTitle}>COLOR CRUSH</Text>
        <Text style={styles.score}>Score: {score}</Text>
        <View style={styles.colorCrushTarget}>
          <Text style={styles.colorCrushTargetText}>Target:</Text>
          <View style={[styles.colorCrushTargetColor, { backgroundColor: targetColor }]} />
          <View style={styles.colorCrushTimer}>
            <Text style={[
              styles.colorCrushTimerText,
              { color: timeLeft <= 1 ? '#ff0000' : timeLeft <= 2 ? '#ffff00' : '#00ff00' }
            ]}>
              {timeLeft}s
            </Text>
          </View>
        </View>
        <Text style={styles.colorCrushGameTime}>Time: {gameTime}s</Text>
      </View>

      <View style={[styles.colorCrushArena, { backgroundColor: themeColors.gameBackground }]}>
        {balls.map(ball => (
          <TouchableOpacity
            key={ball.id}
            style={[
              styles.colorCrushBall,
              {
                left: ball.x,
                top: ball.y,
                width: ball.size,
                height: ball.size,
                backgroundColor: ball.color,
                borderRadius: ball.size / 2
              }
            ]}
            onPress={() => hitBall(ball.id)}
          />
        ))}
      </View>

      <Text style={styles.colorCrushInstruction}>
        Tap ALL {balls.filter(b => b.color === targetColor).length} balls of the target color!
      </Text>

      <View style={styles.colorCrushControls}>
        {showThemeToggle && (
          <TouchableOpacity 
            onPress={onThemeToggle}
            style={[styles.colorCrushControlButton, { backgroundColor: '#6366f1' }]}
          >
            <Text style={[styles.colorCrushControlButtonText, { color: 'white' }]}>
              {theme === 'light' ? '🌙' : '☀️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  colorCrushHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorCrushTitle: {
    color: '#ff0080',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  score: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  colorCrushTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorCrushTargetText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorCrushTargetColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  colorCrushTimer: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  colorCrushTimerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  colorCrushArena: {
    width: width - 40,
    height: height - 300,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
    position: 'relative',
    marginBottom: 20,
  },
  colorCrushBall: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  colorCrushInstruction: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  colorCrushGameTime: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  colorCrushControls: {
    alignItems: 'center',
    marginTop: 20,
  },
  colorCrushControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  colorCrushControlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
