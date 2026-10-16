"""Loopback TLS integration tests; certificates are generated only in a temporary directory."""

import concurrent.futures
import contextlib
import os
from pathlib import Path
import re
import select
import socket
import ssl
import struct
import subprocess
import tempfile
import time
import unittest


TOKEN = b"test-only-token-32-bytes-long-12345"


class SecureServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.binary = Path(os.environ["SECURE_SERVER_BINARY"])
        cls.directory = tempfile.TemporaryDirectory()
        cls.certificate = Path(cls.directory.name) / "certificate.pem"
        cls.key = Path(cls.directory.name) / "private-key.pem"
        subprocess.run([os.environ.get("OPENSSL_TOOL", "openssl"), "req", "-x509", "-newkey", "rsa:2048",
                        "-nodes", "-days", "1", "-subj", "/CN=localhost",
                        "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
                        "-keyout", str(cls.key), "-out", str(cls.certificate)],
                       check=True, capture_output=True, timeout=15)

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    @contextlib.contextmanager
    def server(self):
        environment = {**os.environ, "ONETASK_LAB_TOKEN": TOKEN.decode("ascii")}
        process = subprocess.Popen([str(self.binary), str(self.certificate), str(self.key), "0"],
                                   env=environment, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            ready, _, _ = select.select([process.stdout], [], [], 5)
            self.assertTrue(ready, "server did not announce its port")
            line = process.stdout.readline()
            match = re.fullmatch(r"TLS listening on 127\.0\.0\.1:(\d+)\n", line)
            self.assertIsNotNone(match, process.stderr.read() if not line else line)
            yield int(match.group(1)), process
        finally:
            process.terminate()
            try:
                process.communicate(timeout=7)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate(timeout=2)
                self.fail("server did not stop within its request deadline")

    def connect(self, port, hostname="localhost", trusted=True):
        context = ssl.create_default_context(cafile=str(self.certificate) if trusted else None)
        context.minimum_version = ssl.TLSVersion.TLSv1_3
        peer = socket.create_connection(("127.0.0.1", port), timeout=3)
        peer.settimeout(6)
        try:
            return context.wrap_socket(peer, server_hostname=hostname)
        except BaseException:
            peer.close()
            raise

    @staticmethod
    def recv_exact(peer, length):
        data = bytearray()
        while len(data) < length:
            part = peer.recv(length - len(data))
            if not part:
                raise AssertionError("server closed before complete response")
            data.extend(part)
        return bytes(data)

    def exchange(self, port, payload=b"hello", token=TOKEN):
        with self.connect(port) as peer:
            peer.sendall(struct.pack("!H", len(token)) + token + struct.pack("!I", len(payload)) + payload)
            length = struct.unpack("!I", self.recv_exact(peer, 4))[0]
            return self.recv_exact(peer, length)

    def test_tls_authenticated_echo(self):
        with self.server() as (port, _):
            self.assertEqual(self.exchange(port), b"hello")
            self.assertEqual(self.exchange(port, b"x" * 4096), b"x" * 4096)

    def test_multiple_connections(self):
        with self.server() as (port, _):
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                replies = list(pool.map(lambda i: self.exchange(port, f"message-{i}".encode()), range(4)))
            self.assertEqual(replies, [f"message-{i}".encode() for i in range(4)])

    def test_connection_capacity_is_bounded(self):
        with self.server() as (port, _):
            held = []
            try:
                for _ in range(8):
                    held.append(socket.create_connection(("127.0.0.1", port), timeout=3))
                time.sleep(0.3)
                with socket.create_connection(("127.0.0.1", port), timeout=3) as extra:
                    extra.settimeout(2)
                    self.assertEqual(extra.recv(1), b"")
            finally:
                for peer in held:
                    peer.close()

    def test_queued_connections_do_not_extend_shutdown_deadline(self):
        with self.server() as (port, process):
            held = []
            try:
                for _ in range(8):
                    held.append(socket.create_connection(("127.0.0.1", port), timeout=3))
                time.sleep(0.3)
                started = time.monotonic()
                process.terminate()
                process.wait(timeout=7)
                self.assertLess(time.monotonic() - started, 6)
            finally:
                for peer in held:
                    peer.close()

    def test_bad_token_is_rejected(self):
        with self.server() as (port, _):
            with self.connect(port) as peer:
                token = b"wrong-token"
                peer.sendall(struct.pack("!H", len(token)) + token + struct.pack("!I", 2) + b"hi")
                with self.assertRaises((ssl.SSLError, ConnectionError, OSError)):
                    result = peer.recv(4)
                    if not result:
                        raise ConnectionError("closed after authentication failure")

    def test_oversized_frame_is_rejected_before_body(self):
        with self.server() as (port, _):
            with self.connect(port) as peer:
                peer.sendall(struct.pack("!H", len(TOKEN)) + TOKEN + struct.pack("!I", 4097))
                with self.assertRaises((ssl.SSLError, ConnectionError, OSError)):
                    result = peer.recv(4)
                    if not result:
                        raise ConnectionError("closed after oversized frame")

    def test_certificate_hostname_and_trust_are_enforced(self):
        with self.server() as (port, _):
            with self.assertRaises(ssl.SSLCertVerificationError):
                self.connect(port, hostname="wrong.example")
            with self.assertRaises(ssl.SSLCertVerificationError):
                self.connect(port, trusted=False)

    def test_tls_1_2_is_refused(self):
        with self.server() as (port, _):
            context = ssl.create_default_context(cafile=str(self.certificate))
            context.maximum_version = ssl.TLSVersion.TLSv1_2
            with socket.create_connection(("127.0.0.1", port), timeout=3) as raw:
                with self.assertRaises(ssl.SSLError):
                    context.wrap_socket(raw, server_hostname="localhost")

    def test_insecure_key_permissions_are_refused(self):
        self.key.chmod(0o644)
        try:
            environment = {**os.environ, "ONETASK_LAB_TOKEN": TOKEN.decode("ascii")}
            result = subprocess.run([str(self.binary), str(self.certificate), str(self.key), "0"],
                                    env=environment, capture_output=True, text=True, timeout=3)
            self.assertEqual(result.returncode, 1)
            self.assertIn("private key must be a private regular file", result.stderr)
        finally:
            self.key.chmod(0o600)

    def test_missing_token_and_invalid_port_fail_closed(self):
        environment = {key: value for key, value in os.environ.items() if key != "ONETASK_LAB_TOKEN"}
        missing = subprocess.run([str(self.binary), str(self.certificate), str(self.key), "0"],
                                 env=environment, capture_output=True, text=True, timeout=3)
        self.assertEqual(missing.returncode, 1)
        self.assertIn("ONETASK_LAB_TOKEN is required", missing.stderr)
        environment["ONETASK_LAB_TOKEN"] = TOKEN.decode("ascii")
        invalid = subprocess.run([str(self.binary), str(self.certificate), str(self.key), "65536"],
                                 env=environment, capture_output=True, text=True, timeout=3)
        self.assertEqual(invalid.returncode, 1)
        self.assertIn("port must be 0..65535", invalid.stderr)

    def test_slow_authenticated_frame_hits_whole_request_deadline(self):
        with self.server() as (port, _):
            with self.connect(port) as peer:
                peer.sendall(struct.pack("!H", len(TOKEN)) + TOKEN + b"\x00")
                time.sleep(4)
                peer.sendall(b"\x00")
                peer.settimeout(3)
                with self.assertRaises((ssl.SSLError, ConnectionError, OSError)):
                    result = peer.recv(4)
                    if not result:
                        raise ConnectionError("closed at request deadline")

    def test_stalled_handshake_does_not_block_shutdown(self):
        started = time.monotonic()
        with self.server() as (port, _):
            with socket.create_connection(("127.0.0.1", port), timeout=3):
                time.sleep(0.2)
        self.assertLess(time.monotonic() - started, 7)


if __name__ == "__main__":
    unittest.main()
