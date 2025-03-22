from fastapi import APIRouter, HTTPException
from app.api.v1.models import PromptRequest, PromptResponse
from app.core.config import GEMINI_MODEL

router = APIRouter()

@router.post("/generate", response_model=PromptResponse)
async def generate_response(request: PromptRequest):
    try:
        generation_config = {
            "temperature": request.temperature
        }
        if request.max_tokens:
            generation_config["max_output_tokens"] = request.max_tokens
            
        response = GEMINI_MODEL.generate_content(
            request.prompt,
            generation_config=generation_config
        )
        return PromptResponse(
            response=response.text,
            model_used="gemini-pro"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 