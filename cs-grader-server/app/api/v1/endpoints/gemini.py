from fastapi import APIRouter, HTTPException
from app.api.v1.models import PromptRequest, PromptResponse
from app.core.config import GEMINI_MODEL, GOOGLE_API_KEY
import google.generativeai as genai

router = APIRouter()

@router.post("/generate", response_model=PromptResponse)
async def generate_response(request: PromptRequest):
    try:
        # Ensure API is configured
        genai.configure(api_key=GOOGLE_API_KEY, transport="rest")
        
        # Use preset generation config
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "candidate_count": 1,
            "max_output_tokens": 2048
        }
            
        # Generate response
        response = GEMINI_MODEL.generate_content(
            contents=[{"text": request.prompt}],
            generation_config=generation_config
        )
        
        if not response.text:
            raise HTTPException(status_code=500, detail="No response generated")
            
        return PromptResponse(
            response=response.text,
            model_used="models/gemini-2.0-pro-exp"
        )
    except Exception as e:
        print(f"Error in generate_response: {str(e)}")  # Debug logging
        raise HTTPException(status_code=500, detail=str(e)) 