import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface PongGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: 'playing' | 'paused' | 'ended';
  theme?: 'light' | 'dark';
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
}

export function PongGame({ 
  onScoreChange = () => {}, 
  onGameEnd = () => {},
  gameState = 'playing',
  theme = 'light',
  showThemeToggle = true,
  onThemeToggle = () => {}
}: PongGameProps) {
  const [score, setScore] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 150, y: 150 });
  const [ballVelocity, setBallVelocity] = useState({ x: 3, y: 3 });
  const [leftPaddleY, setLeftPaddleY] = useState(120);
  const [rightPaddleY, setRightPaddleY] = useState(120);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [paddleMovement, setPaddleMovement] = useState<'up' | 'down' | null>(null);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
        case 'arrowup':
          event.preventDefault();
          setPaddleMovement('up');
          break;
        case 's':
        case 'arrowdown':
          event.preventDefault();
          setPaddleMovement('down');
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'w' || key === 'arrowup' || key === 's' || key === 'arrowdown') {
        event.preventDefault();
        setPaddleMovement(null);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [gameState]);

  const getAISpeed = () => {
    const baseSpeed = 2;
    return Math.min(6, baseSpeed + (score / 20));
  };

  const gameAreaWidth = width - 40;
  const gameAreaHeight = height - 300;
  const paddleHeight = 60;
  const paddleWidth = 8;
  const ballSize = 8;

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        setBallPosition(prevPos => {
          let newX = prevPos.x + ballVelocity.x;
          let newY = prevPos.y + ballVelocity.y;
          let newVelX = ballVelocity.x;
          let newVelY = ballVelocity.y;

          if (newY <= 0 || newY >= gameAreaHeight - ballSize) {
            newVelY = -newVelY;
            newY = newY <= 0 ? 0 : gameAreaHeight - ballSize;
          }

          if (newX <= paddleWidth && 
              newY >= leftPaddleY && 
              newY <= leftPaddleY + paddleHeight) {
            newVelX = Math.abs(newVelX) * 1.05;
            newVelY = newVelY * 1.05;
            newX = paddleWidth;
          }

          if (newX >= gameAreaWidth - paddleWidth - ballSize && 
              newY >= rightPaddleY && 
              newY <= rightPaddleY + paddleHeight) {
            newVelX = -Math.abs(newVelX) * 1.05;
            newVelY = newVelY * 1.05;
            newX = gameAreaWidth - paddleWidth - ballSize;
          }

          if (newX < 0) {
            setAiScore(prev => prev + 1);
            newX = gameAreaWidth / 2;
            newY = gameAreaHeight / 2;
            newVelX = 3;
            newVelY = (Math.random() * 4 - 2);
          } else if (newX > gameAreaWidth) {
            setPlayerScore(prev => prev + 1);
            setTimeout(() => setScore((currentScore: number) => currentScore + 10), 0);
            newX = gameAreaWidth / 2;
            newY = gameAreaHeight / 2;
            newVelX = -3;
            newVelY = (Math.random() * 4 - 2);
          }

          setBallVelocity({ x: newVelX, y: newVelY });
          return { x: newX, y: newY };
        });

        if (paddleMovement === 'up') {
          setLeftPaddleY(prevY => Math.max(0, prevY - 4));
        } else if (paddleMovement === 'down') {
          setLeftPaddleY(prevY => Math.min(gameAreaHeight - paddleHeight, prevY + 4));
        }

        setRightPaddleY(prevY => {
          const targetY = ballPosition.y - paddleHeight / 2;
          const speed = getAISpeed();

          const accuracy = 0.85;
          const randomOffset = (Math.random() - 0.5) * 20 * (1 - accuracy);
          const adjustedTargetY = targetY + randomOffset;
          const adjustedDiff = adjustedTargetY - prevY;

          let newY = prevY + Math.sign(adjustedDiff) * Math.min(Math.abs(adjustedDiff), speed);
          newY = Math.max(0, Math.min(gameAreaHeight - paddleHeight, newY));
          return newY;
        });
      }, 16);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, ballVelocity, ballPosition, leftPaddleY, rightPaddleY, score]);

  const startPaddleMovement = (direction: 'up' | 'down') => {
    setPaddleMovement(direction);
  };

  const stopPaddleMovement = () => {
    setPaddleMovement(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={styles.title}>NEON PONG</Text>
      
      <View style={styles.pongScoreBoard}>
        <Text style={styles.pongScore}>PLAYER: {playerScore}</Text>
        <Text style={styles.pongScore}>AI: {aiScore}</Text>
      </View>

      <View style={[styles.pongCourt, { backgroundColor: themeColors.gameBackground }]}>
        <View style={styles.centerLine} />
        <View style={[styles.paddle, { left: 0, top: leftPaddleY, backgroundColor: '#00ffff' }]} />
        <View style={[styles.paddle, { right: 0, top: rightPaddleY, backgroundColor: '#00ffff' }]} />
        <View style={[styles.pongBall, { 
          left: ballPosition.x, 
          top: ballPosition.y 
        }]} />
      </View>

      <View style={styles.pongControls}>
        <Text style={styles.controlsInfo}>Use W/S or ↑/↓ Keys</Text>
        <TouchableOpacity 
          onPressIn={() => startPaddleMovement('up')}
          onPressOut={stopPaddleMovement}
          style={styles.pongControlButton}
        >
          <Text style={styles.pongControlButtonText}>↑</Text>
        </TouchableOpacity>
        <View style={styles.controlRow}>
          <TouchableOpacity 
            onPressIn={() => startPaddleMovement('down')}
            onPressOut={stopPaddleMovement}
            style={styles.pongControlButton}
          >
            <Text style={styles.pongControlButtonText}>↓</Text>
          </TouchableOpacity>
          {showThemeToggle && (
            <TouchableOpacity 
              onPress={onThemeToggle}
              style={[styles.pongControlButton, { backgroundColor: '#6366f1' }]}
            >
              <Text style={[styles.pongControlButtonText, { color: 'white' }]}>
                {theme === 'light' ? '🌙' : '☀️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: 20,
  },
  pongScoreBoard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  pongScore: {
    color: '#1e3a8a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pongCourt: {
    width: width - 40,
    height: height - 250,
    borderRadius: 10,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginBottom: 40,
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#00ffff',
    opacity: 0.3,
  },
  paddle: {
    position: 'absolute',
    width: 8,
    height: 60,
    backgroundColor: '#1e3a8a',
    borderRadius: 4,
  },
  pongBall: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#ff0080',
    borderRadius: 4,
  },
  pongControls: {
    flexDirection: 'row',
    gap: 30,
  },
  pongControlButton: {
    width: 60,
    height: 60,
    backgroundColor: '#1a1a2e',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  pongControlButtonText: {
    color: '#00ffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  controlsInfo: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
});
