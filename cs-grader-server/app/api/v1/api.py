from fastapi import APIRouter
from app.api.v1.endpoints import gemini, cohere, imageToText, multipleFilesToText

api_router = APIRouter()
api_router.include_router(gemini.router, prefix="/gemini", tags=["gemini"])
api_router.include_router(cohere.router, prefix="/cohere", tags=["cohere"])
api_router.include_router(imageToText.router, prefix="/image", tags=["image"])
api_router.include_router(multipleFilesToText.router, prefix="/multiple-files", tags=["multiple-files"]) 