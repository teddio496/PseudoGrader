from dotenv import load_dotenv
import os
import google.generativeai as genai
import cohere

# Load environment variables
load_dotenv()

# API Settings
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")
if not COHERE_API_KEY:
    raise ValueError("COHERE_API_KEY environment variable is not set")
if not GOOGLE_APPLICATION_CREDENTIALS:
    raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set")

# Configure Gemini API with defaults
genai.configure(
    api_key=GOOGLE_API_KEY,
    transport="rest"  # Force REST transport
)

# Initialize Gemini model
GEMINI_MODEL = genai.GenerativeModel('models/gemini-2.0-pro-exp')

# Configure Cohere API
COHERE_CLIENT = cohere.Client(api_key=COHERE_API_KEY)
COHERE_MODEL = "command-a-03-2025"

# API Config
API_V1_STR = "/api/v1"
PROJECT_NAME = "CS Grader API" 