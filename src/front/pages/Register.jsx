import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { register } from "../services/api.js";

export const Register = () => {
    const { dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
    const [error, setError] = useState("");

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirm) return setError("Las contraseñas no coinciden");
        const data = await register(form.email, form.password, form.username);
        if (data.error) return setError(data.error);
        dispatch({ type: "set_auth", payload: data });
        navigate("/");
    };

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
            <div className="card p-4 shadow" style={{ width: "100%", maxWidth: 420 }}>
                <h3 className="text-center mb-4">🎵 Crear cuenta</h3>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Nombre de usuario</label>
                        <input type="text" className="form-control" name="username"
                            value={form.username} onChange={handleChange} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-control" name="email"
                            value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Contraseña</label>
                        <input type="password" className="form-control" name="password"
                            value={form.password} onChange={handleChange} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Confirmar contraseña</label>
                        <input type="password" className="form-control" name="confirm"
                            value={form.confirm} onChange={handleChange} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">Registrarse</button>
                    <p className="text-center mt-3 mb-0">
                        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};
