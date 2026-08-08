import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://ble_sense_iuth_user:Ow08irQzjlbfwYSfisDcEq6fejV77E3J@dpg-d9hei4flk1mc73dqus60-a.ohio-postgres.render.com/ble_sense_iuth"
    )
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-cow-health-ml-key-2026")
    ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
