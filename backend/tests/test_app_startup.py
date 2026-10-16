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
        env["ENABLE_SCHEDULER"] = "true"
        script = """
from fastapi.testclient import TestClient
from migrate import migrate
import main
import scheduler

migrate()
paths = {getattr(route, 'path', '') for route in main.app.routes}
assert '/health' in paths
assert '/quizzes/example-quiz' in paths
with TestClient(main.app) as client:
    assert scheduler.scheduler.running
    assert client.get('/health').json() == {'status': 'ok'}
assert not scheduler.scheduler.running
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
