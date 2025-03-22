from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import API_V1_STR, PROJECT_NAME
from app.api.v1.api import api_router
from app.core.logging import get_logger

logger = get_logger("main")

app = FastAPI(
    title=PROJECT_NAME,
    openapi_url=f"{API_V1_STR}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(api_router, prefix=API_V1_STR)

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": f"Welcome to {PROJECT_NAME}"}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up FastAPI application")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down FastAPI application")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server with uvicorn")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 