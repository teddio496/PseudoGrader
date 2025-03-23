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
    Orchestrates the complete workflow by calling API endpoints
    
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            
            # Save file contents in memory before sending to avoid stream depletion
            question_form_data = []
            for f in question_files:
                # Read the content
                content = await f.read()
                # Reset the file pointer
                await f.seek(0)
                question_form_data.append(
                    ("files", (f.filename, content, f.content_type))
                )

            pseudocode_form_data = []
            for f in pseudocode_files:
                # Read the content
                content = await f.read()
                # Reset the file pointer
                await f.seek(0)
                pseudocode_form_data.append(
                    ("files", (f.filename, content, f.content_type))
                )
                        
            # Run both inputToText calls concurrently
            async def process_question_files():
                response = await client.post(
                    f"{base_url}/api/v1/inputToText/files-to-text",
                    files=question_form_data
                )
                response.raise_for_status()
                return response.json()
            
            async def process_pseudocode_files():
                response = await client.post(
                    f"{base_url}/api/v1/inputToText/files-to-text",
                    files=pseudocode_form_data
                )
                response.raise_for_status()
                return response.json()
            
            # Run both requests concurrently
            question_processed, pseudocode_processed = await asyncio.gather(
                process_question_files(),
                process_pseudocode_files()
            )
            
            # Extract and combine content from responses
            question_text = "\n".join(question_processed["content"])
            pseudocode_text = "\n".join(pseudocode_processed["content"])

            print(question_text)
            print(pseudocode_text)
            
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
                evaluate_logic(),
                return_exceptions=True
            )
            
            # Handle exceptions from concurrent tasks
            if isinstance(code_response, Exception):
                logger.error(f"Error in code generation: {str(code_response)}")
                code_response = {"error": str(code_response), "status": "failed"}
                
            if isinstance(evaluation_response, Exception):
                logger.error(f"Error in logic evaluation: {str(evaluation_response)}")
                evaluation_response = {"error": str(evaluation_response), "status": "failed"}
        
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
