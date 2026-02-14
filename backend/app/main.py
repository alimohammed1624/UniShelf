from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from . import models, schemas, database, auth, minio_client

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

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
    minio_client.ensure_bucket_exists()


@app.post("/register", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Mock validation: ensure email is from university domain
    if not user.email.endswith(".edu"):
        raise HTTPException(
            status_code=400, detail="Must use a university email address (.edu)"
        )

    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/resources", response_model=schemas.Resource)
async def upload_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    visibility: str = Form("public"),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    # Generate unique object key using timestamp and filename
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    object_name = f"resources/{timestamp}-{file.filename}"

    # Upload to MinIO
    object_key = await minio_client.upload_file(file, object_name)

    # Save metadata to database
    db_resource = models.Resource(
        title=title,
        description=description,
        visibility=visibility,
        file_path=object_key,  # Store MinIO object key instead of local path
        uploader_id=current_user.id,
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource


@app.get("/resources", response_model=List[schemas.Resource])
def read_resources(
    skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)
):
    resources = db.query(models.Resource).offset(skip).limit(limit).all()
    return resources


@app.get("/resources/{resource_id}/download")
async def download_resource(
    resource_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Stream a resource file from MinIO through the backend."""
    from fastapi.responses import StreamingResponse
    import io

    # Fetch resource from database
    resource = (
        db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    )

    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Check visibility/access permissions
    if resource.visibility != "public" and resource.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Download file from MinIO
    file_data = await minio_client.download_file(resource.file_path)

    # Extract original filename from the object key (format: resources/timestamp-filename)
    original_filename = (
        resource.file_path.split("-", 1)[-1]
        if "-" in resource.file_path
        else resource.file_path
    )

    # Return file as streaming response with proper headers
    return StreamingResponse(
        io.BytesIO(file_data),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{original_filename}"'},
    )
