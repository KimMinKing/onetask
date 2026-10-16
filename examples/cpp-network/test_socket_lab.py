"""Run with g++ and Python on Linux or Windows: python test_socket_lab.py."""

import contextlib
import os
import pathlib
import socket
import struct
import subprocess
import tempfile
import time
import unittest


ROOT = pathlib.Path(__file__).resolve().parent
TCP_PORT = 40404
UDP_PORT = 40405


class SocketLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        supplied_binary = os.environ.get("SOCKET_LAB_BINARY")
        if supplied_binary:
            cls.directory = None
            cls.binary = pathlib.Path(supplied_binary).resolve()
            if not cls.binary.is_file():
                raise RuntimeError(f"SOCKET_LAB_BINARY does not exist: {cls.binary}")
            return
        cls.directory = tempfile.TemporaryDirectory()
        windows = os.name == "nt"
        cls.binary = pathlib.Path(cls.directory.name) / ("socket_lab.exe" if windows else "socket_lab")
        command = ["g++", "-std=c++20", "-Wall", "-Wextra", "-Wpedantic", "-Werror"]
        if windows:
            command += [str(ROOT / "socket_lab_windows.cpp"), "-o", str(cls.binary), "-lws2_32"]
        else:
            command += ["-fsanitize=address,undefined", "-fno-omit-frame-pointer",
                        str(ROOT / "socket_lab.cpp"), "-o", str(cls.binary)]
        subprocess.run(command, check=True)

    @classmethod
    def tearDownClass(cls):
        if cls.directory is not None:
            cls.directory.cleanup()

    @contextlib.contextmanager
    def server(self, mode):
        process = subprocess.Popen([str(self.binary), mode], stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, text=True)
        try:
            assert process.stdout is not None
            ready = process.stdout.readline()
            self.assertIn("listening", ready, process.stderr.read() if not ready else "")
            yield process
            process.wait(timeout=7)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
            if process.stdout:
                process.stdout.close()
            if process.stderr:
                process.stderr.close()

    @staticmethod
    def recv_exact(peer, size):
        data = bytearray()
        while len(data) < size:
            chunk = peer.recv(size - len(data))
            if not chunk:
                raise AssertionError("TCP peer closed before full frame")
            data.extend(chunk)
        return bytes(data)

    def test_tcp_fragmented_frame_and_echo(self):
        with self.server("tcp-server") as process:
            with socket.create_connection(("127.0.0.1", TCP_PORT), timeout=3) as peer:
                peer.sendall(b"\x00\x00")
                peer.sendall(b"\x00\x05he")
                peer.sendall(b"llo")
                self.assertEqual(self.recv_exact(peer, 9), b"\x00\x00\x00\x05hello")
            process.wait(timeout=7)
            self.assertEqual(process.returncode, 0)

    def test_tcp_rejects_oversized_declared_length(self):
        with self.server("tcp-server") as process:
            with socket.create_connection(("127.0.0.1", TCP_PORT), timeout=3) as peer:
                peer.sendall(struct.pack("!I", 4097))
            process.wait(timeout=7)
            self.assertEqual(process.returncode, 1)
            self.assertIn("frame exceeds", process.stderr.read())

    def test_tcp_detects_early_close(self):
        with self.server("tcp-server") as process:
            with socket.create_connection(("127.0.0.1", TCP_PORT), timeout=3) as peer:
                peer.sendall(struct.pack("!I", 5) + b"hi")
            process.wait(timeout=7)
            self.assertEqual(process.returncode, 1)
            self.assertIn("connection closed", process.stderr.read())

    def test_tcp_server_times_out_without_client(self):
        with self.server("tcp-server") as process:
            process.wait(timeout=8)
            self.assertEqual(process.returncode, 1)
            self.assertIn("TCP accept timed out", process.stderr.read())

    def test_tcp_server_times_out_on_partial_header(self):
        with self.server("tcp-server") as process:
            with socket.create_connection(("127.0.0.1", TCP_PORT), timeout=3) as peer:
                peer.sendall(b"\x00")
                process.wait(timeout=8)
            self.assertEqual(process.returncode, 1)
            self.assertIn("TCP receive timed out", process.stderr.read())

    def test_tcp_slow_header_cannot_extend_frame_deadline(self):
        with self.server("tcp-server") as process:
            with socket.create_connection(("127.0.0.1", TCP_PORT), timeout=3) as peer:
                peer.sendall(b"\x00")
                time.sleep(4)
                peer.sendall(b"\x00")
                process.wait(timeout=3)
            self.assertEqual(process.returncode, 1)
            self.assertIn("TCP receive timed out", process.stderr.read())

    def test_tcp_header_and_body_share_deadline(self):
        with self.server("tcp-server") as process:
            with socket.create_connection(("127.0.0.1", TCP_PORT), timeout=3) as peer:
                peer.sendall(struct.pack("!I", 2) + b"a")
                time.sleep(4)
                process.wait(timeout=3)
            self.assertEqual(process.returncode, 1)
            self.assertIn("TCP receive timed out", process.stderr.read())

    @unittest.skipIf(os.name == "nt", "POSIX descriptor numbering test")
    def test_tcp_echo_with_descriptor_above_fd_setsize(self):
        import resource

        if resource.getrlimit(resource.RLIMIT_NOFILE)[0] < 1100:
            self.skipTest("file descriptor limit below 1100")
        inherited = []
        try:
            for _ in range(1022):
                inherited.append(os.open(os.devnull, os.O_RDONLY))
            if inherited[-1] < 1024:
                self.skipTest("could not allocate a descriptor above 1023")
            process = subprocess.Popen([str(self.binary), "tcp-server"], pass_fds=tuple(inherited),
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                self.assertIn("listening", process.stdout.readline())
                with socket.create_connection(("127.0.0.1", TCP_PORT), timeout=3) as peer:
                    peer.sendall(struct.pack("!I", 2) + b"hi")
                    self.assertEqual(self.recv_exact(peer, 6), struct.pack("!I", 2) + b"hi")
                process.wait(timeout=7)
                self.assertEqual(process.returncode, 0, process.stderr.read())
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
                process.stdout.close()
                process.stderr.close()
        finally:
            for fd in inherited:
                os.close(fd)

    def test_udp_echo_at_limit(self):
        with self.server("udp-server") as process:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
                peer.settimeout(3)
                peer.sendto(b"x" * 4096, ("127.0.0.1", UDP_PORT))
                reply, _ = peer.recvfrom(4097)
                self.assertEqual(reply, b"x" * 4096)
            process.wait(timeout=7)
            self.assertEqual(process.returncode, 0)

    def test_udp_rejects_oversized_datagram(self):
        with self.server("udp-server") as process:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
                peer.sendto(b"x" * 4097, ("127.0.0.1", UDP_PORT))
            process.wait(timeout=7)
            self.assertEqual(process.returncode, 1)
            self.assertIn("datagram exceeds", process.stderr.read())

    def test_client_rejects_oversized_message(self):
        for mode in ("tcp-client", "udp-client"):
            with self.subTest(mode=mode):
                result = subprocess.run([str(self.binary), mode, "x" * 4097],
                                        capture_output=True, text=True, timeout=7)
                self.assertEqual(result.returncode, 1)
                self.assertIn("message exceeds", result.stderr)

    def test_tcp_client_rejects_oversized_reply(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
            if os.name != "nt":
                server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind(("127.0.0.1", TCP_PORT))
            server.listen(1)
            server.settimeout(3)
            process = subprocess.Popen([str(self.binary), "tcp-client", "hi"],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                with server.accept()[0] as peer:
                    peer.settimeout(3)
                    self.assertEqual(self.recv_exact(peer, 6), struct.pack("!I", 2) + b"hi")
                    peer.sendall(struct.pack("!I", 4097))
                stdout, stderr = process.communicate(timeout=7)
                self.assertEqual(process.returncode, 1, stdout)
                self.assertIn("frame exceeds", stderr)
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
                process.stdout.close()
                process.stderr.close()

    def test_udp_client_rejects_oversized_reply(self):
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as server:
            server.bind(("127.0.0.1", UDP_PORT))
            server.settimeout(3)
            process = subprocess.Popen([str(self.binary), "udp-client", "hi"],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                request, sender = server.recvfrom(4097)
                self.assertEqual(request, b"hi")
                server.sendto(b"x" * 4097, sender)
                stdout, stderr = process.communicate(timeout=7)
                self.assertEqual(process.returncode, 1, stdout)
                self.assertIn("reply exceeds", stderr)
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
                process.stdout.close()
                process.stderr.close()

    def test_udp_client_times_out_with_silent_server(self):
        # A bound peer that does not answer avoids an immediate ICMP port-unreachable error.
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as silent_peer:
            silent_peer.bind(("127.0.0.1", UDP_PORT))
            result = subprocess.run([str(self.binary), "udp-client", "no-reply"],
                                    capture_output=True, text=True, timeout=8)
        self.assertEqual(result.returncode, 1)
        self.assertIn("UDP receive timed out", result.stderr)


if __name__ == "__main__":
    unittest.main()
