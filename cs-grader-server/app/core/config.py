from dotenv import load_dotenv
import os
import google.generativeai as genai
import cohere

# Load environment variables
load_dotenv()

# API Settings
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")
if not COHERE_API_KEY:
    raise ValueError("COHERE_API_KEY environment variable is not set")

# Configure Gemini API
genai.configure(api_key=GOOGLE_API_KEY)
GEMINI_MODEL = genai.GenerativeModel('gemini-pro')

# Configure Cohere API
COHERE_CLIENT = cohere.Client(COHERE_API_KEY)

# API Config
API_V1_STR = "/api/v1"
PROJECT_NAME = "CS Grader API" 