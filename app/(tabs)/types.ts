
export type RootStackParamList = {
  Home: undefined;
  Playlist: { title: string; playlistId: string };
  Video: { videoId: string; title: string }; // These are required
  Game: { gameUrl: string };
};
