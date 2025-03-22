from pydantic import BaseModel, Field
from typing import Optional

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = Field(default=None, description="Maximum number of tokens to generate")
    temperature: Optional[float] = Field(default=0.7, description="Sampling temperature between 0 and 2")
    model: Optional[str] = Field(default="command", description="Cohere model to use")

class PromptResponse(BaseModel):
    response: str
    model_used: str 