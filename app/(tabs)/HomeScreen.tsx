import React, { useEffect, useState } from "react";

const API_KEY = "AIzaSyD1QZ4sjHOqFE40096MDCKEw1Kum6k2ZhU";
const CHANNEL_ID = "UCtlxqyUjGz31UItA-eQJDNg";

const CUSTOM_CHANNEL_ICON = "https://i.imgur.com/kUP7JIq.png";
const CUSTOM_CHANNEL_TITLE = "PlayTime!";
const SNAKE_GAME_ICON = "https://i.imgur.com/snake-icon.png"; // Replace with actual

export default function HomeScreen() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${CHANNEL_ID}&maxResults=10&key=${API_KEY}`
        );
        const data = await res.json();
        setPlaylists(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        console.error(err);
        setPlaylists([]);
      } finally {
        setLoadingYouTube(false);
      }
    };
    fetchPlaylists();
  }, []);

  if (loadingYouTube) {
    return <p style={{ marginTop: 50 }}>Loading...</p>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img
            src={CUSTOM_CHANNEL_ICON}
            alt="channel"
            style={styles.channelLogo}
          />
          <h1 style={styles.headerTitle}>{CUSTOM_CHANNEL_TITLE}</h1>
        </div>
      </header>

      {/* Playlists */}
      <h2 style={styles.sectionTitle}>Playlists</h2>
      <div style={styles.rowWrapper}>
        {playlists.map((playlist) => (
          <div key={playlist.id} style={styles.item}>
            <a
              href={`https://www.youtube.com/playlist?list=${playlist.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={playlist.snippet.thumbnails.medium.url}
                alt={playlist.snippet.title}
                style={styles.itemImage}
              />
            </a>
            <p style={styles.itemName}>{playlist.snippet.title}</p>
          </div>
        ))}
      </div>

      {/* Games */}
      <h2 style={styles.sectionTitle}>Games</h2>
      <div style={styles.rowWrapper}>
        {/* Snake Game */}
        <div style={styles.item}>
          <a href="/snake" style={styles.itemCircle}>
            <img src={SNAKE_GAME_ICON} alt="Snake Game" style={styles.itemImage} />
          </a>
          <p style={styles.itemName}>Snake Game</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    fontFamily: "sans-serif",
    background: "#111",
    color: "#fff",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "30px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
  },
  channelLogo: {
    width: "50px",
    height: "50px",
    borderRadius: "8px",
    marginRight: "15px",
  },
  headerTitle: {
    fontSize: "28px",
    color: "#00AEEF",
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    marginTop: "40px",
    marginBottom: "20px",
    textAlign: "center",
    background: "#00AEEF",
    borderRadius: "8px",
    padding: "6px 12px",
  },
  rowWrapper: {
    display: "flex",
    gap: "20px",
    overflowX: "auto",
    paddingBottom: "10px",
  },
  item: {
    minWidth: "120px",
    textAlign: "center",
  },
  itemCircle: {
    display: "block",
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    overflow: "hidden",
    border: "4px solid #00AEEF",
    backgroundColor: "#222",
  },
  itemImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  itemName: {
    marginTop: "8px",
    fontSize: "14px",
  },
};
