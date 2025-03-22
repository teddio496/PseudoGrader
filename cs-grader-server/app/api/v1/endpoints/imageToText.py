from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, Any
import io
from PIL import Image
from google.cloud import vision
import os
from app.core.config import GOOGLE_APPLICATION_CREDENTIALS

router = APIRouter()

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Set Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

# Initialize Google Cloud Vision client
client = vision.ImageAnnotatorClient()

@router.post("/image-to-text")
async def image_to_text(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Convert an image file to text using Google Cloud Vision API.
    
    Args:
        file (UploadFile): The image file to process
        
    Returns:
        Dict[str, Any]: A dictionary containing the extracted text
        
    Raises:
        HTTPException: If the file is invalid or processing fails
    """
    try:
        # Validate file size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE/1024/1024}MB"
            )
            
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image"
            )
        
        # Create image object for Google Cloud Vision
        image = vision.Image(content=content)
        
        # Perform text detection
        response = client.text_detection(image=image)
        texts = response.text_annotations
        
        if not texts:
            raise HTTPException(
                status_code=500,
                detail="No text was detected in the image"
            )
            
        # Get the full text (first annotation contains all text)
        extracted_text = texts[0].description
        
        if response.error.message:
            raise HTTPException(
                status_code=500,
                detail=f"Error from Google Cloud Vision: {response.error.message}"
            )
            
        return {"text": extracted_text}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        ) 