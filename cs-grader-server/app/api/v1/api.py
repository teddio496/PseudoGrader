from fastapi import APIRouter
from app.api.v1.endpoints import gemini, cohere, multipleFilesToText, pytest, pseudocode
from app.core.fileToText import router as imageToText_router

api_router = APIRouter()
api_router.include_router(gemini.router, prefix="/gemini", tags=["gemini"])
api_router.include_router(cohere.router, prefix="/cohere", tags=["cohere"])
api_router.include_router(multipleFilesToText.router, prefix="/multiple-files", tags=["multiple-files"])
api_router.include_router(pytest.router, prefix="/pytest", tags=["pytest"])
api_router.include_router(pseudocode.router, prefix="/pseudocode", tags=["pseudocode"]) 