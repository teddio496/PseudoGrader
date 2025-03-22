from fastapi import APIRouter
from app.api.v1.endpoints import generateCode, InputToText, pytest, evaluateLogic, getResponse
from app.core.fileToText import router as imageToText_router

api_router = APIRouter()
api_router.include_router(generateCode.router, prefix="/generateCode", tags=["generateCode"])
api_router.include_router(InputToText.router, prefix="/inputToText", tags=["inputToText"])
api_router.include_router(pytest.router, prefix="/pytest", tags=["pytest"])
api_router.include_router(evaluateLogic.router, prefix="/evaluateLogic", tags=["pseudocode"]) 
api_router.include_router(getResponse.router, prefix="/getResponse", tags=["getResponse"])