
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface TwentyFortyEightGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: 'playing' | 'paused' | 'ended';
  theme?: 'light' | 'dark';
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
}

export function TwentyFortyEightGame({ 
  onScoreChange = () => {}, 
  onGameEnd = () => {},
  gameState = 'playing',
  theme = 'light',
  showThemeToggle = true,
  onThemeToggle = () => {}
}: TwentyFortyEightGameProps) {
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<number[][]>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]);
  const [isAnimating, setIsAnimating] = useState(false);

  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        background: '#0f172a',
      };
    } else {
      return {
        background: '#f8fafc',
      };
    }
  };

  const themeColors = getThemeColors();

  useEffect(() => {
    addRandomTile();
    addRandomTile();
  }, []);

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameState !== 'playing' || isAnimating) return;

      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
        case 'arrowup':
          event.preventDefault();
          moveUp();
          break;
        case 's':
        case 'arrowdown':
          event.preventDefault();
          moveDown();
          break;
        case 'a':
        case 'arrowleft':
          event.preventDefault();
          moveLeft();
          break;
        case 'd':
        case 'arrowright':
          event.preventDefault();
          moveRight();
          break;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gameState, isAnimating]);

  const addRandomTile = () => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      const emptyCells = [];

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (newGrid[i][j] === 0) {
            emptyCells.push({ row: i, col: j });
          }
        }
      }

      if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        let tileValue = 2;
        const random = Math.random();
        const difficultyBonus = score / 1000;

        if (random < 0.1 + difficultyBonus) {
          tileValue = 4;
        }
        if (random < 0.05 + difficultyBonus && score > 2000) {
          tileValue = 8;
        }
        if (random < 0.02 + difficultyBonus && score > 5000) {
          tileValue = 16;
        }

        newGrid[randomCell.row][randomCell.col] = tileValue;
      }

      return newGrid;
    });
  };

  const moveLeft = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      let moved = false;
      let points = 0;

      for (let i = 0; i < 4; i++) {
        const row = newGrid[i].filter(val => val !== 0);
        for (let j = 0; j < row.length - 1; j++) {
          if (row[j] === row[j + 1]) {
            row[j] *= 2;
            points += row[j];
            row[j + 1] = 0;
          }
        }
        const newRow = row.filter(val => val !== 0);
        while (newRow.length < 4) newRow.push(0);

        for (let j = 0; j < 4; j++) {
          if (newGrid[i][j] !== newRow[j]) moved = true;
        }
        newGrid[i] = newRow;
      }

      if (moved) {
        setTimeout(() => {
          setScore((prev: number) => prev + points);
          addRandomTile();
          setIsAnimating(false);
        }, 200);
      } else {
        setIsAnimating(false);
      }

      return newGrid;
    });
  };

  const moveRight = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      let moved = false;
      let points = 0;

      for (let i = 0; i < 4; i++) {
        const row = newGrid[i].filter(val => val !== 0);
        for (let j = row.length - 1; j > 0; j--) {
          if (row[j] === row[j - 1]) {
            row[j] *= 2;
            points += row[j];
            row[j - 1] = 0;
          }
        }
        const newRow = row.filter(val => val !== 0);
        while (newRow.length < 4) newRow.unshift(0);

        for (let j = 0; j < 4; j++) {
          if (newGrid[i][j] !== newRow[j]) moved = true;
        }
        newGrid[i] = newRow;
      }

      if (moved) {
        setTimeout(() => {
          setScore((prev: number) => prev + points);
          addRandomTile();
          setIsAnimating(false);
        }, 200);
      } else {
        setIsAnimating(false);
      }

      return newGrid;
    });
  };

  const moveUp = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      let moved = false;
      let points = 0;

      for (let j = 0; j < 4; j++) {
        const col = [];
        for (let i = 0; i < 4; i++) {
          if (newGrid[i][j] !== 0) col.push(newGrid[i][j]);
        }

        for (let i = 0; i < col.length - 1; i++) {
          if (col[i] === col[i + 1]) {
            col[i] *= 2;
            points += col[i];
            col[i + 1] = 0;
          }
        }

        const newCol = col.filter(val => val !== 0);
        while (newCol.length < 4) newCol.push(0);

        for (let i = 0; i < 4; i++) {
          if (newGrid[i][j] !== newCol[i]) moved = true;
          newGrid[i][j] = newCol[i];
        }
      }

      if (moved) {
        setTimeout(() => {
          setScore((prev: number) => prev + points);
          addRandomTile();
          setIsAnimating(false);
        }, 200);
      } else {
        setIsAnimating(false);
      }

      return newGrid;
    });
  };

  const moveDown = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      let moved = false;
      let points = 0;

      for (let j = 0; j < 4; j++) {
        const col = [];
        for (let i = 0; i < 4; i++) {
          if (newGrid[i][j] !== 0) col.push(newGrid[i][j]);
        }

        for (let i = col.length - 1; i > 0; i--) {
          if (col[i] === col[i - 1]) {
            col[i] *= 2;
            points += col[i];
            col[i - 1] = 0;
          }
        }

        const newCol = col.filter(val => val !== 0);
        while (newCol.length < 4) newCol.unshift(0);

        for (let i = 0; i < 4; i++) {
          if (newGrid[i][j] !== newCol[i]) moved = true;
          newGrid[i][j] = newCol[i];
        }
      }

      if (moved) {
        setTimeout(() => {
          setScore((prev: number) => prev + points);
          addRandomTile();
          setIsAnimating(false);
        }, 200);
      } else {
        setIsAnimating(false);
      }

      return newGrid;
    });
  };

  const getTileColor = (value: number) => {
    const colors: { [key: number]: string } = {
      2: '#00ffff',
      4: '#ff0080',
      8: '#00ff00',
      16: '#ffff00',
      32: '#ff4000',
      64: '#8000ff',
      128: '#ff0040',
      256: '#40ff00',
      512: '#0080ff',
      1024: '#ff8000',
      2048: '#ff00ff'
    };
    return colors[value] || '#ffffff';
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.game2048Header}>
        <Text style={styles.game2048Title}>NEON 2048</Text>
        <Text style={styles.score}>Score: {score}</Text>
      </View>

      <View style={styles.game2048Grid}>
        {grid.map((row, i) => (
          <View key={i} style={styles.game2048Row}>
            {row.map((value, j) => (
              <View key={j} style={[
                styles.game2048Tile,
                value !== 0 && { backgroundColor: getTileColor(value) },
                isAnimating && styles.game2048TileAnimated
              ]}>
                {value !== 0 && (
                  <Text style={[
                    styles.game2048TileText,
                    { color: value <= 4 ? '#000' : '#fff' }
                  ]}>
                    {value}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.game2048Controls}>
        <Text style={styles.controlsInfo}>Use WASD or Arrow Keys</Text>
        <TouchableOpacity onPress={moveUp} style={styles.game2048ControlButton}>
          <Text style={styles.game2048ControlText}>↑</Text>
        </TouchableOpacity>
        <View style={styles.game2048ControlRow}>
          <TouchableOpacity onPress={moveLeft} style={styles.game2048ControlButton}>
            <Text style={styles.game2048ControlText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={moveRight} style={styles.game2048ControlButton}>
            <Text style={styles.game2048ControlText}>→</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={moveDown} style={styles.game2048ControlButton}>
          <Text style={styles.game2048ControlText}>↓</Text>
        </TouchableOpacity>
        {showThemeToggle && (
          <TouchableOpacity 
            onPress={onThemeToggle}
            style={[styles.game2048ControlButton, { backgroundColor: '#6366f1' }]}
          >
            <Text style={[styles.game2048ControlText, { color: 'white' }]}>
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
  game2048Header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  game2048Title: {
    color: '#00ffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  score: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  game2048Grid: {
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginBottom: 30,
  },
  game2048Row: {
    flexDirection: 'row',
  },
  game2048Tile: {
    width: 70,
    height: 70,
    backgroundColor: '#3b82f6',
    margin: 3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  game2048TileText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  game2048Controls: {
    alignItems: 'center',
  },
  game2048ControlRow: {
    flexDirection: 'row',
    gap: 40,
    marginVertical: 10,
  },
  game2048ControlButton: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a2e',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  game2048ControlText: {
    color: '#00ffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  game2048TileAnimated: {
    transform: [{ scale: 1.05 }],
  },
  controlsInfo: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
});
