from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from migrations_runtime import ensure_runtime_migrations
from routers import tasks, categories, words, image_test, english_words, calendar_events, stats, japanese_words
from routers import auth, admin, push, search, settings, achievements, spring_topics
from auth_utils import get_current_user
from scheduler import start_scheduler

Base.metadata.create_all(bind=engine)
ensure_runtime_migrations(engine)
start_scheduler()

app = FastAPI(title="onetask API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://192.168.219.104:3000",
        "https://onetask.tradediary.site",
    ],
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
app.include_router(calendar_events.router,dependencies=_auth)
app.include_router(stats.router,          dependencies=_auth)
app.include_router(japanese_words.router, dependencies=_auth)
app.include_router(push.router,           dependencies=_auth)
app.include_router(search.router,        dependencies=_auth)
app.include_router(settings.router,      dependencies=_auth)
app.include_router(achievements.router,  dependencies=_auth)
app.include_router(spring_topics.router, dependencies=_auth)
app.include_router(admin.router)

app.mount("/images", StaticFiles(directory="test_output"), name="images")


@app.get("/health")
def health():
    return {"status": "ok"}
