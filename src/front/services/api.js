const BACKEND = import.meta.env.VITE_BACKEND_URL + "/api";

const authHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
});

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const register = (email, password, username) =>
    fetch(`${BACKEND}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
    }).then(r => r.json());

export const login = (email, password) =>
    fetch(`${BACKEND}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    }).then(r => r.json());

export const guestLogin = (username) =>
    fetch(`${BACKEND}/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
    }).then(r => r.json());

// ── BÚSQUEDA ──────────────────────────────────────────────────────────────────

export const searchTracks = (q) =>
    fetch(`${BACKEND}/spotify/search?q=${encodeURIComponent(q)}&limit=10`, {
        headers: authHeaders(),
    }).then(r => r.json());

// ── PETICIONES ────────────────────────────────────────────────────────────────

export const createRequest = (track) =>
    fetch(`${BACKEND}/requests`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
            track_id:    track.id,
            track_uri:   track.uri,
            track_name:  track.name,
            artist_name: track.artists.map(a => a.name).join(", "),
            album_image: track.album?.images?.[1]?.url || "",
        }),
    }).then(r => r.json());

export const getMyRequests = () =>
    fetch(`${BACKEND}/requests/my`, { headers: authHeaders() }).then(r => r.json());

export const cancelRequest = (id) =>
    fetch(`${BACKEND}/requests/${id}/cancel`, {
        method: "PUT",
        headers: authHeaders(),
    }).then(r => r.json());

// ── MODERACIÓN ────────────────────────────────────────────────────────────────

export const getPendingRequests = () =>
    fetch(`${BACKEND}/moderator/requests`, { headers: authHeaders() }).then(r => r.json());

export const acceptRequest = (id) =>
    fetch(`${BACKEND}/moderator/requests/${id}/accept`, {
        method: "PUT",
        headers: authHeaders(),
    }).then(r => r.json());

export const rejectRequest = (id, message = "") =>
    fetch(`${BACKEND}/moderator/requests/${id}/reject`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ message }),
    }).then(r => r.json());

// ── COLA PÚBLICA ──────────────────────────────────────────────────────────────

export const getPublicQueue = () =>
    fetch(`${BACKEND}/public/queue`).then(r => r.json());

// ── ADMIN ─────────────────────────────────────────────────────────────────────

export const getUsers = () =>
    fetch(`${BACKEND}/admin/users`, { headers: authHeaders() }).then(r => r.json());

export const setUserRole = (userId, role) =>
    fetch(`${BACKEND}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ role }),
    }).then(r => r.json());

export const getAdminConfig = () =>
    fetch(`${BACKEND}/admin/config`, { headers: authHeaders() }).then(r => r.json());

export const connectSpotify = () => {
    window.location.href = `${BACKEND}/spotify/login`;
};