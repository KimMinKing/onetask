"""Exercise numeric IPv4/IPv6 resolution without external DNS."""

import os
import subprocess
import unittest


class AddressLookupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.binary = os.environ["ADDRESS_LOOKUP_BINARY"]

    def run_lookup(self, *args):
        return subprocess.run([self.binary, *args], capture_output=True, text=True, timeout=5)

    def test_numeric_ipv4(self):
        result = self.run_lookup("--numeric", "127.0.0.1", "40404")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "IPv4 127.0.0.1:40404")

    def test_numeric_ipv6(self):
        result = self.run_lookup("--numeric", "::1", "40404")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "IPv6 [::1]:40404")

    def test_invalid_numeric_host(self):
        result = self.run_lookup("--numeric", "invalid-address", "40404")
        self.assertEqual(result.returncode, 1)
        self.assertIn("address lookup failed", result.stderr)

    def test_invalid_service(self):
        result = self.run_lookup("--numeric", "127.0.0.1", "not-a-port")
        self.assertEqual(result.returncode, 1)

    def test_usage(self):
        result = self.run_lookup("--numeric", "127.0.0.1")
        self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
