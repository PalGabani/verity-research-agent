from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _project_root() -> Path:
    config_path = Path(__file__).resolve()
    for parent in config_path.parents:
        if (parent / "apps" / "api" / "pyproject.toml").is_file():
            return parent
    return config_path.parents[1]


PROJECT_ROOT = _project_root()


class Settings(BaseSettings):
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    tavily_api_key: str | None = None
    database_url: str = "sqlite:///./verity.db"
    frontend_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
