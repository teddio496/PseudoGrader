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
        
        # Construct prompt with instructions
        prompt = f"""Convert this pseudocode to Python code and generate test cases using pytest. Format the response as JSON with two fields:
        - "code": containing just the Python implementation
        - "testing_code": containing the pytest test cases
        
        Return only valid JSON with these two fields, no other text or formatting.

Pseudocode:
{request.prompt}"""
            
        # Generate response
        response = GEMINI_MODEL.generate_content(
            contents=[{"text": prompt}],
            generation_config=generation_config
        )
        
        if not response.text:
            raise HTTPException(status_code=500, detail="No response generated")
        
        # Extract just the Python code from the response
        # Remove any test cases or other text
        python_code = response.text.strip()
        try:
            import json
            response_json = json.loads(response.text.strip())
            python_code = response_json["code"]
        except:
            raise HTTPException(status_code=500, detail="Invalid JSON response from model")
    
        return PromptResponse(
            response=python_code,
            model_used="models/gemini-2.0-pro-exp"
        )
    except Exception as e:
        print(f"Error in generate_response: {str(e)}")  # Debug logging
        raise HTTPException(status_code=500, detail=str(e))