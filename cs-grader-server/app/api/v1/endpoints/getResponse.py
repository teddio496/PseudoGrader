from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from typing import Dict, Any, List
from app.core.logging import setup_logger
import httpx
import asyncio

router = APIRouter()
logger = setup_logger("getResponse")

@router.post("/get-response")
async def get_complete_response(
    request: Request,
    question_files: List[UploadFile] = File(...),
    pseudocode_files: List[UploadFile] = File(...)
) -> Dict[str, Any]:
    """
    Orchestrates the complete workflow by calling API endpoints:
    1. Process input files using /process/process-files endpoint
    2. Generate code using /gemini/generate endpoint
    3. Evaluate logic using /pseudocode/evaluate endpoint
    4. Combine all results into a single response
    
    Args:
        request (Request): The FastAPI request object
        question_files (List[UploadFile]): List of files containing the question description
        pseudocode_files (List[UploadFile]): List of files containing the pseudocode
        
    Returns:
        Dict[str, Any]: Combined response containing all processing results
    """
    try:
        # Get base URL from request
        base_url = str(request.base_url).rstrip('/')
        
        # Process input files
        logger.info("Processing input files...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Process question files
            question_form_data = {}
            for i, f in enumerate(question_files):
                question_form_data[f"files"] = (f.filename, f.file, f.content_type)
            
            # Call inputToText endpoint for question files
            question_response = await client.post(
                f"{base_url}/api/v1/inputToText/files-to-text",
                files=question_form_data
            )
            question_response.raise_for_status()
            question_processed = question_response.json()
            
            # Process pseudocode files
            pseudocode_form_data = {}
            for i, f in enumerate(pseudocode_files):
                pseudocode_form_data[f"files"] = (f.filename, f.file, f.content_type)
            
            # Call inputToText endpoint for pseudocode files
            pseudocode_response = await client.post(
                f"{base_url}/api/v1/inputToText/files-to-text",
                files=pseudocode_form_data
            )
            pseudocode_response.raise_for_status()
            pseudocode_processed = pseudocode_response.json()
            
            # Extract and combine content from responses
            question_text = "\n".join(question_processed["content"])
            pseudocode_text = "\n".join(pseudocode_processed["content"])
            
            # Combine the results
            processed_input = {
                "question": question_processed,
                "pseudocode": pseudocode_processed
            }
        
        if not question_text or not pseudocode_text:
            raise HTTPException(
                status_code=400,
                detail="Failed to process input files"
            )
        
        # Run generate code and evaluate logic concurrently
        logger.info("Generating code and evaluating logic...")
        async with httpx.AsyncClient(timeout=120.0) as client:
            async def generate_code():
                response = await client.post(
                    f"{base_url}/api/v1/generateCode/generate",
                    json={
                        "prompt": pseudocode_text,
                        "description": question_text,
                        "max_retries": 3
                    }
                )
                response.raise_for_status()
                return response.json()
            
            async def evaluate_logic():
                response = await client.post(
                    f"{base_url}/api/v1/evaluateLogic/evaluate",
                    json={
                        "question": question_text,
                        "pseudocode": pseudocode_text
                    }
                )
                response.raise_for_status()
                return response.json()
            
            # Run both requests concurrently
            code_response, evaluation_response = await asyncio.gather(
                generate_code(),
                evaluate_logic()
            )
        
        # Step 4: Combine all results
        return {
            "input_processing": processed_input,
            "code_generation": code_response,
            "logic_evaluation": evaluation_response
        }
        
    except httpx.HTTPError as e:
        logger.error(f"HTTP error in get_complete_response: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An HTTP error occurred while processing the request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error in get_complete_response: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the request: {str(e)}"
        )
