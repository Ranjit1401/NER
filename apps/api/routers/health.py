from fastapi import APIRouter
from apps.api.core.config import settings
from apps.api.core.database import check_postgis_readiness

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check() -> dict:
    postgis_status = await check_postgis_readiness()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": postgis_status
    }

@router.get("/version")
async def version_check() -> dict:
    return {
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }
