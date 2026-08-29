from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from apps.api.core.config import settings

# Engine configured for asyncpg
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def check_postgis_readiness() -> dict[str, str | bool]:
    """Verify database connection and PostGIS spatial extension availability."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT PostGIS_Full_Version();"))
            version = result.scalar()
            return {
                "connected": True,
                "postgis_available": True,
                "postgis_version": str(version) if version else "Unknown"
            }
    except Exception as exc:
        return {
            "connected": False,
            "postgis_available": False,
            "error": str(exc)
        }
