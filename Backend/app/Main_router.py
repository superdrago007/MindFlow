from fastapi import FastAPI
from app.routers.auth import auth_router
from app.db.database import engine, Base
import logging

app = FastAPI()

# Ensure DB tables are created (for development). In production use migrations.
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)

logging.basicConfig(
    level=logging.INFO, # Change to DEBUG to see the detailed logs
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)