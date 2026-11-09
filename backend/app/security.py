import hashlib

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

GUEST_NAME = "Гость"
# Not a SHA-256 hex digest, so no API key can ever match the guest account.
GUEST_KEY_HASH = "guest-without-api-key"


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def _get_or_create_guest(db: Session) -> User:
    guest = db.scalar(select(User).where(User.api_key_hash == GUEST_KEY_HASH))
    if guest is None:
        guest = User(name=GUEST_NAME, api_key_hash=GUEST_KEY_HASH)
        db.add(guest)
        db.commit()
    return guest


def get_current_user(
    x_api_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not x_api_key:
        if not settings.auth_required:
            return _get_or_create_guest(db)
        raise HTTPException(
            status_code=401, detail="Требуется API-ключ в заголовке X-API-Key"
        )
    user = db.scalar(select(User).where(User.api_key_hash == hash_api_key(x_api_key)))
    if user is None:
        raise HTTPException(status_code=401, detail="Неверный API-ключ")
    return user
