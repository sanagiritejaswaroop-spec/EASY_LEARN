import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openrouter/free")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    
    # Backwards compatibility attributes
    AI_API_KEY: str = os.getenv("OPENROUTER_API_KEY") or os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("OPENROUTER_MODEL") or os.getenv("AI_MODEL", "openrouter/free")
    AI_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL") or os.getenv("AI_BASE_URL", "https://openrouter.ai/api/v1")
    
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
