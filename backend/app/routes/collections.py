"""
Collections — ดึง collections จาก MongoDB (vallaris_feature.collections)
อ้างอิง logic จาก geojson_service.go → FindCollectionID
"""
import re
from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter()


@router.get("/collections")
async def list_collections(
    search: str = Query("", description="Search by alias"),
    feature_type: str = Query("", description="Filter by feature type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    db = get_db()
    meta_col = db["collections"]

    # Build filter
    query = {}
    if search:
        query["alias"] = {"$regex": search, "$options": "i"}
    if feature_type:
        # alias format: {pwaCode}_{featureType}
        if "alias" in query:
            # Combine: alias must match both search and end with _featureType
            query["alias"]["$regex"] = f"(?=.*{search}).*_{feature_type}$"
            query["alias"]["$options"] = "i"
        else:
            query["alias"] = {"$regex": f"_{feature_type}$", "$options": "i"}

    total = await meta_col.count_documents(query)
    cursor = meta_col.find(query, {"_id": 1, "alias": 1}).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    results = []
    for doc in docs:
        alias = doc.get("alias", "")
        collection_id = str(doc["_id"])

        # Parse pwa_code and feature_type from alias
        parts = alias.rsplit("_", 1)
        pwa_code = parts[0] if len(parts) == 2 else alias
        ft = parts[1] if len(parts) == 2 else ""

        # Get feature count
        feat_col_name = f"features_{collection_id}"
        try:
            count = await db[feat_col_name].estimated_document_count()
        except Exception:
            count = 0

        results.append({
            "collection_id": collection_id,
            "alias": alias,
            "pwa_code": pwa_code,
            "feature_type": ft,
            "feature_count": count,
        })

    return {"collections": results, "total": total, "skip": skip, "limit": limit}
