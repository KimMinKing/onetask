from fastapi import FastAPI, Depends, Request
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from migrations_runtime import ensure_runtime_migrations
from routers import tasks, categories, words, image_test, english_words, english_phrases, calendar_events, stats, japanese_words
from routers import auth, admin, push, search, settings, achievements, spring_topics, quizzes
from routers import learning
from auth_utils import get_current_user
from scheduler import start_scheduler

Base.metadata.create_all(bind=engine)
ensure_runtime_migrations(engine)
start_scheduler()

app = FastAPI(title="onetask API")
ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://192.168.219.104:3000",
    "https://onetask.tradediary.site",
    os.getenv("APP_BASE_URL", "").rstrip("/"),
} - {""}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    if request.method not in {"GET", "HEAD", "OPTIONS"} and request.cookies.get("onetask_token"):
        origin = request.headers.get("origin")
        if origin and origin not in ALLOWED_ORIGINS:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=403, content={"detail": "Invalid request origin"})
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=(self)"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    legacy_token = request.cookies.get("onetask_token")
    if legacy_token and response.status_code == 401:
        response.delete_cookie("onetask_token", path="/", httponly=True, samesite="lax")
    elif legacy_token and request.url.path != "/auth/logout":
        response.set_cookie("onetask_token", legacy_token, max_age=30 * 24 * 60 * 60, httponly=True, secure=os.getenv("COOKIE_SECURE", "true").lower() in {"1", "true", "yes"}, samesite="lax", path="/")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 인증 불필요 라우터
app.include_router(auth.router)

# 인증 필요 라우터
_auth = [Depends(get_current_user)]
app.include_router(tasks.router,          dependencies=_auth)
app.include_router(categories.router,     dependencies=_auth)
app.include_router(words.router,          dependencies=_auth)
app.include_router(image_test.router,     dependencies=_auth)
app.include_router(english_words.router,  dependencies=_auth)
app.include_router(english_phrases.router, dependencies=_auth)
app.include_router(calendar_events.router,dependencies=_auth)
app.include_router(stats.router,          dependencies=_auth)
app.include_router(japanese_words.router, dependencies=_auth)
app.include_router(push.router,           dependencies=_auth)
app.include_router(search.router,        dependencies=_auth)
app.include_router(settings.router,      dependencies=_auth)
app.include_router(achievements.router,  dependencies=_auth)
app.include_router(spring_topics.router, dependencies=_auth)
app.include_router(quizzes.router,       dependencies=_auth)
app.include_router(learning.router,      dependencies=_auth)
app.include_router(admin.router)

app.mount("/images", StaticFiles(directory="test_output"), name="images")


@app.get("/health")
def health():
    return {"status": "ok"}
