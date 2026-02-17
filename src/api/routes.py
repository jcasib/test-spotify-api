"""
Gramola Digital — API Routes
"""
import os
import requests
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, redirect, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from api.models import db, User, SongRequest, SpotifyToken
from api.utils import APIException
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

api = Blueprint('api', __name__)
CORS(api)

# ── Config ────────────────────────────────────────────────────────────────────
SPOTIFY_CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI  = os.getenv("SPOTIFY_REDIRECT_URI")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "http://localhost:3000")
SPOTIFY_AUTH_URL      = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL     = "https://accounts.spotify.com/api/token"
SPOTIFY_API_URL       = "https://api.spotify.com/v1"

GUEST_LIMIT_PER_HOUR  = 3
USER_LIMIT_PER_HOUR   = 10


# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

@api.route('/auth/register', methods=['POST'])
def register():
    body = request.get_json()
    email    = body.get("email", "").strip().lower()
    password = body.get("password", "")
    username = body.get("username", "").strip()

    if not email or not password or not username:
        return jsonify({"error": "email, password y username son obligatorios"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "El email ya está registrado"}), 409

    user = User(
        email=email,
        password=generate_password_hash(password),
        username=username,
        role="user",
        is_guest=False,
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.serialize()}), 201


@api.route('/auth/login', methods=['POST'])
def login():
    body = request.get_json()
    email    = body.get("email", "").strip().lower()
    password = body.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.serialize()}), 200


@api.route('/auth/guest', methods=['POST'])
def guest_login():
    body = request.get_json()
    username = body.get("username", "").strip()
    if not username:
        return jsonify({"error": "El nombre es obligatorio"}), 400

    user = User(
        username=username,
        role="guest",
        is_guest=True,
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.serialize()}), 201


