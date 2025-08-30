
// types.ts
export type RootStackParamList = {
  Playlist: { playlistId: string };
  Video: { videoId: string; title: string }; // ✅ Added title
};
