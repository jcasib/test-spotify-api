import React from "react";
import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch({ type: "logout" });
        navigate("/login");
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
            <Link className="navbar-brand fw-bold" to="/">🎵 Gramola</Link>

            <div className="ms-auto d-flex align-items-center gap-3">
                {store.user?.role === "moderator" || store.user?.role === "admin" ? (
                    <Link className="btn btn-outline-warning btn-sm" to="/moderator">
                        Moderador
                    </Link>
                ) : null}

                {store.user?.role === "admin" && (
                    <Link className="btn btn-outline-light btn-sm" to="/admin">
                        Admin
                    </Link>
                )}

                {store.token ? (
                    <div className="d-flex align-items-center gap-2">
                        <span className="text-light small">
                            {store.user?.is_guest ? "👤 " : ""}
                            {store.user?.username}
                        </span>
                        <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                            Salir
                        </button>
                    </div>
                ) : (
                    <Link className="btn btn-primary btn-sm" to="/login">Entrar</Link>
                )}
            </div>
        </nav>
    );
};
