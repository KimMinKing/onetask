import os
import subprocess
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]


class AppStartupTests(unittest.TestCase):
    def test_app_starts_and_registers_quiz_routes(self):
        env = os.environ.copy()
        env["DATABASE_URL"] = "sqlite:///:memory:"
        env["SECRET_KEY"] = "release-test-secret-key-that-is-long-enough"
        script = """
import main
import scheduler

paths = {getattr(route, 'path', '') for route in main.app.routes}
assert '/health' in paths
assert '/quizzes/example-quiz' in paths
assert main.health() == {'status': 'ok'}
scheduler.scheduler.shutdown()
"""

        result = subprocess.run(
            [sys.executable, "-c", script],
            cwd=BACKEND_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
        )

        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
