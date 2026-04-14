from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM — local (llama.cpp)
    llama_cpp_base_url: str = "http://localhost:8080/v1"
    # Отдельный URL для малой модели (если запускаешь второй сервер).
    # Если не задан — малые агенты тоже идут на llama_cpp_base_url.
    llama_cpp_base_url_small: str = ""
    llama_cpp_model_large: str = "gemma-4-26B-A4B-it-UD-Q4_K_M"
    llama_cpp_model_small: str = "gemma-4-E4B-it-Q4_K_M"
    use_mock_llm: bool = True

    # Cloud LLM (Anthropic / OpenAI)
    # cloud_provider: "none" | "anthropic" | "openai"
    cloud_provider: str = "none"
    cloud_api_key: str = ""
    # Model name, e.g. "claude-sonnet-4-6" or "gpt-4o"
    cloud_model: str = ""
    # When cloud_provider != "none", cloud is used instead of llama.cpp/mock
    use_cloud_llm: bool = False

    # LLM reliability
    llm_max_retries: int = 3
    llm_retry_backoff: float = 1.0  # base delay in seconds for exponential backoff
    llm_timeout_seconds: int = 120
    llm_max_context_chars: int = 12000  # larger for cloud models
    # Max concurrent in-flight requests per base_url. Local llama.cpp serves one
    # at a time, so default 1 — hosted APIs can raise this via env.
    llm_max_concurrent: int = 1

    # LLM cache
    llm_cache_enabled: bool = True
    llm_cache_ttl_days: int = 30

    # Database
    database_url: str = "sqlite+aiosqlite:///./tz_analyzer.db"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 20

    # CORS
    allowed_origins: list[str] = ["*"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
