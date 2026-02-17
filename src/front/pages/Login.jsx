import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { login, guestLogin } from "../services/api.js";

export const Login = () => {
    const { dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [guest, setGuest]       = useState("");
    const [error, setError]       = useState("");
    const [tab, setTab]           = useState("login"); // "login" | "guest"

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        const data = await login(email, password);
        if (data.error) return setError(data.error);
        dispatch({ type: "set_auth", payload: data });
        navigate("/");
    };

    const handleGuest = async (e) => {
        e.preventDefault();
        setError("");
        if (!guest.trim()) return setError("Escribe un nombre");
        const data = await guestLogin(guest.trim());
        if (data.error) return setError(data.error);
        dispatch({ type: "set_auth", payload: data });
        navigate("/");
    };

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
            <div className="card p-4 shadow" style={{ width: "100%", maxWidth: 420 }}>
                <h3 className="text-center mb-4">🎵 Gramola</h3>

                {/* Tabs */}
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <button className={`nav-link ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>
                            Iniciar sesión
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${tab === "guest" ? "active" : ""}`} onClick={() => setTab("guest")}>
                            Entrar como invitado
                        </button>
                    </li>
                </ul>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                {tab === "login" ? (
                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control" value={email}
                                onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Contraseña</label>
                            <input type="password" className="form-control" value={password}
                                onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary w-100">Entrar</button>
                        <p className="text-center mt-3 mb-0">
                            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleGuest}>
                        <div className="mb-3">
                            <label className="form-label">Tu nombre (temporal)</label>
                            <input type="text" className="form-control" placeholder="ej: Carlos"
                                value={guest} onChange={e => setGuest(e.target.value)} required />
                        </div>
                        <p className="text-muted small">
                            Como invitado puedes pedir hasta 3 canciones por hora.
                        </p>
                        <button type="submit" className="btn btn-success w-100">Entrar sin registro</button>
                    </form>
                )}
            </div>
        </div>
    );
};
