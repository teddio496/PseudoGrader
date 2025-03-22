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

class ImageToTextRequest(BaseModel):
    image_url: str
    prompt: Optional[str] = None

class ImageToTextResponse(BaseModel):
    text: str
    model_used: str

class PseudocodeEvaluationRequest(BaseModel):
    question: str = Field(..., description="The programming question or problem statement")
    pseudocode: str = Field(..., description="The pseudocode solution to evaluate")
    context: Optional[str] = Field(None, description="Additional context about the problem or requirements")

class PseudocodeEvaluationResponse(BaseModel):
    score: float = Field(..., description="Score from 0 to 1 indicating how well the solution addresses the question")
    feedback: str = Field(..., description="Detailed feedback about the solution")
    logical_analysis: str = Field(..., description="Analysis of the logical flow and correctness")
    potential_issues: list[str] = Field(default_factory=list, description="List of potential issues or improvements")
    model_used: str = Field(..., description="The model used for evaluation") 