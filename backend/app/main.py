from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.deps import get_engine
from .api.routes import analysis, chat, health, records
from .core.config import get_settings

app = FastAPI(title="CSE 499B ECG Analysis API")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.on_event("startup")
def warm_up_engine():
    # Load the encoder + 5 fold classifiers once at boot so the first
    # request isn't the one paying for it (and load errors surface here,
    # not on a user's first click).
    get_engine()
