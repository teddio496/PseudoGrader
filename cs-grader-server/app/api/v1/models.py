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
    context: Optional[str] = Field(None, description="Additional context about the problem or requirements")

class SimilarSolution(BaseModel):
    question: str = Field(..., description="The question from a similar solution")
    pseudocode: str = Field(..., description="The pseudocode from a similar solution")
    similarity: float = Field(..., description="Similarity score between 0 and 1")

class PseudocodeEvaluationResponse(BaseModel):
    score: float = Field(..., description="Score from 0 to 1 indicating how well the solution addresses the question")
    feedback: str = Field(..., description="Detailed feedback about the solution")
    logical_analysis: str = Field(..., description="Analysis of the logical flow and correctness")
    potential_issues: List[str] = Field(default_factory=list, description="List of potential issues or improvements")
    similar_solutions: List[SimilarSolution] = Field(default_factory=list, description="List of similar solutions found")