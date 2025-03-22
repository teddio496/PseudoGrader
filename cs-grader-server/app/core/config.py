from dotenv import load_dotenv
import os
import google.generativeai as genai
import cohere
from pydantic_settings import BaseSettings
from pathlib import Path

# Load environment variables
load_dotenv()

# get the directory of this config.py file
config_dir = os.path.dirname(os.path.abspath(__file__))


class Settings(BaseSettings):
    # API Keys
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    COHERE_API_KEY: str = os.getenv("COHERE_API_KEY", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

    # API Config
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CS Grader API"

    # Model Configurations
    GEMINI_MODEL_NAME: str = "models/gemini-2.0-pro-exp"
    COHERE_MODEL: str = "command-a-03-2025"
    COHERE_EMBEDDING_MODEL: str = "embed-english-v3.0"

    # Database Configurations
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", str(Path(config_dir) / ".." / ".." / "cs-grader-embeddings" / "chroma_db"))

    class Config:
        case_sensitive = True

# Create settings instance
settings = Settings()

# Validate required settings
if not settings.GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")
if not settings.COHERE_API_KEY:
    raise ValueError("COHERE_API_KEY environment variable is not set")
if not settings.GOOGLE_APPLICATION_CREDENTIALS:
    raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set")

# Configure Gemini API with defaults
genai.configure(
    api_key=settings.GOOGLE_API_KEY,
    transport="rest"  # Force REST transport
)

# Initialize Gemini model
GEMINI_MODEL = genai.GenerativeModel(settings.GEMINI_MODEL_NAME)

# Configure Cohere API
COHERE_CLIENT = cohere.Client(api_key=settings.COHERE_API_KEY) 