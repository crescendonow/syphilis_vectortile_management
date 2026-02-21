"""
Columns & Values — Column browser + distinct values
อ้างอิง field_mapping.py
"""
from fastapi import APIRouter, Path
from app.database import get_db
from app.field_mapping import FIELD_MAPPING, get_reverse_key

router = APIRouter()


async def _find_collection_id(db, pwa_code: str, feature_type: str):
    alias = f"{pwa_code}_{feature_type}"
    doc = await db["collections"].find_one({"alias": alias})
    if not doc:
        return None, alias
    return str(doc["_id"]), alias


@router.get("/columns/{pwa_code}/{feature_type}")
async def get_columns(
    pwa_code: str = Path(...),
    feature_type: str = Path(...),
):
    db = get_db()
    collection_id, alias = await _find_collection_id(db, pwa_code, feature_type)
    if not collection_id:
        return {"alias": alias, "columns": [], "total_raw_keys": 0}

    feat_col = db[f"features_{collection_id}"]

    # Sample documents to discover keys
    sample_docs = await feat_col.find(
        {}, {"properties": 1, "_id": 0}
    ).limit(50).to_list(50)

    raw_keys = set()
    sample_values = {}
    for doc in sample_docs:
        props = doc.get("properties", {})
        for k, v in props.items():
            if isinstance(v, (dict, list)):
                continue
            raw_keys.add(k)
            if k not in sample_values and v is not None:
                sample_values[k] = str(v)[:100]

    # Build column list with mapping info
    mapping = FIELD_MAPPING.get(feature_type, {})
    columns = []

    # Mapped fields first
    for mongo_key, pg_key in mapping.items():
        found = mongo_key in raw_keys
        columns.append({
            "key": pg_key,
            "mongo_key": mongo_key,
            "found": found,
            "sample": sample_values.get(mongo_key, ""),
            "unmapped": False,
        })

    # Unmapped fields (in MongoDB but not in mapping)
    mapped_mongo_keys = set(mapping.keys())
    for k in sorted(raw_keys - mapped_mongo_keys):
        columns.append({
            "key": k,
            "mongo_key": k,
            "found": True,
            "sample": sample_values.get(k, ""),
            "unmapped": True,
        })

    return {
        "alias": alias,
        "columns": columns,
        "total_raw_keys": len(raw_keys),
    }


@router.get("/values/{pwa_code}/{feature_type}/{field}")
async def get_distinct_values(
    pwa_code: str = Path(...),
    feature_type: str = Path(...),
    field: str = Path(...),
):
    db = get_db()
    collection_id, alias = await _find_collection_id(db, pwa_code, feature_type)
    if not collection_id:
        return {"field": field, "mongo_field": field, "values": []}

    # Resolve pg field to mongo field
    mongo_field = get_reverse_key(feature_type, field)
    feat_col = db[f"features_{collection_id}"]

    values = await feat_col.distinct(f"properties.{mongo_field}")
    # Clean: remove None, dicts, lists
    clean = sorted(
        [str(v) for v in values if v is not None and not isinstance(v, (dict, list))],
        key=lambda x: x.lower(),
    )

    return {
        "field": field,
        "mongo_field": mongo_field,
        "values": clean[:500],  # Limit
    }
