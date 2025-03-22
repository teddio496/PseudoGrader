from fastapi import APIRouter, HTTPException
from app.api.v1.models import PromptRequest, PromptResponse
from app.core.config import COHERE_CLIENT

router = APIRouter()

@router.post("/generate", response_model=PromptResponse)
async def generate_response(request: PromptRequest):
    try:
        response = COHERE_CLIENT.generate(
            prompt=request.prompt,
            max_tokens=request.max_tokens or 256,
            temperature=request.temperature,
            model=request.model
        )
        return PromptResponse(
            response=response.generations[0].text,
            model_used=f"cohere-{request.model}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 