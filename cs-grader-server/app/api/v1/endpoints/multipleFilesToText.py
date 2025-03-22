from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from typing import Dict, Any, List
import io
from PIL import Image
from google.cloud import vision
import os
from app.core.config import GOOGLE_APPLICATION_CREDENTIALS
import logging

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Set Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

# Initialize Google Cloud Vision client
client = vision.ImageAnnotatorClient()

@router.post("/multiple-files-to-text")
async def multiple_files_to_text(files: List[UploadFile] = File(...), request: Request = None) -> Dict[str, Any]:
    """
    Convert multiple image files to text using Google Cloud Vision API.
    
    Args:
        files (List[UploadFile]): List of image files to process
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
            
            # Validate file size
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                logger.error(f"File {file.filename} exceeds size limit")
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds maximum limit of {MAX_FILE_SIZE/1024/1024}MB"
                )
                
            # Validate file type
            if not file.content_type.startswith('image/'):
                logger.error(f"Invalid file type for {file.filename}: {file.content_type}")
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} must be an image"
                )
            
            # Create image object for Google Cloud Vision
            image = vision.Image(content=content)
            
            # Perform text detection
            response = client.text_detection(image=image)
            texts = response.text_annotations
            
            if not texts:
                logger.warning(f"No text detected in {file.filename}")
                results.append({
                    "filename": file.filename,
                    "text": "",
                    "status": "no_text_detected"
                })
                continue
                
            # Get the full text (first annotation contains all text)
            extracted_text = texts[0].description
            
            if response.error.message:
                logger.error(f"Google Cloud Vision error for {file.filename}: {response.error.message}")
                results.append({
                    "filename": file.filename,
                    "text": "",
                    "status": f"error: {response.error.message}"
                })
                continue
                
            results.append({
                "filename": file.filename,
                "text": extracted_text,
                "status": "success"
            })
            
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        ) 