"""
Secure certificate management for FNMT .p12/.pfx files.

Security model:
- Private key encrypted at rest with AES-256-GCM (CERTIFICATE_ENCRYPTION_KEY)
- AAD (associated data) bound to workspace_id for contextual integrity
- Sensitive material wiped from memory after use
- Temp files overwritten with random data before deletion
"""

import ctypes
import logging
import os
import re
import tempfile
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    pkcs12,
)
from cryptography.x509 import oid as x509_oid

from app.core.config import settings

logger = logging.getLogger(__name__)

AES_KEY_LENGTH = 32  # 256 bits
GCM_IV_LENGTH = 12   # 96 bits — NIST recommended
MAX_P12_SIZE = 50 * 1024  # 50 KB


@dataclass
class CertificateInfo:
    cert_pem: str
    key_pem_encrypted: bytes
    key_iv: bytes
    subject: str
    serial_number: str
    nif: Optional[str]
    expires_at: datetime
    uploaded_at: datetime


def _get_encryption_key() -> bytes:
    raw = settings.CERTIFICATE_ENCRYPTION_KEY
    if not raw or len(raw) != 64:
        raise ValueError(
            "CERTIFICATE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). "
            "Generate with: python -c \"import os; print(os.urandom(32).hex())\""
        )
    try:
        return bytes.fromhex(raw)
    except ValueError:
        raise ValueError("CERTIFICATE_ENCRYPTION_KEY is not valid hex")


def _wipe_bytearray(data: bytearray) -> None:
    """Overwrite mutable buffer with zeros."""
    for i in range(len(data)):
        data[i] = 0


def _wipe_bytes_best_effort(data: bytes) -> None:
    """Best-effort wipe for immutable bytes via ctypes.
    
    Note: from_buffer_copy creates a copy — to wipe the real buffer we use
    id() + ob_sval offset (CPython implementation detail). This is inherently
    fragile and best-effort; prefer bytearray + _wipe_bytearray whenever possible.
    """
    if not data:
        return
    try:
        buf_addr = id(data) + _CPYTHON_BYTES_OB_SVAL_OFFSET
        ctypes.memset(buf_addr, 0, len(data))
    except Exception:
        pass


# CPython bytes object layout: ob_refcnt (8) + ob_type (8) + ob_size (8) + ob_shash (8) + ob_sval
_CPYTHON_BYTES_OB_SVAL_OFFSET = 32


def _extract_nif_from_cert(subject_str: str) -> Optional[str]:
    """Extract NIF/NIE from the certificate subject (serialNumber or CN)."""
    nif_pattern = re.compile(r'\b([0-9A-Z]{1}[0-9]{7}[A-Z]{1})\b')
    match = nif_pattern.search(subject_str)
    if match:
        return match.group(1)
    nie_pattern = re.compile(r'\b([XYZ][0-9]{7}[A-Z])\b')
    match = nie_pattern.search(subject_str)
    if match:
        return match.group(1)
    return None


