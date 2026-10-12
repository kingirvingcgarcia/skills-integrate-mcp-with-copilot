import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets


TEACHERS_FILE = Path(
    os.environ.get("TEACHERS_FILE", Path(__file__).with_name("teachers.json"))
)
PASSWORD_HASH_ITERATIONS = 600_000
MIN_PASSWORD_HASH_ITERATIONS = 100_000
MAX_PASSWORD_HASH_ITERATIONS = 1_000_000


def create_password_record(password: str) -> dict[str, str | int]:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
    )
    return {
        "salt": salt.hex(),
        "password_hash": password_hash.hex(),
        "iterations": PASSWORD_HASH_ITERATIONS,
    }


def verify_teacher_credentials(username: str, password: str) -> bool:
    try:
        with TEACHERS_FILE.open(encoding="utf-8") as teachers_file:
            teachers = json.load(teachers_file).get("teachers", {})
        record = teachers.get(username)
        if not isinstance(record, dict):
            return False

        salt = bytes.fromhex(record["salt"])
        expected_hash = bytes.fromhex(record["password_hash"])
        iterations = int(record["iterations"])
        if not MIN_PASSWORD_HASH_ITERATIONS <= iterations <= MAX_PASSWORD_HASH_ITERATIONS:
            return False
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
        return False

    actual_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual_hash, expected_hash)