from pydantic import BaseModel, Field
from typing import Optional, List

class PromptRequest(BaseModel):
    prompt: str
    max_retries: Optional[int] = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum number of retries for JSON parsing (1-5, default: 3)"
    )
    description: str

class PromptResponse(BaseModel):
    code: str
    testing_code: str

class GeminiErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None
    retries_attempted: int

class PseudocodeEvaluationRequest(BaseModel):
    question: str = Field(..., description="The programming question or problem statement")
    pseudocode: str = Field(..., description="The pseudocode solution to evaluate")

class LogicalAnalysis(BaseModel):
    correctness: str = Field(..., description="Analysis of the solution's correctness")
    efficiency: str = Field(..., description="Analysis of the solution's efficiency")
    readability: str = Field(..., description="Analysis of the solution's readability")

class PseudocodeEvaluationResponse(BaseModel):
    feedback: str = Field(..., description="Feedback on the solution")
    logical_analysis: LogicalAnalysis = Field(..., description="Detailed analysis of the solution")
    potential_issues: List[str] = Field(default_factory=list, description="List of potential issues or edge cases")
    similar_solutions: List[str] = Field(default_factory=list, description="List of similar solutions found")