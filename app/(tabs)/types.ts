// types.ts
export type RootStackParamList = {
  Home: undefined;
  Playlist: { playlistId: string; title: string };
  Video: { videoId: string; title: string };
  Game2048: undefined;
  Snake: undefined;
  MemoryMatch: undefined;
  CanvasGame: undefined;
  Pong: undefined;
  CosmicStriker: undefined;
};
