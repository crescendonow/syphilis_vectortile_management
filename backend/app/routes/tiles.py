"""
Vector Tile Generation — สร้าง .pbf tiles จาก MongoDB GeoJSON
รองรับ:
  1. Registered source:  /tiles/{source_id}/{z}/{x}/{y}.pbf
  2. Direct access:      /tiles/direct/{pwa_code}/{feature_type}/{z}/{x}/{y}.pbf
  3. Query params:       ?f_{field}={value}  — filter
                         ?columns={col1,col2} — select columns
"""
import math
import struct
import io
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Response
from app.database import get_db, get_app_db, get_sync_db
from app.field_mapping import map_properties, get_reverse_key, FIELD_MAPPING

router = APIRouter()

# ── Tile Math ──
def tile_to_bbox(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Convert tile coords to lat/lon bounding box"""
    n = 2.0 ** z
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_min, lat_min, lon_max, lat_max


def lnglat_to_tile_px(lng: float, lat: float, bbox: tuple, extent: int = 4096) -> tuple[int, int]:
    """Convert lng/lat to tile pixel coordinates"""
    lon_min, lat_min, lon_max, lat_max = bbox
    x = int((lng - lon_min) / (lon_max - lon_min) * extent)
    y = int((lat_max - lat) / (lat_max - lat_min) * extent)
    return x, y


# ── Simple MVT Encoder (Protobuf) ──
def encode_varint(value: int) -> bytes:
    """Encode unsigned varint"""
    parts = []
    while value > 0x7F:
        parts.append((value & 0x7F) | 0x80)
        value >>= 7
    parts.append(value & 0x7F)
    return bytes(parts)


def encode_sint(value: int) -> bytes:
    """Encode signed varint (zigzag)"""
    return encode_varint((value << 1) ^ (value >> 63))


def encode_field(field_num: int, wire_type: int) -> bytes:
    return encode_varint((field_num << 3) | wire_type)


def encode_length_delimited(field_num: int, data: bytes) -> bytes:
    return encode_field(field_num, 2) + encode_varint(len(data)) + data


def encode_string(field_num: int, s: str) -> bytes:
    data = s.encode("utf-8")
    return encode_length_delimited(field_num, data)


def encode_geometry(geom_type: str, coordinates, bbox: tuple, extent: int = 4096) -> tuple[int, bytes]:
    """Encode geometry to MVT command sequence"""
    commands = []

    if geom_type == "Point":
        px, py = lnglat_to_tile_px(coordinates[0], coordinates[1], bbox, extent)
        commands.extend([
            (1 << 3) | 1,  # MoveTo, count=1
        ])
        commands.append(((px << 1) ^ (px >> 31)) & 0xFFFFFFFF)
        commands.append(((py << 1) ^ (py >> 31)) & 0xFFFFFFFF)
        return 1, commands

    elif geom_type == "LineString":
        if len(coordinates) < 2:
            return 0, []
        cx, cy = 0, 0
        # MoveTo first point
        px, py = lnglat_to_tile_px(coordinates[0][0], coordinates[0][1], bbox, extent)
        dx, dy = px - cx, py - cy
        commands.append((1 << 3) | 1)
        commands.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
        commands.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
        cx, cy = px, py

        # LineTo remaining points
        line_cmds = []
        for coord in coordinates[1:]:
            px, py = lnglat_to_tile_px(coord[0], coord[1], bbox, extent)
            dx, dy = px - cx, py - cy
            if dx == 0 and dy == 0:
                continue
            line_cmds.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
            line_cmds.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
            cx, cy = px, py

        if line_cmds:
            commands.append((2 << 3) | (len(line_cmds) // 2))
            commands.extend(line_cmds)
        return 2, commands

    elif geom_type == "Polygon":
        all_commands = []
        for ring in coordinates:
            if len(ring) < 3:
                continue
            cx, cy = 0, 0 if not all_commands else (cx, cy)
            # MoveTo
            px, py = lnglat_to_tile_px(ring[0][0], ring[0][1], bbox, extent)
            dx, dy = px - cx, py - cy
            all_commands.append((1 << 3) | 1)
            all_commands.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
            all_commands.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
            cx, cy = px, py

            # LineTo
            line_cmds = []
            for coord in ring[1:-1]:
                px, py = lnglat_to_tile_px(coord[0], coord[1], bbox, extent)
                dx, dy = px - cx, py - cy
                if dx == 0 and dy == 0:
                    continue
                line_cmds.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
                line_cmds.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
                cx, cy = px, py

            if line_cmds:
                all_commands.append((2 << 3) | (len(line_cmds) // 2))
                all_commands.extend(line_cmds)

            # ClosePath
            all_commands.append((7 << 3) | 1)
        return 3, all_commands

    elif geom_type == "MultiPoint":
        all_cmds = []
        cx, cy = 0, 0
        for pt in coordinates:
            px, py = lnglat_to_tile_px(pt[0], pt[1], bbox, extent)
            dx, dy = px - cx, py - cy
            all_cmds.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
            all_cmds.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
            cx, cy = px, py
        if all_cmds:
            commands = [(1 << 3) | (len(all_cmds) // 2)] + all_cmds
            return 1, commands
        return 0, []

    elif geom_type == "MultiLineString":
        all_commands = []
        cx, cy = 0, 0
        for line in coordinates:
            if len(line) < 2:
                continue
            px, py = lnglat_to_tile_px(line[0][0], line[0][1], bbox, extent)
            dx, dy = px - cx, py - cy
            all_commands.append((1 << 3) | 1)
            all_commands.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
            all_commands.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
            cx, cy = px, py

            line_cmds = []
            for coord in line[1:]:
                px, py = lnglat_to_tile_px(coord[0], coord[1], bbox, extent)
                dx, dy = px - cx, py - cy
                if dx == 0 and dy == 0:
                    continue
                line_cmds.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
                line_cmds.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
                cx, cy = px, py

            if line_cmds:
                all_commands.append((2 << 3) | (len(line_cmds) // 2))
                all_commands.extend(line_cmds)
        return 2, all_commands

    elif geom_type == "MultiPolygon":
        all_commands = []
        cx, cy = 0, 0
        for polygon in coordinates:
            for ring in polygon:
                if len(ring) < 3:
                    continue
                px, py = lnglat_to_tile_px(ring[0][0], ring[0][1], bbox, extent)
                dx, dy = px - cx, py - cy
                all_commands.append((1 << 3) | 1)
                all_commands.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
                all_commands.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
                cx, cy = px, py

                line_cmds = []
                for coord in ring[1:-1]:
                    px, py = lnglat_to_tile_px(coord[0], coord[1], bbox, extent)
                    dx, dy = px - cx, py - cy
                    if dx == 0 and dy == 0:
                        continue
                    line_cmds.append(((dx << 1) ^ (dx >> 31)) & 0xFFFFFFFF)
                    line_cmds.append(((dy << 1) ^ (dy >> 31)) & 0xFFFFFFFF)
                    cx, cy = px, py

                if line_cmds:
                    all_commands.append((2 << 3) | (len(line_cmds) // 2))
                    all_commands.extend(line_cmds)
                all_commands.append((7 << 3) | 1)
        return 3, all_commands

    return 0, []


def build_mvt_tile(layer_name: str, features: list[dict], bbox: tuple, extent: int = 4096) -> bytes:
    """Build a complete MVT tile with one layer"""

    # Collect keys and values
    keys_list = []
    keys_index = {}
    values_list = []
    values_index = {}

    encoded_features = []

    for feat in features:
        geom = feat.get("geometry", {})
        geom_type = geom.get("type", "")
        coordinates = geom.get("coordinates")
        if not coordinates:
            continue

        mvt_type, geom_commands = encode_geometry(geom_type, coordinates, bbox, extent)
        if mvt_type == 0 or not geom_commands:
            continue

        # Encode properties as tags
        props = feat.get("properties", {})
        tags = []
        for k, v in props.items():
            if v is None:
                continue

            if k not in keys_index:
                keys_index[k] = len(keys_list)
                keys_list.append(k)

            val_key = (type(v).__name__, v)
            if val_key not in values_index:
                values_index[val_key] = len(values_list)
                values_list.append(v)

            tags.append(keys_index[k])
            tags.append(values_index[val_key])

        # Build feature protobuf
        feat_data = b""
        # tags (field 2, packed varints)
        if tags:
            tag_bytes = b"".join(encode_varint(t) for t in tags)
            feat_data += encode_length_delimited(2, tag_bytes)
        # type (field 3, varint)
        feat_data += encode_field(3, 0) + encode_varint(mvt_type)
        # geometry (field 4, packed varints)
        geom_bytes = b"".join(encode_varint(c) for c in geom_commands)
        feat_data += encode_length_delimited(4, geom_bytes)

        encoded_features.append(feat_data)

    if not encoded_features:
        return b""

    # Build layer
    layer_data = b""
    # name (field 1)
    layer_data += encode_string(1, layer_name)
    # features (field 2)
    for ef in encoded_features:
        layer_data += encode_length_delimited(2, ef)
    # keys (field 3)
    for key in keys_list:
        layer_data += encode_string(3, key)
    # values (field 4)
    for val in values_list:
        val_msg = b""
        if isinstance(val, str):
            val_msg = encode_string(1, val)
        elif isinstance(val, float):
            val_msg = encode_field(3, 1) + struct.pack("<d", val)
        elif isinstance(val, int):
            if val >= 0:
                val_msg = encode_field(4, 0) + encode_varint(val)
            else:
                val_msg = encode_field(5, 0) + encode_sint(val)
        elif isinstance(val, bool):
            val_msg = encode_field(7, 0) + encode_varint(1 if val else 0)
        else:
            val_msg = encode_string(1, str(val))
        layer_data += encode_length_delimited(4, val_msg)
    # extent (field 5)
    layer_data += encode_field(5, 0) + encode_varint(extent)
    # version (field 15)
    layer_data += encode_field(15, 0) + encode_varint(2)

    # Build tile
    tile_data = encode_length_delimited(3, layer_data)
    return tile_data


# ── Helper: fetch features from MongoDB ──
def fetch_features_sync(
    collection_id: str,
    feature_type: str,
    bbox: tuple,
    filters: dict[str, str] | None = None,
    columns: list[str] | None = None,
) -> list[dict]:
    """Fetch GeoJSON features from MongoDB within bbox, apply filters & column selection"""
    db = get_sync_db()
    feat_col = db[f"features_{collection_id}"]

    lon_min, lat_min, lon_max, lat_max = bbox

    # GeoJSON query within bbox using $geoIntersects is slow on unindexed data
    # Instead, fetch all and filter — for tiles we rely on the frontend zoom level
    # For better performance, use a 2dsphere index on geometry field
    query = {}

    # Apply property filters
    if filters:
        mapping = FIELD_MAPPING.get(feature_type, {})
        reverse = {v: k for k, v in mapping.items()} if mapping else {}
        for pg_key, val in filters.items():
            mongo_key = reverse.get(pg_key, pg_key)
            query[f"properties.{mongo_key}"] = val

    projection = {"geometry": 1, "properties": 1, "_id": 0}
    cursor = feat_col.find(query, projection)

    features = []
    for doc in cursor:
        geom = doc.get("geometry")
        if not geom:
            continue

        # Simple bbox filter for point geometries
        geom_type = geom.get("type", "")
        coords = geom.get("coordinates")
        if not coords:
            continue

        # Check if any coordinate falls within bbox
        if geom_type == "Point":
            lng, lat = coords[0], coords[1]
            if not (lon_min <= lng <= lon_max and lat_min <= lat <= lat_max):
                continue

        # Map properties
        raw_props = doc.get("properties", {})
        mapped = map_properties(feature_type, raw_props)

        # Column selection
        if columns:
            mapped = {k: v for k, v in mapped.items() if k in columns}

        features.append({
            "geometry": geom,
            "properties": mapped,
        })

    return features


# ── Tile Endpoints ──

@router.get("/tiles/{source_id}/{z}/{x}/{y}.pbf")
async def serve_tile_registered(
    source_id: str,
    z: int,
    x: int,
    y: int,
    request: Request,
):
    app_db = get_app_db()
    source = await app_db["tile_sources"].find_one({"source_id": source_id})
    if not source:
        raise HTTPException(404, "Source not found")

    return _generate_tile(
        collection_id=source["collection_id"],
        feature_type=source["feature_type"],
        layer_name=source.get("alias", source["feature_type"]),
        z=z, x=x, y=y,
        request=request,
    )


@router.get("/tiles/direct/{pwa_code}/{feature_type}/{z}/{x}/{y}.pbf")
async def serve_tile_direct(
    pwa_code: str,
    feature_type: str,
    z: int,
    x: int,
    y: int,
    request: Request,
):
    db = get_db()
    alias = f"{pwa_code}_{feature_type}"
    meta = await db["collections"].find_one({"alias": alias})
    if not meta:
        raise HTTPException(404, f"Collection not found: {alias}")

    return _generate_tile(
        collection_id=str(meta["_id"]),
        feature_type=feature_type,
        layer_name=feature_type,
        z=z, x=x, y=y,
        request=request,
    )


def _generate_tile(
    collection_id: str,
    feature_type: str,
    layer_name: str,
    z: int,
    x: int,
    y: int,
    request: Request,
) -> Response:
    bbox = tile_to_bbox(z, x, y)

    # Parse filters from query params (f_xxx=value)
    filters = {}
    columns_param = request.query_params.get("columns", "")
    columns = [c.strip() for c in columns_param.split(",") if c.strip()] if columns_param else None

    for key, val in request.query_params.items():
        if key.startswith("f_"):
            filters[key[2:]] = val

    features = fetch_features_sync(collection_id, feature_type, bbox, filters, columns)
    tile_bytes = build_mvt_tile(layer_name, features, bbox)

    return Response(
        content=tile_bytes,
        media_type="application/x-protobuf",
        headers={
            "Content-Encoding": "identity",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
        },
    )
