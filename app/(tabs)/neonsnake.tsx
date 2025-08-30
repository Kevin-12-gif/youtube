import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SnakeGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: 'playing' | 'paused' | 'ended';
  theme?: 'light' | 'dark';
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
}

export function SnakeGame({ 
  onScoreChange = () => {}, 
  onGameEnd = () => {},
  gameState = 'playing',
  theme = 'light',
  showThemeToggle = true,
  onThemeToggle = () => {}
}: SnakeGameProps) {
  const [score, setScore] = useState(0);
  const [snakeBody, setSnakeBody] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });

  const gameLoop = useRef<NodeJS.Timeout | null>(null);

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

  // Keyboard controls for web
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
        case 'arrowup':
          event.preventDefault();
          setDirection({ x: 0, y: -1 });
          break;
        case 's':
        case 'arrowdown':
          event.preventDefault();
          setDirection({ x: 0, y: 1 });
          break;
        case 'a':
        case 'arrowleft':
          event.preventDefault();
          setDirection({ x: -1, y: 0 });
          break;
        case 'd':
        case 'arrowright':
          event.preventDefault();
          setDirection({ x: 1, y: 0 });
          break;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gameState]);

  const getGameSpeed = () => {
    const baseSpeed = 200;
    const speedIncrease = Math.floor(score / 50) * 20;
    return Math.max(80, baseSpeed - speedIncrease);
  };

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoop.current = setInterval(() => {
        setSnakeBody(prevSnake => {
          const newSnake = [...prevSnake];
          const head = { ...newSnake[0] };
          head.x += direction.x;
          head.y += direction.y;

          const boardCols = Math.floor((width - 60) / 15);
          const boardRows = Math.floor(Math.min(height - 400, 500) / 15);
          
          if (head.x < 0 || head.x >= boardCols || head.y < 0 || head.y >= boardRows) {
            onGameEnd(score);
            return [{ x: 10, y: 10 }];
          }

          for (let segment of newSnake) {
            if (head.x === segment.x && head.y === segment.y) {
              onGameEnd(score);
              return [{ x: 10, y: 10 }];
            }
          }

          if (head.x === food.x && head.y === food.y) {
            setTimeout(() => setScore((prev: number) => prev + 10), 0);
            const boardCols = Math.floor((width - 60) / 15);
            const boardRows = Math.floor(Math.min(height - 400, 500) / 15);
            setFood({ 
              x: Math.floor(Math.random() * boardCols), 
              y: Math.floor(Math.random() * boardRows) 
            });
            newSnake.unshift(head);
          } else {
            newSnake.pop();
            newSnake.unshift(head);
          }

          return newSnake;
        });
      }, getGameSpeed());
    } else {
      if (gameLoop.current) clearInterval(gameLoop.current);
    }

    return () => {
      if (gameLoop.current) clearInterval(gameLoop.current);
    };
  }, [gameState, direction, food, score, onGameEnd]);

  const changeDirection = (newDirection: { x: number; y: number }) => {
    setDirection(newDirection);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={styles.title}>NEON SNAKE</Text>
      <Text style={styles.score}>Score: {score}</Text>
      
      <ScrollView style={styles.snakeGame} showsVerticalScrollIndicator={false}>
        <View style={[styles.gameBoard, { backgroundColor: themeColors.gameBackground }]}>
          {snakeBody.map((segment, index) => (
            <View
              key={index}
              style={[
                styles.snakeSegment,
                {
                  left: segment.x * 15,
                  top: segment.y * 15,
                  backgroundColor: index === 0 ? '#00ff00' : '#00cc00'
                }
              ]}
            />
          ))}
          <View
            style={[
              styles.food,
              {
                left: food.x * 15,
                top: food.y * 15,
              }
            ]}
          />
        </View>

        <View style={styles.controls}>
          <Text style={styles.controlsInfo}>Use WASD or Arrow Keys</Text>
          <TouchableOpacity 
            onPress={() => changeDirection({ x: 0, y: -1 })}
            style={styles.controlButton}
          >
            <Text style={styles.controlButtonText}>↑</Text>
          </TouchableOpacity>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              onPress={() => changeDirection({ x: -1, y: 0 })}
              style={styles.controlButton}
            >
              <Text style={styles.controlButtonText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => changeDirection({ x: 1, y: 0 })}
              style={styles.controlButton}
            >
              <Text style={styles.controlButtonText}>→</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            onPress={() => changeDirection({ x: 0, y: 1 })}
            style={styles.controlButton}
          >
            <Text style={styles.controlButtonText}>↓</Text>
          </TouchableOpacity>
          {showThemeToggle && (
            <TouchableOpacity 
              onPress={onThemeToggle}
              style={[styles.controlButton, { backgroundColor: '#6366f1' }]}
            >
              <Text style={[styles.controlButtonText, { color: 'white' }]}>
                {theme === 'light' ? '🌙' : '☀️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#00ff00',
    marginBottom: 10,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#00ff00',
    marginBottom: 10,
  },
  snakeGame: {
    flex: 1,
  },
  gameBoard: {
    width: width - 60,
    height: Math.min(height - 400, 500),
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 15,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#3b82f6',
    overflow: 'hidden',
  },
  snakeSegment: {
    width: 15,
    height: 15,
    position: 'absolute',
    borderRadius: 2,
  },
  food: {
    width: 15,
    height: 15,
    backgroundColor: '#ff0080',
    position: 'absolute',
    borderRadius: 7,
  },
  controls: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    marginTop: 10,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 40,
    marginVertical: 10,
  },
  controlButton: {
    width: 60,
    height: 60,
    backgroundColor: '#1a1a2e',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  controlButtonText: {
    color: '#00ffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  controlsInfo: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
});
