import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from auth_utils import SECRET_KEY

PREFIX = "enc:v1:"
_fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()))


def encrypt_secret(value: str | None) -> str | None:
    if not value or value.startswith(PREFIX):
        return value
    return PREFIX + _fernet.encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(value: str | None) -> str | None:
    if not value or not value.startswith(PREFIX):
        return value
    try:
        return _fernet.decrypt(value[len(PREFIX):].encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        return None
