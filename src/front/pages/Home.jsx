import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { searchTracks, createRequest, getMyRequests, cancelRequest } from "../services/api.js";
import { io } from "socket.io-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

const STATUS_BADGE = {
    pending:   { label: "Pendiente",  cls: "bg-warning text-dark" },
    accepted:  { label: "Aceptada ✓", cls: "bg-success" },
    rejected:  { label: "Rechazada",  cls: "bg-danger" },
    cancelled: { label: "Cancelada",  cls: "bg-secondary" },
};

export const Home = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const [query, setQuery]     = useState("");
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type, text }

    // Redirigir si no hay sesión
    useEffect(() => {
        if (!store.token) navigate("/login");
    }, [store.token]);

    // Cargar mis peticiones
    useEffect(() => {
        if (store.token) {
            getMyRequests().then(data => {
                if (Array.isArray(data)) dispatch({ type: "set_my_requests", payload: data });
            });
        }
    }, [store.token]);

    // WebSocket: escuchar actualizaciones de mis peticiones
    useEffect(() => {
        if (!store.token) return;
        const socket = io(BACKEND, { namespace: "/client" });
        socket.on("request_updated", (req) => {
            dispatch({ type: "update_my_request", payload: req });
            if (req.user_id === store.user?.id) {
                setFeedback({
                    type: req.status === "accepted" ? "success" : "danger",
                    text: req.status === "accepted"
                        ? `✓ "${req.track_name}" fue aceptada y añadida a la cola`
                        : `✗ "${req.track_name}" fue rechazada${req.reject_message ? `: ${req.reject_message}` : ""}`,
                });
                setTimeout(() => setFeedback(null), 5000);
            }
        });
        return () => socket.disconnect();
    }, [store.token, store.user]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        const data = await searchTracks(query);
        setLoading(false);
        dispatch({ type: "set_search_results", payload: data?.tracks?.items || [] });
    };

    const handleRequest = async (track) => {
        const data = await createRequest(track);
        if (data.error) {
            setFeedback({ type: "danger", text: data.error });
            setTimeout(() => setFeedback(null), 4000);
            return;
        }
        dispatch({ type: "add_my_request", payload: data });
        setFeedback({ type: "info", text: `🎵 "${track.name}" enviada al moderador` });
        setTimeout(() => setFeedback(null), 4000);
    };

    const handleCancel = async (id) => {
        const data = await cancelRequest(id);
        if (data.error) return;
        dispatch({ type: "update_my_request", payload: data });
    };

    return (
        <div className="container mt-4 pb-5">

            {/* Feedback toast */}
            {feedback && (
                <div className={`alert alert-${feedback.type} alert-dismissible`} role="alert">
                    {feedback.text}
                    <button type="button" className="btn-close" onClick={() => setFeedback(null)} />
                </div>
            )}

            {/* Buscador */}
            <div className="card p-3 mb-4">
                <h5>🔍 Buscar canción</h5>
                <form onSubmit={handleSearch} className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Nombre de canción o artista..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? "..." : "Buscar"}
                    </button>
                </form>

                {store.searchResults.length > 0 && (
                    <ul className="list-group mt-3">
                        {store.searchResults.map(track => (
                            <li key={track.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    {track.album?.images?.[2] && (
                                        <img src={track.album.images[2].url} alt="" width={40} height={40} style={{ borderRadius: 4 }} />
                                    )}
                                    <div>
                                        <div className="fw-bold">{track.name}</div>
                                        <div className="text-muted small">{track.artists.map(a => a.name).join(", ")}</div>
                                    </div>
                                </div>
                                <button className="btn btn-success btn-sm" onClick={() => handleRequest(track)}>
                                    Pedir
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Mis peticiones */}
            <div className="card p-3">
                <h5>📋 Mis peticiones</h5>
                {store.myRequests.length === 0 ? (
                    <p className="text-muted mb-0">Aún no has pedido ninguna canción.</p>
                ) : (
                    <ul className="list-group">
                        {store.myRequests.map(req => {
                            const badge = STATUS_BADGE[req.status] || STATUS_BADGE.pending;
                            return (
                                <li key={req.id} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-2">
                                        {req.album_image && (
                                            <img src={req.album_image} alt="" width={40} height={40} style={{ borderRadius: 4 }} />
                                        )}
                                        <div>
                                            <div className="fw-bold">{req.track_name}</div>
                                            <div className="text-muted small">{req.artist_name}</div>
                                            {req.reject_message && (
                                                <div className="text-danger small">"{req.reject_message}"</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="d-flex flex-column align-items-end gap-1">
                                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                                        {req.status === "pending" && !store.user?.is_guest && (
                                            <button className="btn btn-outline-secondary btn-sm"
                                                onClick={() => handleCancel(req.id)}>
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};
