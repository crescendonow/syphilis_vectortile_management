"""
MongoDB Connection — ใช้ motor (async driver)
อ้างอิงจาก config.ini ของ monthly_mongo_export.py
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# ── Global State ──
_client: AsyncIOMotorClient | None = None
_db = None
_sync_client: MongoClient | None = None


def get_settings():
    return {
        "mongo_uri": os.getenv(
            "MONGO_URI",
            "mongodb://i-bitz.admin:lL88i7uK88TU@192.168.246.233:27017,192.168.246.233:27018,192.168.246.233:27019/admin?retryWrites=true&loadBalanced=false&replicaSet=rs0&readPreference=primary&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1",
        ),
        "mongo_database": os.getenv("MONGO_DATABASE", "vallaris_feature"),
        "app_database": os.getenv("APP_DATABASE", "syphilis"),
    }


async def connect_db():
    global _client, _db, _sync_client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings["mongo_uri"])
    _db = _client[settings["mongo_database"]]

    # Sync client สำหรับ tile generation (vtzero ใช้ sync)
    _sync_client = MongoClient(settings["mongo_uri"])

    # Test connection
    await _client.admin.command("ping")
    print(f"✅ Connected to MongoDB: {settings['mongo_database']}")


async def close_db():
    global _client, _sync_client
    if _client:
        _client.close()
    if _sync_client:
        _sync_client.close()
    print("🔌 MongoDB connection closed")


def get_db():
    """Get async MongoDB database (vallaris_feature)"""
    return _db


def get_app_db():
    """Get async MongoDB database (syphilis — app metadata)"""
    settings = get_settings()
    return _client[settings["app_database"]]


def get_sync_db():
    """Get sync MongoDB database for tile generation"""
    settings = get_settings()
    return _sync_client[settings["mongo_database"]]
