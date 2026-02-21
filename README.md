# Syphilis — Vector Tile & Style Manager

ระบบจัดการ Vector Tiles และ Map Styles สำหรับ PWA GIS Online  
เชื่อมต่อ MongoDB (`vallaris_feature`) โดยตรง พร้อม Visual Style Editor

---

## 📐 Project Structure

```
C:\Projects\syphilis\
│
├── backend\                      # FastAPI Backend
│   ├── app\
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app + static file serving
│   │   ├── database.py           # MongoDB connection (motor async + pymongo sync)
│   │   ├── field_mapping.py      # MongoDB → Postgres field mapping (จาก Go)
│   │   └── routes\
│   │       ├── __init__.py
│   │       ├── stats.py          # GET /api/stats
│   │       ├── collections.py    # GET /api/collections (browse MongoDB)
│   │       ├── columns.py        # GET /api/columns, /api/values (column browser)
│   │       ├── sources.py        # CRUD /api/sources (register tile sources)
│   │       ├── styles.py         # CRUD /api/styles + style.json serving
│   │       └── tiles.py          # Vector tile generation (.pbf)
│   └── requirements.txt
│
├── frontend\                     # Static Frontend (HTML/JS/CSS แยกไฟล์)
│   ├── index.html                # Main SPA shell
│   ├── css\
│   │   └── style.css             # Custom styles (animations, scrollbar, chips)
│   └── js\
│       └── app.js                # All application logic (SPA routing, API calls)
│
├── scripts\
│   └── install_service.bat       # Install as Windows Service via NSSM
│
├── .env                          # Environment variables template
├── install.bat                   # First-time setup
├── start.bat                     # Start development server
└── README.md
```

## 🔧 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | HTML + Tailwind CSS (CDN) + Vanilla JS |
| Backend   | Python FastAPI + Uvicorn            |
| Database  | MongoDB (vallaris_feature) via Motor (async) + PyMongo (sync) |
| Map       | MapLibre GL JS + Custom MVT encoder |
| Tile      | Mapbox Vector Tile (.pbf) generated on-the-fly |

## 🔌 API Endpoints

| Method | Endpoint                                           | Description                    |
|--------|-----------------------------------------------------|--------------------------------|
| GET    | `/api/stats`                                        | Dashboard statistics           |
| GET    | `/api/collections?search=&feature_type=&skip=&limit=` | Browse MongoDB collections   |
| GET    | `/api/columns/{pwa_code}/{feature_type}`            | Column browser with mapping    |
| GET    | `/api/values/{pwa_code}/{feature_type}/{field}`     | Distinct values for a field    |
| GET    | `/api/sources`                                      | List registered tile sources   |
| POST   | `/api/sources`                                      | Register new tile source       |
| DELETE | `/api/sources/{source_id}`                          | Remove tile source             |
| GET    | `/api/styles`                                       | List map styles                |
| POST   | `/api/styles`                                       | Create map style               |
| PUT    | `/api/styles/{style_id}`                            | Update map style               |
| DELETE | `/api/styles/{style_id}`                            | Delete map style               |
| GET    | `/api/styles/{style_id}/style.json`                 | Serve MapLibre style.json      |
| GET    | `/tiles/{source_id}/{z}/{x}/{y}.pbf`                | Vector tile (registered)       |
| GET    | `/tiles/direct/{pwa_code}/{ft}/{z}/{x}/{y}.pbf`    | Vector tile (direct access)    |

### Tile Query Parameters

```
?f_pipe_type=PVC          # Filter by property
?f_pipe_size=100          # Multiple filters
?columns=pipe_type,pipe_size,pwa_code   # Select columns
```

---