def extract_and_encrypt(
    p12_data: bytes,
    password: str,
    workspace_id: str,
) -> CertificateInfo:
    """
    Extract cert+key from a .p12/.pfx file, encrypt the private key
    with AES-256-GCM, and return all metadata.

    The password and plaintext key are wiped from memory after use.
    """
    encryption_key = _get_encryption_key()
    password_bytes = bytearray(password.encode("utf-8"))
    plaintext_key = bytearray()

    try:
        private_key, certificate, _chain = pkcs12.load_key_and_certificates(
            p12_data, bytes(password_bytes), None
        )
    except Exception as e:
        _wipe_bytearray(password_bytes)
        logger.warning("Certificate extraction failed: invalid file or password")
        raise ValueError(f"No se pudo extraer el certificado: contraseña incorrecta o archivo inválido") from e
    finally:
        _wipe_bytearray(password_bytes)

    if private_key is None or certificate is None:
        raise ValueError("El archivo .p12 no contiene una clave privada y certificado válidos")

    now = datetime.now(timezone.utc)
    if certificate.not_valid_after_utc < now:
        raise ValueError(
            f"El certificado expiró el {certificate.not_valid_after_utc.strftime('%d/%m/%Y')}. "
            "Suba un certificado vigente."
        )

    from cryptography.hazmat.primitives.serialization import PrivateFormat

    cert_pem = certificate.public_bytes(Encoding.PEM).decode("utf-8")
    key_pem_bytes = private_key.private_bytes(
        Encoding.PEM,
        PrivateFormat.TraditionalOpenSSL,
        NoEncryption(),
    )

    plaintext_key = bytearray(key_pem_bytes)
    _wipe_bytes_best_effort(key_pem_bytes)

    subject_parts = []
    for attr in certificate.subject:
        subject_parts.append(f"{attr.oid._name}={attr.value}")
    subject_str = ", ".join(subject_parts)

    serial_str = format(certificate.serial_number, "X")

    nif = None
    for attr in certificate.subject:
        if attr.oid == x509_oid.NameOID.SERIAL_NUMBER:
            nif = _extract_nif_from_cert(attr.value)
            break
    if not nif:
        nif = _extract_nif_from_cert(subject_str)

    iv = os.urandom(GCM_IV_LENGTH)
    aad = workspace_id.encode("utf-8")
    aesgcm = AESGCM(encryption_key)
    ciphertext_with_tag = aesgcm.encrypt(iv, bytes(plaintext_key), aad)

    _wipe_bytearray(plaintext_key)

    return CertificateInfo(
        cert_pem=cert_pem,
        key_pem_encrypted=bytes(ciphertext_with_tag),
        key_iv=bytes(iv),
        subject=subject_str,
        serial_number=serial_str,
        nif=nif,
        expires_at=certificate.not_valid_after_utc,
        uploaded_at=now,
    )


def decrypt_private_key(
    encrypted_key: bytes,
    iv: bytes,
    workspace_id: str,
) -> bytearray:
    """
    Decrypt the private key PEM. Returns a mutable bytearray that
    the caller MUST wipe after use with _wipe_bytearray().
    """
    encryption_key = _get_encryption_key()
    aad = workspace_id.encode("utf-8")
    aesgcm = AESGCM(encryption_key)

    try:
        plaintext = aesgcm.decrypt(iv, encrypted_key, aad)
    except Exception as e:
        logger.error("Failed to decrypt certificate private key")
        raise ValueError("Error al descifrar la clave privada del certificado") from e

    return bytearray(plaintext)


def write_secure_temp_files(
    cert_pem: str,
    key_pem: bytearray,
) -> Tuple[str, str]:
    """
    Write cert and key to secure temp files for SSL usage.
    Returns (cert_path, key_path). Caller must call cleanup_temp_files() after use.
    """
    cert_fd, cert_path = tempfile.mkstemp(suffix=".pem", prefix="cert_")
    key_fd, key_path = tempfile.mkstemp(suffix=".pem", prefix="key_")

    try:
        os.write(cert_fd, cert_pem.encode("utf-8"))
        os.close(cert_fd)

        os.write(key_fd, bytes(key_pem))
        os.close(key_fd)

        os.chmod(cert_path, 0o400)
        os.chmod(key_path, 0o400)
    except Exception:
        cleanup_temp_files(cert_path, key_path)
        raise

    return cert_path, key_path


def cleanup_temp_files(*paths: str) -> None:
    """Overwrite temp files with random data then delete."""
    for path in paths:
        try:
            if os.path.exists(path):
                size = os.path.getsize(path)
                os.chmod(path, 0o600)
                with open(path, "wb") as f:
                    f.write(os.urandom(max(size, 1)))
                    f.flush()
                    os.fsync(f.fileno())
                os.unlink(path)
        except Exception:
            try:
                os.unlink(path)
            except OSError:
                pass
