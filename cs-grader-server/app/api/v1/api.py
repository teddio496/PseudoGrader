from fastapi import APIRouter
from app.api.v1.endpoints import gemini, cohere, InputToText, pytest, processInput
from app.core.fileToText import router as imageToText_router

api_router = APIRouter()
api_router.include_router(gemini.router, prefix="/gemini", tags=["gemini"])
api_router.include_router(cohere.router, prefix="/cohere", tags=["cohere"])
api_router.include_router(InputToText.router, prefix="/input", tags=["input"])
api_router.include_router(pytest.router, prefix="/pytest", tags=["pytest"])
api_router.include_router(processInput.router, prefix="/process", tags=["process"]) 