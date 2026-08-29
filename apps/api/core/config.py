from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Logistics Intelligence API"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/smart_logistics"
    
    # LatentStack AI Router Config
    LATENTSTACK_BASE_URL: str = "https://router.latentstack.dev/v1"
    LATENTSTACK_API_KEY: str = "sk-test-latentstack-key"
    LATENTSTACK_PRIMARY_MODEL: str = "fast-reasoner"
    LATENTSTACK_TIMEOUT_SECONDS: float = 30.0
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = SettingsConfigDict(
        env_file="apps/api/.env",
        extra="ignore"
    )

settings = Settings()

