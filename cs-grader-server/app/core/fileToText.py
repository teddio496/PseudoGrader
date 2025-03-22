from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from typing import Dict, Any, List
import io
from google.cloud import vision
import os
from app.core.config import settings
from PyPDF2 import PdfReader
import tempfile

router = APIRouter()

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Set Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS

# Initialize Google Cloud Vision client
client = vision.ImageAnnotatorClient()

async def process_file_to_text(file: UploadFile) -> Dict[str, Any]:
    """
    Convert an image, PDF, or text file to text using Google Cloud Vision API.
    
    Args:
        file (UploadFile): The image, PDF, or text file to process
        
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
        if not (file.content_type.startswith('image/') or 
                file.content_type == 'application/pdf' or 
                file.content_type == 'text/plain'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image, PDF, or text file"
            )

        # Handle text files
        if file.content_type == 'text/plain':
            try:
                text_content = content.decode('utf-8')
                return {
                    "text": text_content
                }
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid text file encoding. Please use UTF-8 encoding."
                )

        # Handle PDF files
        if file.content_type == 'application/pdf':
            try:
                # Create a temporary file to store the PDF
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
                    temp_pdf.write(content)
                    temp_pdf_path = temp_pdf.name

                # Read PDF
                pdf_reader = PdfReader(temp_pdf_path)
                
                # Process all pages and combine text
                combined_text = []
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        combined_text.append(text)
                
                # Clean up temporary file
                os.unlink(temp_pdf_path)
                
                return {
                    "text": "\n".join(combined_text)
                }
                
            except Exception as e:
                # Clean up temporary file if it exists
                if 'temp_pdf_path' in locals():
                    try:
                        os.unlink(temp_pdf_path)
                    except:
                        pass
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
                "text": texts[0].description
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )