from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import API_V1_STR, PROJECT_NAME
from app.api.v1.api import api_router

app = FastAPI(
    title=PROJECT_NAME,
    description="API for CS Grader with Gemini and Cohere integration",
    version="1.0.0",
    openapi_url=f"{API_V1_STR}/openapi.json",
    docs_url=f"{API_V1_STR}/docs",  # Swagger UI endpoint
    redoc_url=f"{API_V1_STR}/redoc",  # ReDoc endpoint
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {PROJECT_NAME}",
        "docs_url": f"{API_V1_STR}/docs",
        "redoc_url": f"{API_V1_STR}/redoc",
        "openapi_url": f"{API_V1_STR}/openapi.json"
    } 