from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from typing import Dict, Any, List
import logging
from app.core.fileToText import process_file_to_text

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.post("/process-files")
async def process_question_and_pseudocode(
    question_files: List[UploadFile] = File(...),
    pseudocode_files: List[UploadFile] = File(...),
    request: Request = None
) -> Dict[str, Any]:
    """
    Process two lists of files: one for question description and one for pseudocode.
    Uses the files-to-text endpoint to process both lists and combines the results.
    
    Args:
        question_files (List[UploadFile]): List of files containing the question description
        pseudocode_files (List[UploadFile]): List of files containing the pseudocode
        request (Request): The FastAPI request object for debugging
        
    Returns:
        Dict[str, Any]: A dictionary containing the processed results for both question and pseudocode files
        
    Raises:
        HTTPException: If any file is invalid or processing fails
    """
    try:
        # Log request details for debugging
        if request:
            logger.info(f"Request headers: {request.headers}")
            logger.info(f"Request method: {request.method}")
            logger.info(f"Request URL: {request.url}")
        
        if not question_files or not pseudocode_files:
            logger.error("Missing files in request")
            raise HTTPException(
                status_code=400,
                detail="Both question files and pseudocode files must be provided"
            )
            
        logger.info(f"Received {len(question_files)} question files and {len(pseudocode_files)} pseudocode files")
        
        # Process question files
        question_results = []
        for file in question_files:
            try:
                result = await process_file_to_text(file)
                result["filename"] = file.filename
                question_results.append(result)
            except Exception as e:
                logger.error(f"Error processing question file {file.filename}: {str(e)}")
                question_results.append({
                    "filename": file.filename,
                    "error": str(e),
                    "status": "error"
                })
        
        # Process pseudocode files
        pseudocode_results = []
        for file in pseudocode_files:
            try:
                result = await process_file_to_text(file)
                result["filename"] = file.filename
                pseudocode_results.append(result)
            except Exception as e:
                logger.error(f"Error processing pseudocode file {file.filename}: {str(e)}")
                pseudocode_results.append({
                    "filename": file.filename,
                    "error": str(e),
                    "status": "error"
                })
        
        return {
            "question": {"results": question_results},
            "pseudocode": {"results": pseudocode_results}
        }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        ) 