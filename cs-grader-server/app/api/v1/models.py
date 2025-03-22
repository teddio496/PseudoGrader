from pydantic import BaseModel, Field
from typing import Optional

class PromptRequest(BaseModel):
    prompt: str
    max_retries: Optional[int] = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum number of retries for JSON parsing (1-5, default: 3)"
    )

class PromptResponse(BaseModel):
    code: str
    testing_code: str
    model_used: str

class GeminiErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None
    retries_attempted: int

class ImageToTextResponse(BaseModel):
    text: str
    model_used: str 