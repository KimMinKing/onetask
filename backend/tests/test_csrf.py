import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import Request
from csrf_utils import allows_cookie_mutation


ALLOWED = {"https://onetask.example.com"}


def request(method="POST", headers=None):
    values = {"cookie": "onetask_token=token", **(headers or {})}
    return Request({
        "type": "http", "method": method, "path": "/tasks/",
        "headers": [(key.lower().encode(), value.encode()) for key, value in values.items()],
    })


def test_cookie_mutation_requires_trusted_source():
    assert not allows_cookie_mutation(request(), ALLOWED)
    assert not allows_cookie_mutation(request(headers={"origin": "https://other.example.com"}), ALLOWED)
    assert allows_cookie_mutation(request(headers={"origin": "https://onetask.example.com"}), ALLOWED)
    assert allows_cookie_mutation(request(headers={"referer": "https://onetask.example.com/calendar"}), ALLOWED)
    assert allows_cookie_mutation(request(headers={"sec-fetch-site": "same-origin"}), ALLOWED)
    assert not allows_cookie_mutation(request(headers={"sec-fetch-site": "same-site"}), ALLOWED)