@api.route('/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(user.serialize()), 200


# ══════════════════════════════════════════════════════════════════════════════
# SPOTIFY — token del pub
# ══════════════════════════════════════════════════════════════════════════════

def get_pub_token():
    record = SpotifyToken.query.first()
    if not record:
        return None
    response = requests.post(SPOTIFY_TOKEN_URL, data={
        "grant_type": "refresh_token",
        "refresh_token": record.refresh_token,
        "client_id": SPOTIFY_CLIENT_ID,
        "client_secret": SPOTIFY_CLIENT_SECRET,
    })
    data = response.json()
    new_token = data.get("access_token")
    if new_token:
        record.access_token = new_token
        record.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return new_token
    return record.access_token


@api.route('/spotify/search', methods=['GET'])
@jwt_required()
def spotify_search():
    q     = request.args.get("q", "")
    limit = request.args.get("limit", 10)
    token = get_pub_token()
    if not token:
        return jsonify({"error": "Spotify no conectado"}), 503
    response = requests.get(f"{SPOTIFY_API_URL}/search", headers={
        "Authorization": f"Bearer {token}"
    }, params={"q": q, "type": "track", "limit": limit})
    return jsonify(response.json())


# ══════════════════════════════════════════════════════════════════════════════
# PETICIONES
# ══════════════════════════════════════════════════════════════════════════════

def check_rate_limit(user):
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = SongRequest.query.filter(
        SongRequest.user_id == user.id,
        SongRequest.created_at >= one_hour_ago,
        SongRequest.status != "cancelled"
    ).count()
    limit = GUEST_LIMIT_PER_HOUR if user.is_guest else USER_LIMIT_PER_HOUR
    return recent >= limit, limit, recent


@api.route('/requests', methods=['POST'])
@jwt_required()
def create_request():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    exceeded, limit, current = check_rate_limit(user)
    if exceeded:
        return jsonify({"error": f"Has alcanzado el límite de {limit} canciones por hora"}), 429

    body = request.get_json()
    song_request = SongRequest(
        user_id=user_id,
        track_id=body.get("track_id"),
        track_uri=body.get("track_uri"),
        track_name=body.get("track_name"),
        artist_name=body.get("artist_name"),
        album_image=body.get("album_image"),
        status="pending",
    )
    db.session.add(song_request)
    db.session.commit()

    # Notificar al moderador en tiempo real
    try:
        from api.app import socketio
        socketio.emit("new_request", song_request.serialize(), namespace="/moderator")
    except Exception:
        pass

    return jsonify(song_request.serialize()), 201


@api.route('/requests/my', methods=['GET'])
@jwt_required()
def my_requests():
    user_id = int(get_jwt_identity())
    reqs = SongRequest.query.filter_by(user_id=user_id).order_by(SongRequest.created_at.desc()).limit(20).all()
    return jsonify([r.serialize() for r in reqs]), 200


@api.route('/requests/<int:req_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_request(req_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user.is_guest:
        return jsonify({"error": "Los invitados no pueden cancelar peticiones"}), 403

    req = db.session.get(SongRequest, req_id)
    if not req or req.user_id != user_id:
        return jsonify({"error": "Petición no encontrada"}), 404
    if req.status != "pending":
        return jsonify({"error": "Solo se pueden cancelar peticiones pendientes"}), 400

    req.status = "cancelled"
    db.session.commit()
    return jsonify(req.serialize()), 200


# ══════════════════════════════════════════════════════════════════════════════
# MODERACIÓN
# ══════════════════════════════════════════════════════════════════════════════

def require_mod():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or user.role not in ("moderator", "admin"):
        return None, (jsonify({"error": "Acceso denegado"}), 403)
    return user, None


@api.route('/moderator/requests', methods=['GET'])
@jwt_required()
def get_pending_requests():
    user, err = require_mod()
    if err: return err

    reqs = SongRequest.query.filter_by(status="pending").order_by(SongRequest.created_at.asc()).all()
    return jsonify([r.serialize() for r in reqs]), 200


@api.route('/moderator/requests/<int:req_id>/accept', methods=['PUT'])
@jwt_required()
def accept_request(req_id):
    user, err = require_mod()
    if err: return err

    req = db.session.get(SongRequest, req_id)
    if not req:
        return jsonify({"error": "Petición no encontrada"}), 404

    token = get_pub_token()
    if token:
        requests.post(f"{SPOTIFY_API_URL}/me/player/queue", headers={
            "Authorization": f"Bearer {token}"
        }, params={"uri": req.track_uri})

    req.status = "accepted"
    req.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    try:
        from api.app import socketio
        socketio.emit("request_updated", req.serialize(), namespace="/client")
        socketio.emit("queue_updated", req.serialize(), namespace="/public")
    except Exception:
        pass

    return jsonify(req.serialize()), 200


@api.route('/moderator/requests/<int:req_id>/reject', methods=['PUT'])
@jwt_required()
def reject_request(req_id):
    user, err = require_mod()
    if err: return err

    body = request.get_json() or {}
    req = db.session.get(SongRequest, req_id)
    if not req:
        return jsonify({"error": "Petición no encontrada"}), 404

    req.status = "rejected"
    req.reject_message = body.get("message", "")
    req.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    try:
        from api.app import socketio
        socketio.emit("request_updated", req.serialize(), namespace="/client")
    except Exception:
        pass

    return jsonify(req.serialize()), 200


# ══════════════════════════════════════════════════════════════════════════════
# COLA PÚBLICA (sin auth)
# ══════════════════════════════════════════════════════════════════════════════

@api.route('/public/now-playing', methods=['GET'])
def now_playing():
    """Canción reproduciéndose ahora mismo — sin auth"""
    token = get_pub_token()
    if not token:
        return jsonify({"playing": False, "error": "Spotify no conectado"}), 503

    response = requests.get(f"{SPOTIFY_API_URL}/me/player/currently-playing", headers={
        "Authorization": f"Bearer {token}"
    })

    if response.status_code == 204 or not response.content:
        return jsonify({"playing": False})

    data = response.json()
    track = data.get("item")
    if not track:
        return jsonify({"playing": False})

    return jsonify({
        "playing": data.get("is_playing", False),
        "track_name": track.get("name"),
        "artist_name": ", ".join(a["name"] for a in track.get("artists", [])),
        "album_image": track["album"]["images"][0]["url"] if track.get("album", {}).get("images") else None,
        "progress_ms": data.get("progress_ms", 0),
        "duration_ms": track.get("duration_ms", 0),
    })


@api.route('/public/spotify-queue', methods=['GET'])
def spotify_queue():
    """Cola real de Spotify — sin auth"""
    token = get_pub_token()
    if not token:
        return jsonify({"queue": []}), 503

    response = requests.get(f"{SPOTIFY_API_URL}/me/player/queue", headers={
        "Authorization": f"Bearer {token}"
    })

    if response.status_code != 200:
        return jsonify({"queue": []})

    data = response.json()
    queue = []
    for track in data.get("queue", [])[:15]:
        queue.append({
            "track_name": track.get("name"),
            "artist_name": ", ".join(a["name"] for a in track.get("artists", [])),
            "album_image": track["album"]["images"][1]["url"] if track.get("album", {}).get("images") else None,
        })

    return jsonify({"queue": queue})

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ══════════════════════════════════════════════════════════════════════════════

def require_admin():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or user.role != "admin":
        return None, (jsonify({"error": "Acceso denegado"}), 403)
    return user, None


@api.route('/spotify/login', methods=['GET'])
def spotify_login():

    scope = " ".join([
        "user-read-private",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
    ])
    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": scope,
    }
    auth_url = requests.Request('GET', SPOTIFY_AUTH_URL, params=params).prepare().url
    return redirect(auth_url)


@api.route('/callback', methods=['GET'])
def spotify_callback():
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "No code received"}), 400

    response = requests.post(SPOTIFY_TOKEN_URL, data={
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "client_id": SPOTIFY_CLIENT_ID,
        "client_secret": SPOTIFY_CLIENT_SECRET,
    })
    tokens = response.json()

    record = SpotifyToken.query.first()
    if record:
        record.access_token = tokens.get("access_token")
        record.refresh_token = tokens.get("refresh_token")
        record.updated_at = datetime.now(timezone.utc)
    else:
        record = SpotifyToken(
            access_token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
        )
        db.session.add(record)
    db.session.commit()

    return redirect(f"{FRONTEND_URL}/admin?spotify=connected")


@api.route('/admin/users', methods=['GET'])
@jwt_required()
def list_users():
    user, err = require_admin()
    if err: return err
    users = User.query.filter_by(is_guest=False).all()
    return jsonify([u.serialize() for u in users]), 200


@api.route('/admin/users/<int:target_id>/role', methods=['PUT'])
@jwt_required()
def set_role(target_id):
    user, err = require_admin()
    if err: return err

    body = request.get_json()
    new_role = body.get("role")
    if new_role not in ("user", "moderator"):
        return jsonify({"error": "Rol inválido"}), 400

    target = db.session.get(User, target_id)
    if not target:
        return jsonify({"error": "Usuario no encontrado"}), 404

    target.role = new_role
    db.session.commit()
    return jsonify(target.serialize()), 200


@api.route('/admin/config', methods=['GET'])
@jwt_required()
def get_config():
    user, err = require_admin()
    if err: return err
    return jsonify({
        "spotify_connected": SpotifyToken.query.first() is not None,
        "guest_limit_per_hour": GUEST_LIMIT_PER_HOUR,
        "user_limit_per_hour": USER_LIMIT_PER_HOUR,
    }), 200


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():
    return jsonify({"message": "Hello from the backend!"}), 200