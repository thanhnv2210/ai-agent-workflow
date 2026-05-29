import os
from pydantic_settings import BaseSettings


def _env_file() -> str:
    env = os.getenv('APP_ENV', 'local')
    return f'.env.{env}'


class Settings(BaseSettings):
    app_env: str = 'local'
    anthropic_api_key: str = ''
    ollama_base_url: str = 'http://localhost:11434'
    cors_origins: str = 'http://localhost:3013'

    model_config = {'env_file': _env_file(), 'extra': 'ignore'}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(',') if o.strip()]


settings = Settings()
