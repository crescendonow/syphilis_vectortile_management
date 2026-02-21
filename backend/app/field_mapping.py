"""
Field Mapping: MongoDB (PWA GIS Online) → Postgres column names
ported จาก field_mapping.go — อ้างอิงจาก เปรียบเทียบ Datadic GIS.xlsx
"""

FIELD_MAPPING: dict[str, dict[str, str]] = {
    # ── PIPE ──
    "pipe": {
        "_id":          "pipe_id",
        "projectNo":    "project_no",
        "promiseDate":  "contrac_date",
        "checkDate":    "cap_date",
        "assetCode":    "asset_code",
        "typeId":       "pipe_type",
        "gradeId":      "grade",
        "sizeId":       "pipe_size",
        "classId":      "class",
        "functionId":   "pipe_func",
        "layingId":     "laying",
        "productId":    "product",
        "depth":        "depth",
        "length":       "pipe_long",
        "yearInstall":  "yearinstall",
        "locate":       "locate",
        "pwaCode":      "pwa_code",
        "recordDate":   "rec_date",
        "remark":       "remark",
        "oldProjectNo": "old_project_no",
        "pipeIdPrev":   "pipe_id_prev",
        "_createdBy":   "password",
    },

    # ── VALVE ──
    "valve": {
        "_id":         "valve_id",
        "typeId":      "valve_type",
        "sizeId":      "valve_size",
        "statusId":    "valve_status",
        "depth":       "depth",
        "roundOpen":   "round_open",
        "yearInstall": "yearinstall",
        "drawingPath": "drawingpath",
        "picturePath": "picturepath",
        "pwaCode":     "pwa_code",
        "recordDate":  "rec_date",
        "remark":      "remark",
        "_createdBy":  "password",
    },

    # ── FIREHYDRANT ──
    "firehydrant": {
        "_id":             "fire_id",
        "sizeId":          "fire_size",
        "statusId":        "fire_status",
        "pressure":        "pressure",
        "pressureHistory": "pressure_history",
        "picturePath":     "picturepath",
        "pwaCode":         "pwa_code",
        "recordDate":      "rec_date",
        "remark":          "remark",
        "_createdBy":      "password",
    },

    # ── METER ──
    "meter": {
        "buildingId":     "bldg_id",
        "pipeId":         "pipe_id",
        "custCode":       "custcode",
        "custFullName":   "custname",
        "meterNo":        "meterno",
        "meterSizeCode":  "metersize",
        "beginCustDate":  "bgncustdt",
        "meterRouteCode": "mtrrdroute",
        "meterRouteSeq":  "mtrseq",
        "addressNo":      "addrno",
        "custStat":       "custstat",
        "pwaCode":        "pwa_code",
        "recordDate":     "rec_date",
        "remark":         "remark",
        "_createdBy":     "password",
    },

    # ── BLDG ──
    "bldg": {
        "_id":            "bldg_id",
        "houseCode":      "housecode",
        "useStatusId":    "use_status",
        "custCode":       "custcode",
        "custFullName":   "custname",
        "useTypeId":      "usetype",
        "buildingTypeId": "bl_type",
        "addressNo":      "addrno",
        "pwaCode":        "pwa_code",
        "building":       "building",
        "floor":          "floor",
        "villageNo":      "villageno",
        "village":        "village",
        "soi":            "soi",
        "road":           "road",
        "subDistrict":    "subdistrict",
        "district":       "district",
        "province":       "province",
        "zipcode":        "zipcode",
        "custCodeOld":    "custcode_old",
        "recordDate":     "rec_date",
        "remark":         "remark",
        "_createdBy":     "password",
    },

    # ── LEAKPOINT ──
    "leakpoint": {
        "_id":             "leak_id",
        "leakNo":          "leak_no",
        "leakDatetime":    "leakdate",
        "locate":          "locate",
        "cause":           "leakcause",
        "depth":           "leakdepth",
        "picturePath":     "picturepath",
        "repairBy":        "repairby",
        "repairCost":      "repaircost",
        "repairDatetime":  "repairdate",
        "detail":          "leakdetail",
        "checker":         "leakchecker",
        "pipeId":          "pipe_id",
        "pipeTypeId":      "pipe_type",
        "pipeSizesId":     "pipe_size",
        "informer":        "leak_informer",
        "pwaCode":         "pwa_code",
        "recordDate":      "rec_date",
        "remark":          "remark",
        "typeId":          "leak_type",
        "LEAKCAUSE_ID":    "leakcause_id",
        "LEAK_WOUND":      "leak_wound",
        "_createdBy":      "password",
    },

    # ── PWA_WATERWORKS ──
    "pwa_waterworks": {},

    # ── STRUCT ──
    "struct": {},

    # ── PIPE_SERV ──
    "pipe_serv": {},
}

# Reverse mapping: pg_key → mongo_key (per feature type)
REVERSE_MAPPING: dict[str, dict[str, str]] = {}
for ft, mapping in FIELD_MAPPING.items():
    REVERSE_MAPPING[ft] = {v: k for k, v in mapping.items()}


def map_properties(feature_type: str, mongo_props: dict) -> dict:
    """แปลง MongoDB properties → Postgres field names"""
    mapping = FIELD_MAPPING.get(feature_type)
    if not mapping:
        return mongo_props
    if len(mapping) == 0:
        return mongo_props

    mapped = {}
    for mongo_key, pg_key in mapping.items():
        if mongo_key in mongo_props:
            val = mongo_props[mongo_key]
            # Clean: skip nested objects/arrays
            if isinstance(val, (dict, list)):
                continue
            mapped[pg_key] = val

    return mapped


def get_reverse_key(feature_type: str, pg_key: str) -> str:
    """หา MongoDB key จาก Postgres key"""
    rev = REVERSE_MAPPING.get(feature_type, {})
    return rev.get(pg_key, pg_key)
