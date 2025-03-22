from fastapi import APIRouter, HTTPException
from app.api.v1.models import PromptRequest, PromptResponse
from app.core.config import COHERE_CLIENT, COHERE_MODEL

router = APIRouter()

@router.post("/generate", response_model=PromptResponse)
async def generate_response(request: PromptRequest):
    try:
        response = COHERE_CLIENT.generate(
            prompt=request.prompt,
            max_tokens=2048,
            temperature=0.7,
            model=COHERE_MODEL
        )
        return PromptResponse(
            response=response.generations[0].text,
            model_used=COHERE_MODEL
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 