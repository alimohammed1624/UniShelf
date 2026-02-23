from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import Base
from app.database import engine
from app.utils.minio_client import ensure_bucket_exists
from app.controllers.auth.router import router as auth_router
from app.controllers.resources.router import router as resources_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For PoC, allow all. In prod, specify frontend URL.
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
app.include_router(resources_router)
