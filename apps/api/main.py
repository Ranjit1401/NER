from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apps.api.core.config import settings
from apps.api.routers import health, ai, disasters, roads, hubs, dispatches, sync
from apps.api.services.ai_service import LatentStackClientError

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Error Handler for LatentStack Client Errors
@app.exception_handler(LatentStackClientError)
async def latentstack_exception_handler(request: Request, exc: LatentStackClientError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": "AI Gateway Error", "error": str(exc)}
    )

# Routers
app.include_router(health.router)
app.include_router(ai.router, prefix="/api/v1")
app.include_router(disasters.router, prefix="/api/v1")
app.include_router(roads.router, prefix="/api/v1")
app.include_router(hubs.router, prefix="/api/v1")
app.include_router(dispatches.dispatch_router, prefix="/api/v1")
app.include_router(dispatches.audit_router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")

@app.get("/")
async def root() -> dict:
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": "/health"
    }
