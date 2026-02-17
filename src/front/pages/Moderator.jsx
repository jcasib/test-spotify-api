import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { getPendingRequests, acceptRequest, rejectRequest } from "../services/api.js";
import { io } from "socket.io-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

export const Moderator = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const [rejectMsg, setRejectMsg] = useState({});    // { [id]: mensaje }
    const [showReject, setShowReject] = useState({});  // { [id]: bool }

    useEffect(() => {
        if (!store.token || !["moderator", "admin"].includes(store.user?.role)) {
            navigate("/");
        }
    }, [store.token]);

    // Cargar peticiones pendientes al entrar
    useEffect(() => {
        getPendingRequests().then(data => {
            if (Array.isArray(data)) dispatch({ type: "set_pending_requests", payload: data });
        });
    }, []);

    // WebSocket: escuchar nuevas peticiones en tiempo real
    useEffect(() => {
        const socket = io(BACKEND, { namespace: "/moderator" });
        socket.on("new_request", (req) => {
            dispatch({ type: "add_pending_request", payload: req });
        });
        return () => socket.disconnect();
    }, []);

    const handleAccept = async (id) => {
        await acceptRequest(id);
        dispatch({ type: "remove_pending_request", payload: id });
    };

    const handleReject = async (id) => {
        await rejectRequest(id, rejectMsg[id] || "");
        dispatch({ type: "remove_pending_request", payload: id });
        setShowReject(prev => ({ ...prev, [id]: false }));
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>🎛️ Panel del moderador</h3>
                <span className="badge bg-primary fs-6">{store.pendingRequests.length} pendientes</span>
            </div>

            {store.pendingRequests.length === 0 ? (
                <div className="alert alert-info">No hay peticiones pendientes.</div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {store.pendingRequests.map(req => (
                        <div key={req.id} className="card p-3 shadow-sm">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                {req.album_image && (
                                    <img src={req.album_image} alt="" width={56} height={56} style={{ borderRadius: 6 }} />
                                )}
                                <div className="flex-grow-1">
                                    <div className="fw-bold fs-5">{req.track_name}</div>
                                    <div className="text-muted">{req.artist_name}</div>
                                    <div className="small text-secondary">Pedida por: <strong>{req.username}</strong></div>
                                </div>
                            </div>

                            {/* Botones aceptar / rechazar */}
                            {!showReject[req.id] ? (
                                <div className="d-flex gap-2">
                                    <button className="btn btn-success flex-grow-1"
                                        onClick={() => handleAccept(req.id)}>
                                        ✓ Aceptar
                                    </button>
                                    <button className="btn btn-outline-danger flex-grow-1"
                                        onClick={() => setShowReject(prev => ({ ...prev, [req.id]: true }))}>
                                        ✗ Rechazar
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        type="text"
                                        className="form-control mb-2"
                                        placeholder="Motivo del rechazo (opcional)"
                                        value={rejectMsg[req.id] || ""}
                                        onChange={e => setRejectMsg(prev => ({ ...prev, [req.id]: e.target.value }))}
                                    />
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-danger flex-grow-1"
                                            onClick={() => handleReject(req.id)}>
                                            Confirmar rechazo
                                        </button>
                                        <button className="btn btn-outline-secondary"
                                            onClick={() => setShowReject(prev => ({ ...prev, [req.id]: false }))}>
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
