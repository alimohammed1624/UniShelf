from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import Base
from app.database import engine
from app.utils.minio_client import ensure_bucket_exists
from app.config import settings

from app.controllers.auth.router import router as auth_router
from app.controllers.users.router import router as users_router
from app.controllers.resources.router import router as resources_router
from app.controllers.tags.router import router as tags_router
from app.controllers.admin.router import router as admin_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="UniShelf API", version="2.0.0")

# CORS — configurable origins from settings
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize MinIO bucket on application startup."""
    ensure_bucket_exists()


# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(resources_router)
app.include_router(tags_router)
app.include_router(admin_router)
