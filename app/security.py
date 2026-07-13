from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import HTTPException, status

from .config import Settings


def _encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_access_token(settings: Settings) -> str:
    now = int(time.time())
    payload = {
        "sub": settings.username,
        "student_id": settings.student_id,
        "iat": now,
        "exp": now + settings.token_ttl_seconds,
    }
    encoded_payload = _encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        settings.token_secret.encode("utf-8"),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{encoded_payload}.{_encode(signature)}"


def verify_access_token(token: str, settings: Settings) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": "INVALID_TOKEN", "message": "A valid access token is required."},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        expected = hmac.new(
            settings.token_secret.encode("utf-8"),
            encoded_payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected, _decode(encoded_signature)):
            raise unauthorized
        payload = json.loads(_decode(encoded_payload))
        if payload.get("exp", 0) <= int(time.time()):
            raise unauthorized
        if payload.get("sub") != settings.username:
            raise unauthorized
        if payload.get("student_id") != settings.student_id:
            raise unauthorized
        return payload
    except HTTPException:
        raise
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise unauthorized from exc
