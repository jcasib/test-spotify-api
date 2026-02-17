import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

const fetchNowPlaying = () =>
    fetch(`${BACKEND}/api/public/now-playing`).then(r => r.json()).catch(() => null);

const fetchSpotifyQueue = () =>
    fetch(`${BACKEND}/api/public/spotify-queue`).then(r => r.json()).catch(() => ({ queue: [] }));

const formatTime = (ms) => {
    if (!ms) return "0:00";
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
};

export const PublicScreen = () => {
    const [nowPlaying, setNowPlaying] = useState(null);
    const [queue, setQueue]           = useState([]);
    const [progress, setProgress]     = useState(0);
    const progressRef                 = useRef(0);

    // Polling canción actual + cola real cada 5 segundos
    useEffect(() => {
        const poll = async () => {
            const [npData, qData] = await Promise.all([
                fetchNowPlaying(),
                fetchSpotifyQueue(),
            ]);

            if (npData && npData.playing) {
                setNowPlaying(npData);
                progressRef.current = npData.progress_ms;
                setProgress(npData.progress_ms);
            } else {
                setNowPlaying(null);
            }

            setQueue(qData?.queue || []);
        };

        poll();
        const id = setInterval(poll, 5000);
        return () => clearInterval(id);
    }, []);

    // Barra de progreso avanza cada segundo entre polls
    useEffect(() => {
        const id = setInterval(() => {
            if (nowPlaying?.playing) {
                progressRef.current = Math.min(progressRef.current + 1000, nowPlaying.duration_ms);
                setProgress(progressRef.current);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [nowPlaying]);

    const progressPct = nowPlaying?.duration_ms
        ? Math.min((progress / nowPlaying.duration_ms) * 100, 100)
        : 0;

    return (
        <div style={{
            background: "#121212",
            minHeight: "100vh",
            color: "#fff",
            fontFamily: "'Segoe UI', sans-serif",
            padding: "2.5rem",
        }}>

            {/* ── CANCIÓN ACTUAL ── */}
            <div style={{ maxWidth: 800, margin: "0 auto 3rem" }}>
                <div style={{
                    color: "#1DB954", fontWeight: 700, fontSize: "0.9rem",
                    letterSpacing: 2, marginBottom: "1rem", textTransform: "uppercase"
                }}>
                    🎵 Sonando ahora
                </div>

                {nowPlaying ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                        {nowPlaying.album_image && (
                            <img
                                src={nowPlaying.album_image}
                                alt="cover"
                                style={{
                                    width: 130, height: 130, borderRadius: 12,
                                    boxShadow: "0 8px 32px rgba(29,185,84,0.3)"
                                }}
                            />
                        )}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
                                {nowPlaying.track_name}
                            </div>
                            <div style={{ color: "#aaa", fontSize: "1.2rem", marginTop: "0.3rem" }}>
                                {nowPlaying.artist_name}
                            </div>

                            {/* Barra de progreso */}
                            <div style={{ marginTop: "1.2rem" }}>
                                <div style={{ background: "#333", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                    <div style={{
                                        width: `${progressPct}%`, height: "100%",
                                        background: "#1DB954", transition: "width 1s linear"
                                    }} />
                                </div>
                                <div style={{
                                    display: "flex", justifyContent: "space-between",
                                    marginTop: "0.3rem", color: "#888", fontSize: "0.85rem"
                                }}>
                                    <span>{formatTime(progress)}</span>
                                    <span>{formatTime(nowPlaying.duration_ms)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: "#555", fontSize: "1.2rem" }}>
                        Sin reproducción activa...
                    </div>
                )}
            </div>

            {/* ── COLA REAL DE SPOTIFY ── */}
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <div style={{
                    color: "#1DB954", fontWeight: 700, fontSize: "0.9rem",
                    letterSpacing: 2, marginBottom: "1rem", textTransform: "uppercase"
                }}>
                    📋 A continuación
                </div>

                {queue.length === 0 ? (
                    <div style={{
                        color: "#555", fontSize: "1.1rem",
                        padding: "1rem 0", fontStyle: "italic"
                    }}>
                        🎲 Sonando lista automática
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {queue.map((track, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: "1rem",
                                padding: "0.7rem 1rem", borderRadius: 10,
                                background: i === 0 ? "#1a3a23" : "#1e1e1e",
                                borderLeft: i === 0 ? "3px solid #1DB954" : "3px solid transparent",
                            }}>
                                <span style={{ color: "#555", fontWeight: 700, width: 24, textAlign: "center" }}>
                                    {i + 1}
                                </span>
                                {track.album_image && (
                                    <img src={track.album_image} alt="" width={48} height={48} style={{ borderRadius: 6 }} />
                                )}
                                <div>
                                    <div style={{ fontWeight: 600 }}>{track.track_name}</div>
                                    <div style={{ color: "#aaa", fontSize: "0.9rem" }}>{track.artist_name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};
