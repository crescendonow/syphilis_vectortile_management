from fastapi import APIRouter
from app.database import get_db, get_app_db, get_settings

router = APIRouter()


@router.get("/stats")
async def get_stats():
    db = get_db()
    app_db = get_app_db()
    settings = get_settings()

    collections_count = len(await db.list_collection_names())
    sources_count = await app_db["tile_sources"].count_documents({})
    styles_count = await app_db["map_styles"].count_documents({})

    return {
        "total_collections": collections_count,
        "registered_sources": sources_count,
        "total_styles": styles_count,
        "database": settings["mongo_database"],
    }
