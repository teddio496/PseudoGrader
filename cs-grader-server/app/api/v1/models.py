from pydantic import BaseModel
from typing import Optional

class PromptRequest(BaseModel):
    prompt: str

class PromptResponse(BaseModel):
    response: str
    model_used: str

class ImageToTextRequest(BaseModel):
    image_url: str
    prompt: Optional[str] = None

class ImageToTextResponse(BaseModel):
    text: str
    model_used: str 