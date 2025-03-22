from fastapi import APIRouter, HTTPException
from app.api.v1.models import PromptRequest, PromptResponse
from app.core.config import settings

router = APIRouter()

@router.post("/generate", response_model=PromptResponse)
async def generate_response(request: PromptRequest):
    try:
        response = settings.COHERE_CLIENT.generate(
            prompt=request.prompt,
            max_tokens=2048,
            temperature=0.7,
            model=settings.COHERE_MODEL
        )
        return PromptResponse(
            response=response.generations[0].text,
            model_used=settings.COHERE_MODEL
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 