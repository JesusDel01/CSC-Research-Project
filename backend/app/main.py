from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.cve import router as cve_router
from app.api.routes.core import router as core_router
from app.api.routes.health import router as health_router
from app.api.routes.honeypot import router as honeypot_router
from app.api.routes.reports import router as reports_router
from app.api.routes.scan_stream import router as scan_stream_router
from app.api.routes.scans import router as scan_router
from app.core.config import settings

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(scan_router, prefix=settings.api_prefix)
app.include_router(scan_stream_router, prefix=settings.api_prefix)
app.include_router(cve_router, prefix=settings.api_prefix)
app.include_router(core_router, prefix=settings.api_prefix)
app.include_router(honeypot_router, prefix=settings.api_prefix)
app.include_router(reports_router, prefix=settings.api_prefix)
