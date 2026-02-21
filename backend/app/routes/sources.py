"""
Tile Sources — Register / manage collections as tile sources
เก็บใน syphilis.tile_sources
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_db, get_app_db

router = APIRouter()


class SourceCreate(BaseModel):
    pwa_code: str
    feature_type: str
    display_name: str = ""
    min_zoom: int = 0
    max_zoom: int = 18


@router.get("/sources")
async def list_sources():
    app_db = get_app_db()
    cursor = app_db["tile_sources"].find().sort("created_at", -1)
    docs = await cursor.to_list(500)
    sources = []
    for d in docs:
        sources.append({
            "source_id": d["source_id"],
            "pwa_code": d["pwa_code"],
            "feature_type": d["feature_type"],
            "alias": d.get("alias", ""),
            "display_name": d.get("display_name", ""),
            "min_zoom": d.get("min_zoom", 0),
            "max_zoom": d.get("max_zoom", 18),
            "collection_id": d.get("collection_id", ""),
        })
    return {"sources": sources}


@router.post("/sources")
async def register_source(body: SourceCreate):
    db = get_db()
    app_db = get_app_db()

    alias = f"{body.pwa_code}_{body.feature_type}"

    # Find collection in MongoDB
    meta = await db["collections"].find_one({"alias": alias})
    if not meta:
        raise HTTPException(404, f"Collection not found: {alias}")

    collection_id = str(meta["_id"])

    # Check duplicate
    existing = await app_db["tile_sources"].find_one({"alias": alias})
    if existing:
        raise HTTPException(409, f"Source already registered: {alias}")

    source_id = str(uuid.uuid4())[:8]
    doc = {
        "source_id": source_id,
        "pwa_code": body.pwa_code,
        "feature_type": body.feature_type,
        "alias": alias,
        "display_name": body.display_name or alias,
        "min_zoom": body.min_zoom,
        "max_zoom": body.max_zoom,
        "collection_id": collection_id,
        "created_at": datetime.now(timezone.utc),
    }
    await app_db["tile_sources"].insert_one(doc)
    return {"status": "ok", "source_id": source_id, "alias": alias}


@router.delete("/sources/{source_id}")
async def delete_source(source_id: str):
    app_db = get_app_db()
    result = await app_db["tile_sources"].delete_one({"source_id": source_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Source not found")
    return {"status": "deleted"}
