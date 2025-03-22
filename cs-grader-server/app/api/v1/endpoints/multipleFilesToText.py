from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from typing import Dict, Any, List
import io
from PIL import Image
from google.cloud import vision
import os
from app.core.config import GOOGLE_APPLICATION_CREDENTIALS
import logging
from app.core.fileToText import process_file_to_text, MAX_FILE_SIZE

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

# Initialize Google Cloud Vision client
client = vision.ImageAnnotatorClient()

@router.post("/multiple-files-to-text")
async def multiple_files_to_text(files: List[UploadFile] = File(...), request: Request = None) -> Dict[str, Any]:
    """
    Convert multiple image or PDF files to text using Google Cloud Vision API.
    
    Args:
        files (List[UploadFile]): List of image or PDF files to process
        request (Request): The FastAPI request object for debugging
        
    Returns:
        Dict[str, Any]: A dictionary containing the extracted text for each file
        
    Raises:
        HTTPException: If any file is invalid or processing fails
    """
    try:
        # Log request details for debugging
        if request:
            logger.info(f"Request headers: {request.headers}")
            logger.info(f"Request method: {request.method}")
            logger.info(f"Request URL: {request.url}")
        
        if not files:
            logger.error("No files received in request")
            raise HTTPException(
                status_code=400,
                detail="No files were uploaded"
            )
            
        logger.info(f"Received {len(files)} files")
        
        results = []
        
        for file in files:
            logger.info(f"Processing file: {file.filename}, content_type: {file.content_type}")
            
            try:
                # Use the process_file_to_text function to process each file
                result = await process_file_to_text(file)
                
                # Add filename to the result
                result["filename"] = file.filename
                results.append(result)
                
            except HTTPException as e:
                # Log the error but continue processing other files
                logger.error(f"Error processing {file.filename}: {str(e)}")
                results.append({
                    "filename": file.filename,
                    "error": str(e.detail),
                    "status": "error"
                })
                continue
            except Exception as e:
                logger.error(f"Unexpected error processing {file.filename}: {str(e)}")
                results.append({
                    "filename": file.filename,
                    "error": str(e),
                    "status": "error"
                })
                continue
            
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        ) 