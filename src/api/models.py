from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "user"

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(120), unique=True, nullable=True)   # null si invitado
    password   = db.Column(db.String(256), nullable=True)                # null si invitado
    username   = db.Column(db.String(80), nullable=False)
    role       = db.Column(db.String(20), nullable=False, default="user")
    # roles: "guest" | "user" | "moderator" | "admin"
    is_guest   = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    requests = db.relationship("SongRequest", backref="user", lazy=True)

    def serialize(self):
        return {
            "id":       self.id,
            "username": self.username,
            "email":    self.email,
            "role":     self.role,
            "is_guest": self.is_guest,
        }


class SongRequest(db.Model):
    __tablename__ = "song_request"

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    track_id    = db.Column(db.String(100), nullable=False)
    track_uri   = db.Column(db.String(200), nullable=False)   # spotify:track:xxxx
    track_name  = db.Column(db.String(200), nullable=False)
    artist_name = db.Column(db.String(200), nullable=False)
    album_image = db.Column(db.String(500), nullable=True)

    # pending | accepted | rejected | cancelled
    status         = db.Column(db.String(20), nullable=False, default="pending")
    reject_message = db.Column(db.String(300), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def serialize(self):
        return {
            "id":             self.id,
            "user_id":        self.user_id,
            "username":       self.user.username if self.user else "?",
            "track_id":       self.track_id,
            "track_uri":      self.track_uri,
            "track_name":     self.track_name,
            "artist_name":    self.artist_name,
            "album_image":    self.album_image,
            "status":         self.status,
            "reject_message": self.reject_message,
            "created_at":     self.created_at.isoformat(),
        }


class SpotifyToken(db.Model):
    """Una sola fila: el token de Spotify del pub"""
    __tablename__ = "spotify_token"

    id            = db.Column(db.Integer, primary_key=True)
    access_token  = db.Column(db.String(500), nullable=False)
    refresh_token = db.Column(db.String(500), nullable=False)
    updated_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def serialize(self):
        return {"id": self.id, "updated_at": self.updated_at.isoformat()}