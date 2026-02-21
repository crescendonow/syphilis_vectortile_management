"""
Map Styles — CRUD + serve style.json for MapLibre
เก็บใน syphilis.map_styles
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any
from app.database import get_app_db

router = APIRouter()


class StyleCreate(BaseModel):
    name: str
    description: str = ""
    style_json: dict[str, Any] = {}


class StyleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    style_json: dict[str, Any] | None = None


@router.get("/styles")
async def list_styles():
    app_db = get_app_db()
    cursor = app_db["map_styles"].find().sort("created_at", -1)
    docs = await cursor.to_list(500)
    styles = []
    for d in docs:
        sj = d.get("style_json", {})
        layer_count = len(sj.get("layers", []))
        styles.append({
            "style_id": d["style_id"],
            "name": d.get("name", ""),
            "description": d.get("description", ""),
            "layer_count": layer_count,
            "created_at": d.get("created_at", ""),
        })
    return {"styles": styles}


@router.get("/styles/{style_id}")
async def get_style(style_id: str):
    app_db = get_app_db()
    doc = await app_db["map_styles"].find_one({"style_id": style_id})
    if not doc:
        raise HTTPException(404, "Style not found")
    return {
        "style_id": doc["style_id"],
        "name": doc.get("name", ""),
        "description": doc.get("description", ""),
        "style_json": doc.get("style_json", {}),
    }


@router.get("/styles/{style_id}/style.json")
async def serve_style_json(style_id: str, request: Request):
    """Serve MapLibre style.json — URL สำหรับ map.setStyle()"""
    app_db = get_app_db()
    doc = await app_db["map_styles"].find_one({"style_id": style_id})
    if not doc:
        raise HTTPException(404, "Style not found")

    sj = doc.get("style_json", {})

    # Rewrite tile URLs to absolute
    base_url = str(request.base_url).rstrip("/")
    sources = sj.get("sources", {})
    for src_name, src in sources.items():
        if src.get("type") == "vector" and "tiles" in src:
            src["tiles"] = [
                t if t.startswith("http") else f"{base_url}{t}"
                for t in src["tiles"]
            ]

    return sj


@router.post("/styles")
async def create_style(body: StyleCreate):
    app_db = get_app_db()
    style_id = str(uuid.uuid4())[:8]
    doc = {
        "style_id": style_id,
        "name": body.name,
        "description": body.description,
        "style_json": body.style_json,
        "created_at": datetime.now(timezone.utc),
    }
    await app_db["map_styles"].insert_one(doc)
    return {"status": "ok", "style_id": style_id}


@router.put("/styles/{style_id}")
async def update_style(style_id: str, body: StyleUpdate):
    app_db = get_app_db()
    update = {}
    if body.name is not None:
        update["name"] = body.name
    if body.description is not None:
        update["description"] = body.description
    if body.style_json is not None:
        update["style_json"] = body.style_json
    update["updated_at"] = datetime.now(timezone.utc)

    result = await app_db["map_styles"].update_one(
        {"style_id": style_id}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Style not found")
    return {"status": "updated"}


@router.delete("/styles/{style_id}")
async def delete_style(style_id: str):
    app_db = get_app_db()
    result = await app_db["map_styles"].delete_one({"style_id": style_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Style not found")
    return {"status": "deleted"}
