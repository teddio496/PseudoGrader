from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from typing import Dict, Any, List
import io
from PIL import Image
from google.cloud import vision
import os
from app.core.config import GOOGLE_APPLICATION_CREDENTIALS
from pdf2image import convert_from_bytes
import tempfile

router = APIRouter()

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024
# Maximum number of pages to process (default: 5)
MAX_PAGES = 10

# Set Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

# Initialize Google Cloud Vision client
client = vision.ImageAnnotatorClient()

async def process_file_to_text(file: UploadFile, max_pages: int = 1) -> Dict[str, Any]:
    """
    Convert an image or PDF file to text using Google Cloud Vision API.
    
    Args:
        file (UploadFile): The image or PDF file to process
        max_pages (int): Maximum number of pages to process (default: 1)
        
    Returns:
        Dict[str, Any]: A dictionary containing the extracted text from each page
        
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
        if not (file.content_type.startswith('image/') or file.content_type == 'application/pdf'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image or PDF"
            )

        # Handle PDF files
        if file.content_type == 'application/pdf':
            try:
                # Convert PDF to images
                images = convert_from_bytes(content, first_page=1, last_page=max_pages)
                if not images:
                    raise HTTPException(
                        status_code=400,
                        detail="Failed to convert PDF to image"
                    )
                
                # Process each page
                pages_text = []
                for i, image in enumerate(images, 1):
                    # Convert page to bytes
                    img_byte_arr = io.BytesIO()
                    image.save(img_byte_arr, format='PNG')
                    page_content = img_byte_arr.getvalue()
                    
                    # Process the page
                    page_image = vision.Image(content=page_content)
                    response = client.text_detection(image=page_image)
                    texts = response.text_annotations
                    
                    if not texts:
                        pages_text.append({"page": i, "text": ""})
                        continue
                        
                    if response.error.message:
                        raise HTTPException(
                            status_code=500,
                            detail=f"Error from Google Cloud Vision on page {i}: {response.error.message}"
                        )
                    
                    pages_text.append({
                        "page": i,
                        "text": texts[0].description
                    })
                
                return {
                    "total_pages": len(images),
                    "processed_pages": len(pages_text),
                    "pages": pages_text
                }
                
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to process PDF: {str(e)}"
                )
        else:
            # Process single image
            image = vision.Image(content=content)
            response = client.text_detection(image=image)
            texts = response.text_annotations
            
            if not texts:
                raise HTTPException(
                    status_code=500,
                    detail="No text was detected in the image"
                )
                
            if response.error.message:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error from Google Cloud Vision: {response.error.message}"
                )
                
            return {
                "total_pages": 1,
                "processed_pages": 1,
                "pages": [{
                    "page": 1,
                    "text": texts[0].description
                }]
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post("/image-to-text")
async def image_to_text_endpoint(
    file: UploadFile = File(...),
    max_pages: int = Query(default=1, le=MAX_PAGES, description=f"Maximum number of pages to process (max {MAX_PAGES})")
) -> Dict[str, Any]:
    """
    API endpoint to convert an image or PDF file to text.
    """
    return await process_file_to_text(file, max_pages) 