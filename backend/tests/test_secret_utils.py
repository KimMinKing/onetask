from secret_utils import PREFIX, decrypt_secret, encrypt_secret


def test_secret_round_trip_and_plaintext_compatibility():
    encrypted = encrypt_secret("123456:telegram-token")
    assert encrypted.startswith(PREFIX)
    assert "telegram-token" not in encrypted
    assert decrypt_secret(encrypted) == "123456:telegram-token"
    assert decrypt_secret("legacy-plaintext") == "legacy-plaintext"
