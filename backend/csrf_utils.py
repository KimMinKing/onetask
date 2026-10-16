from urllib.parse import urlsplit

from fastapi import Request


def allows_cookie_mutation(request: Request, allowed_origins: set[str]) -> bool:
    if request.method in {"GET", "HEAD", "OPTIONS"} or not request.cookies.get("onetask_token"):
        return True

    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/") in allowed_origins

    referer = request.headers.get("referer")
    if referer:
        parsed = urlsplit(referer)
        return f"{parsed.scheme}://{parsed.netloc}" in allowed_origins

    return request.headers.get("sec-fetch-site") == "same-origin"
