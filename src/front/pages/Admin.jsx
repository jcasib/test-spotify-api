import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { getAdminConfig, getUsers, setUserRole, connectSpotify } from "../services/api.js";

export const Admin = () => {
    const { store } = useGlobalReducer();
    const navigate = useNavigate();

    const [config, setConfig]   = useState(null);
    const [users, setUsers]     = useState([]);
    const [feedback, setFeedback] = useState("");

    useEffect(() => {
        if (!store.token || store.user?.role !== "admin") navigate("/");
    }, [store.token]);

    useEffect(() => {
        getAdminConfig().then(data => setConfig(data));
        getUsers().then(data => { if (Array.isArray(data)) setUsers(data); });
    }, []);

    // Detectar retorno del login de Spotify
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("spotify") === "connected") {
            setFeedback("✓ Spotify conectado correctamente");
            window.history.replaceState({}, document.title, "/admin");
            getAdminConfig().then(data => setConfig(data));
        }
    }, []);

    const handleRoleChange = async (userId, role) => {
        const data = await setUserRole(userId, role);
        if (data.error) return;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        setFeedback(`✓ Rol actualizado para ${data.username}`);
        setTimeout(() => setFeedback(""), 3000);
    };

    return (
        <div className="container mt-4">
            <h3 className="mb-4">⚙️ Panel de administración</h3>

            {feedback && <div className="alert alert-success py-2">{feedback}</div>}

            {/* Estado Spotify */}
            <div className="card p-3 mb-4">
                <h5>Spotify del pub</h5>
                {config ? (
                    config.spotify_connected ? (
                        <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-success fs-6">✓ Conectado</span>
                            <button className="btn btn-outline-secondary btn-sm" onClick={connectSpotify}>
                                Reconectar
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-danger mb-2">⚠️ Spotify no conectado. Los clientes no podrán buscar ni reproducir música.</p>
                            <button className="btn btn-success" onClick={connectSpotify}>
                                Conectar Spotify
                            </button>
                        </div>
                    )
                ) : (
                    <p className="text-muted">Cargando...</p>
                )}

                {config && (
                    <div className="mt-3 small text-muted">
                        Límite invitados: <strong>{config.guest_limit_per_hour}</strong> canciones/hora ·
                        Límite usuarios: <strong>{config.user_limit_per_hour}</strong> canciones/hora
                    </div>
                )}
            </div>

            {/* Gestión de usuarios */}
            <div className="card p-3">
                <h5>Usuarios registrados</h5>
                {users.length === 0 ? (
                    <p className="text-muted">No hay usuarios registrados todavía.</p>
                ) : (
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Cambiar rol</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>{u.username}</td>
                                    <td className="text-muted small">{u.email}</td>
                                    <td>
                                        <span className={`badge ${u.role === "admin" ? "bg-dark" : u.role === "moderator" ? "bg-warning text-dark" : "bg-secondary"}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        {u.role !== "admin" && (
                                            <select
                                                className="form-select form-select-sm"
                                                style={{ width: 140 }}
                                                value={u.role}
                                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                            >
                                                <option value="user">user</option>
                                                <option value="moderator">moderator</option>
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
