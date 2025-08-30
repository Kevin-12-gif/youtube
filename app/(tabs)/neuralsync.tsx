import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface MemoryGameProps {
  onScoreChange?: (score: number) => void;
  onGameEnd?: (score: number) => void;
  gameState?: 'playing' | 'paused' | 'ended';
  theme?: 'light' | 'dark';
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
}

export function MemoryGame({ 
  onScoreChange = () => {}, 
  onGameEnd = () => {},
  gameState = 'playing',
  theme = 'light',
  showThemeToggle = true,
  onThemeToggle = () => {}
}: MemoryGameProps) {
  const [score, setScore] = useState(0);
  const [cards, setCards] = useState<Array<{id: number, symbol: string, isFlipped: boolean, isMatched: boolean}>>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [level, setLevel] = useState(1);
  const [isLevelComplete, setIsLevelComplete] = useState(false);

  const allSymbols = ['⚡', '🔮', '💎', '🌟', '⭐', '🔥', '💫', '✨', '🎯', '🎲', '🎪', '🎨', '🎭', '🎵', '🎸', '🎤'];
  const neonColors = ['#00ffff', '#ff0080', '#00ff00', '#ffff00', '#ff4000', '#8000ff', '#ff0040', '#40ff00'];

  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        background: '#0f172a',
        text: '#ffffff',
      };
    } else {
      return {
        background: '#f8fafc',
        text: '#000000',
      };
    }
  };

  const themeColors = getThemeColors();

  const getPairsForLevel = (currentLevel: number) => {
    return Math.min(8, 3 + currentLevel);
  };

  const getGridDimensions = (totalCards: number) => {
    if (totalCards <= 8) return { cols: 4, rows: 2 };
    if (totalCards <= 12) return { cols: 4, rows: 3 };
    if (totalCards <= 16) return { cols: 4, rows: 4 };
    return { cols: 4, rows: 4 };
  };

  const initializeGame = () => {
    const pairCount = getPairsForLevel(level);
    const levelSymbols = allSymbols.slice(0, pairCount);
    const gameCards = [...levelSymbols, ...levelSymbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: Date.now() + index,
        symbol,
        isFlipped: false,
        isMatched: false
      }));

    setCards(gameCards);
    setFlippedCards([]);
    setMatches(0);
    setIsLevelComplete(false);
  };

  useEffect(() => {
    initializeGame();
  }, [level]);

  useEffect(() => {
    onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      const firstCard = cards[first];
      const secondCard = cards[second];

      if (firstCard && secondCard && firstCard.symbol === secondCard.symbol) {
        setTimeout(() => {
          setCards(prev => prev.map((card, index) => 
            index === first || index === second 
              ? { ...card, isMatched: true, isFlipped: true }
              : card
          ));
          setMatches(prev => prev + 1);
          setScore((currentScore: number) => currentScore + 20);
          setFlippedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((card, index) => 
            index === first || index === second 
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    const requiredMatches = getPairsForLevel(level);
    if (matches === requiredMatches && cards.length > 0 && !isLevelComplete) {
      setIsLevelComplete(true);
      setScore((prev: number) => prev + 50);
    }
  }, [matches, level, cards.length, isLevelComplete]);

  const flipCard = (index: number) => {
    if (flippedCards.length === 2 || cards[index].isFlipped || cards[index].isMatched || gameState !== 'playing') {
      return;
    }

    setCards(prev => prev.map((card, i) => 
      i === index ? { ...card, isFlipped: true } : card
    ));
    setFlippedCards(prev => [...prev, index]);
  };

  const nextLevel = () => {
    setLevel(prev => prev + 1);
  };

  const gridDimensions = getGridDimensions(cards.length);
  const cardSize = cards.length <= 8 ? 65 : cards.length <= 12 ? 55 : 45;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.memoryHeader}>
        <Text style={[styles.memoryTitle, { color: themeColors.text }]}>
          NEURAL SYNC
        </Text>
        <Text style={styles.memoryMatches}>MATCHES: {matches}/{getPairsForLevel(level)} - LEVEL {level}</Text>
        <Text style={styles.score}>Score: {score}</Text>
      </View>

      <View style={[styles.memoryGrid, {
        width: gridDimensions.cols * (cardSize + 8),
        height: gridDimensions.rows * (cardSize + 8)
      }]}>
        {cards.map((card, index) => (
          <TouchableOpacity 
            key={card.id}
            style={[
              styles.memoryCard,
              {
                width: cardSize,
                height: cardSize,
              },
              card.isFlipped || card.isMatched ? styles.memoryCardFlipped : styles.memoryCardHidden
            ]}
            onPress={() => flipCard(index)}
            disabled={gameState !== 'playing'}
          >
            {card.isFlipped || card.isMatched ? (
              <Text style={[
                styles.memoryCardSymbol,
                { 
                  color: neonColors[allSymbols.indexOf(card.symbol) % neonColors.length],
                  fontSize: cardSize * 0.4
                }
              ]}>
                {card.symbol}
              </Text>
            ) : (
              <View style={styles.memoryCardBack}>
                <Text style={[styles.memoryCardBackSymbol, { fontSize: cardSize * 0.3 }]}>🔒</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {isLevelComplete && (
        <View style={styles.memoryWin}>
          <Text style={styles.memoryWinText}>LEVEL {level} COMPLETE!</Text>
          <TouchableOpacity 
            onPress={nextLevel}
            style={styles.memoryResetButton}
          >
            <Text style={styles.memoryResetText}>NEXT LEVEL</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.memoryControls}>
        {showThemeToggle && (
          <TouchableOpacity 
            onPress={onThemeToggle}
            style={[styles.memoryControlButton, { backgroundColor: '#6366f1' }]}
          >
            <Text style={[styles.memoryControlButtonText, { color: 'white' }]}>
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
    justifyContent: 'center',
  },
  memoryHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  memoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  memoryMatches: {
    color: '#ff0080',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  score: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  memoryCard: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    margin: 2,
  },
  memoryCardHidden: {
    backgroundColor: '#1a1a2e',
    borderColor: '#00ffff',
  },
  memoryCardFlipped: {
    backgroundColor: '#f0f9ff',
    borderColor: '#1e40af',
  },
  memoryCardSymbol: {
    fontWeight: 'bold',
  },
  memoryCardBack: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryCardBackSymbol: {
    color: '#00ffff',
    opacity: 0.6,
  },
  memoryWin: {
    position: 'absolute',
    top: '50%',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#00ff00',
    zIndex: 1000,
  },
  memoryWinText: {
    color: '#00ff00',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  memoryResetButton: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00ff00',
  },
  memoryResetText: {
    color: '#00ff00',
    fontWeight: 'bold',
  },
  memoryControls: {
    alignItems: 'center',
    marginTop: 20,
  },
  memoryControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  memoryControlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
