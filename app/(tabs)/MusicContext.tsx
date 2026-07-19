import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

type TrackName = 'Main' | 'CosmicStriker' | 'DrawPad' | 'Snake' | 'Pong' | 'MemoryMatch' | 'Game2048';

interface MusicContextType {
  currentTrack: TrackName | null;
  setTrack: (track: TrackName | null) => Promise<void>;
  isMuted: boolean;
  toggleMute: () => void;
}

const MusicContext = createContext<MusicContextType>({
  currentTrack: null,
  setTrack: async () => {},
  isMuted: false,
  toggleMute: () => {},
});

const TRACKS: Record<TrackName, any> = {
  Main: require('../../assets/audio/Main.mp3'),
  CosmicStriker: require('../../assets/audio/CosmicStriker.mp3'),
  DrawPad: require('../../assets/audio/DrawPad.mp3'),
  Snake: require('../../assets/audio/Snake.mp3'),
  Pong: require('../../assets/audio/Pong.mp3'),
  MemoryMatch: require('../../assets/audio/MemoryMatch.mp3'),
  Game2048: require('../../assets/audio/2048.mp3'),
};

export const MusicProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<TrackName | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isLoading = useRef(false);

  const setTrack = async (trackName: TrackName | null) => {
    if (currentTrack === trackName || isLoading.current) return;

    isLoading.current = true;

    // Stop and unload previous sound if any
    if (soundRef.current) {
      try {
        const currentSound = soundRef.current;
        soundRef.current = null; // Clear immediately
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (error) {
        // Ignore errors during unloading
      }
    }

    setCurrentTrack(trackName);

    if (trackName) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          TRACKS[trackName],
          {
            shouldPlay: !isMuted,
            isLooping: true,
            volume: 0.4
          }
        );
        soundRef.current = sound;
      } catch (error) {
        console.error(`Error loading track ${trackName}:`, error);
      }
    }

    isLoading.current = false;
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  useEffect(() => {
    if (soundRef.current) {
      if (isMuted) {
        soundRef.current.pauseAsync().catch(() => {});
      } else if (currentTrack) {
        soundRef.current.playAsync().catch(() => {});
      }
    }
  }, [isMuted, currentTrack]);

  useEffect(() => {
    // Configure audio mode for the app
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <MusicContext.Provider value={{ currentTrack, setTrack, isMuted, toggleMute }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
