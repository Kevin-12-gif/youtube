import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface BugSwatGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: 'playing' | 'paused' | 'ended';
  theme?: 'light' | 'dark';
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
}

export function BugSwatGame({ 
  onScoreChange = () => {}, 
  onGameEnd = () => {},
  gameState = 'playing',
  theme = 'light',
  showThemeToggle = true,
  onThemeToggle = () => {}
}: BugSwatGameProps) {
  const [score, setScore] = useState(0);
  const [bugs, setBugs] = useState<Array<{
    id: number;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    speed: number;
    type: string;
    direction: { x: number; y: number };
  }>>([]);
  const [plantHealth, setPlantHealth] = useState(100);
  const [wave, setWave] = useState(1);
  const [gameTime, setGameTime] = useState(0);

  const bugTypes = ['🐛', '🐜', '🦗', '🪲', '🕷️', '🦟', '🪰', '🐝'];
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<NodeJS.Timeout | null>(null);

  const fieldWidth = width - 40;
  const fieldHeight = height - 200;
  const plantX = fieldWidth / 2;
  const plantY = fieldHeight / 2;

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
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    if (plantHealth <= 0) {
      onGameEnd(score);
    }
  }, [plantHealth, score, onGameEnd]);

  const getSpawnRate = () => {
    const baseRate = 1600;
    const decrease = Math.floor(gameTime / 12) * 80;
    return Math.max(400, baseRate - decrease);
  };

  const getBugSpeed = () => {
    const baseSpeed = 1.2;
    const speedIncrease = Math.floor(gameTime / 20) * 0.4;

    const speedVariations = [0.6, 0.9, 1.2, 1.5, 1.8];
    const randomSpeed = speedVariations[Math.floor(Math.random() * speedVariations.length)];
    return (baseSpeed + speedIncrease) * randomSpeed;
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timeRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timeRef.current) clearInterval(timeRef.current);
    }

    return () => {
      if (timeRef.current) clearInterval(timeRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      spawnBugs();
    } else {
      if (spawnRef.current) clearInterval(spawnRef.current);
    }
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [gameState, gameTime]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        setBugs(prevBugs => {
          const newBugs = prevBugs.map(bug => {
            const newX = bug.x + bug.direction.x * bug.speed;
            const newY = bug.y + bug.direction.y * bug.speed;

            return {
              ...bug,
              x: newX,
              y: newY
            };
          }).filter(bug => {
            const distanceToPlant = Math.sqrt(
              Math.pow(bug.x - plantX, 2) + Math.pow(bug.y - plantY, 2)
            );

            if (distanceToPlant < 25) {
              setPlantHealth(prev => Math.max(0, prev - 15));
              return false;
            }

            const fieldWidth = width - 40;
            const fieldHeight = height - 200;
            return bug.x > -30 && bug.x < fieldWidth + 30 && bug.y > -30 && bug.y < fieldHeight + 30;
          });

          return newBugs;
        });
      }, 50);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState]);

  const spawnBugs = () => {
    if (spawnRef.current) clearInterval(spawnRef.current);

    setTimeout(() => spawnSingleBug(), 200);

    const spawnInterval = () => {
      spawnRef.current = setInterval(() => {
        if (gameState === 'playing') {
          const currentRate = getSpawnRate();
          const shouldSpawnMultiple = gameTime > 40 && Math.random() < 0.3;
          const shouldSpawnTriple = gameTime > 90 && Math.random() < 0.2;

          spawnSingleBug();

          if (shouldSpawnMultiple) {
            setTimeout(() => spawnSingleBug(), currentRate / 2);
          }

          if (shouldSpawnTriple) {
            setTimeout(() => spawnSingleBug(), currentRate / 1.5);
          }
        }
      }, getSpawnRate());
    };

    spawnInterval();
  };

  const spawnSingleBug = () => {
    const side = Math.floor(Math.random() * 4);
    let startX, startY;

    const fieldWidth = width - 40;
    const fieldHeight = height - 300;

    switch (side) {
      case 0:
        startX = Math.random() * fieldWidth;
        startY = -30;
        break;
      case 1:
        startX = fieldWidth + 30;
        startY = Math.random() * fieldHeight;
        break;
      case 2:
        startX = Math.random() * fieldWidth;
        startY = fieldHeight + 30;
        break;
      case 3:
        startX = -30;
        startY = Math.random() * fieldHeight;
        break;
      default:
        startX = Math.random() * fieldWidth;
        startY = -30;
    }

    const dx = plantX - startX;
    const dy = plantY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const directionX = dx / distance;
    const directionY = dy / distance;

    const speed = getBugSpeed();

    let bugType;
    if (speed < 0.8) {
      bugType = ['🐛', '🐜'][Math.floor(Math.random() * 2)];
    } else if (speed < 1.2) {
      bugType = ['🦗', '🪲'][Math.floor(Math.random() * 2)];
    } else if (speed < 1.5) {
      bugType = ['🕷️', '🦟'][Math.floor(Math.random() * 2)];
    } else {
      bugType = ['🪰', '🐝'][Math.floor(Math.random() * 2)];
    }

    const newBug = {
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      targetX: plantX,
      targetY: plantY,
      speed: speed,
      direction: { x: directionX, y: directionY },
      type: bugType
    };

    setBugs(prevBugs => [...prevBugs, newBug]);
  };

  const swatBug = (bugId: number) => {
    setBugs(prevBugs => prevBugs.filter(bug => bug.id !== bugId));
    setScore((prev: number) => prev + 15);

    if (score > 0 && score % 300 === 0) {
      setWave(prev => prev + 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.bugSwatHeader}>
        <Text style={styles.bugSwatTitle}>BUG SWAT DEFENSE</Text>
        <Text style={styles.score}>Score: {score}</Text>
        <View style={styles.bugSwatStats}>
          <Text style={styles.bugSwatStat}>Plant Health: {plantHealth}%</Text>
          <Text style={styles.bugSwatStat}>Wave: {wave}</Text>
          <Text style={styles.bugSwatStat}>Time: {gameTime}s</Text>
        </View>
      </View>

      <View style={[styles.bugSwatField, { backgroundColor: themeColors.gameBackground }]}>
        {bugs.map(bug => (
          <TouchableOpacity
            key={bug.id}
            style={[
              styles.bug,
              {
                left: bug.x,
                top: bug.y
              }
            ]}
            onPress={() => swatBug(bug.id)}
          >
            <Text style={styles.bugIcon}>{bug.type}</Text>
          </TouchableOpacity>
        ))}

        <View style={[styles.plant, { left: plantX - 25, top: plantY - 25 }]}>
          <View style={styles.plantDrawing}>
            <View style={styles.plantPot} />
            <View style={styles.plantSoil} />
            <View style={styles.plantStem} />
            <View style={[styles.plantLeaf, styles.plantLeafLeft]} />
            <View style={[styles.plantLeaf, styles.plantLeafRight]} />
            <View style={[styles.plantLeaf, styles.plantLeafTop]} />
          </View>
          <View style={styles.healthBar}>
            <View style={[
              styles.healthBarFill, 
              { 
                width: `${plantHealth}%`,
                backgroundColor: plantHealth > 50 ? '#00ff00' : plantHealth > 25 ? '#ffff00' : '#ff0000'
              }
            ]} />
          </View>
        </View>
      </View>

      <Text style={styles.bugSwatInstruction}>Defend the center plant from all directions!</Text>

      <View style={styles.bugSwatControls}>
        {showThemeToggle && (
          <TouchableOpacity 
            onPress={onThemeToggle}
            style={[styles.bugSwatControlButton, { backgroundColor: '#6366f1' }]}
          >
            <Text style={[styles.bugSwatControlButtonText, { color: 'white' }]}>
              {theme === 'light' ? '🌙' : '☀️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {plantHealth <= 0 && (
        <View style={styles.bugSwatGameOver}>
          <Text style={styles.bugSwatGameOverText}>PLANT DESTROYED!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  bugSwatHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bugSwatTitle: {
    color: '#14532d',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  score: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bugSwatStats: {
    flexDirection: 'row',
    gap: 20,
  },
  bugSwatStat: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bugSwatField: {
    width: width - 40,
    height: height - 300,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#3b82f6',
    position: 'relative',
    marginBottom: 20,
  },
  bug: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bugIcon: {
    fontSize: 24,
  },
  plant: {
    position: 'absolute',
    alignItems: 'center',
    width: 50,
    height: 50,
  },
  plantDrawing: {
    position: 'relative',
    width: 40,
    height: 35,
    alignItems: 'center',
    marginBottom: 5,
  },
  plantPot: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 12,
    backgroundColor: '#8B4513',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#654321',
  },
  plantSoil: {
    position: 'absolute',
    bottom: 8,
    width: 16,
    height: 4,
    backgroundColor: '#654321',
    borderRadius: 2,
  },
  plantStem: {
    position: 'absolute',
    bottom: 12,
    width: 3,
    height: 15,
    backgroundColor: '#228B22',
    borderRadius: 1.5,
  },
  plantLeaf: {
    position: 'absolute',
    width: 8,
    height: 12,
    backgroundColor: '#32CD32',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  plantLeafLeft: {
    bottom: 20,
    left: 8,
    transform: [{ rotate: '-30deg' }],
  },
  plantLeafRight: {
    bottom: 20,
    right: 8,
    transform: [{ rotate: '30deg' }],
  },
  plantLeafTop: {
    bottom: 25,
    transform: [{ rotate: '0deg' }],
  },
  healthBar: {
    width: 50,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  bugSwatInstruction: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  bugSwatGameOver: {
    position: 'absolute',
    top: '50%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.9)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ff0000',
  },
  bugSwatGameOverText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bugSwatControls: {
    alignItems: 'center',
    marginTop: 20,
  },
  bugSwatControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  bugSwatControlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
