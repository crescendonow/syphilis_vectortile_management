"""
Syphilis — Vector Tile & Style Manager
FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os

from app.database import connect_db, close_db
from app.routes import collections, sources, styles, tiles, stats, columns


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="Syphilis — Vector Tile Manager",
    version="2.0.0",
    lifespan=lifespan,
)

# ── API Routes ──
app.include_router(stats.router, prefix="/api", tags=["stats"])
app.include_router(collections.router, prefix="/api", tags=["collections"])
app.include_router(sources.router, prefix="/api", tags=["sources"])
app.include_router(styles.router, prefix="/api", tags=["styles"])
app.include_router(tiles.router, tags=["tiles"])
app.include_router(columns.router, prefix="/api", tags=["columns"])

# ── Static Files (Frontend) ──
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend")
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")


@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
