from fastapi import APIRouter, HTTPException
from typing import List
from app.core.config import settings, COHERE_CLIENT
from app.api.v1.models import PseudocodeEvaluationRequest, PseudocodeEvaluationResponse
from app.core.chroma_middleware import ChromaMiddleware

router = APIRouter()
chroma_middleware = ChromaMiddleware()

@router.post("/evaluate", response_model=PseudocodeEvaluationResponse)
async def evaluate_pseudocode(request: PseudocodeEvaluationRequest):
    """
    Evaluate pseudocode solutions using Cohere's embeddings and logical reasoning.
    """
    try:
        # Find similar solutions from the database based on the question
        similar_solutions = chroma_middleware.find_similar_solutions(
            question=request.question,
            n_results=3
        )

        # Create a prompt for evaluation with similar solutions as context
        similar_solutions_context = ""
        if similar_solutions:
            similar_solutions_context = "\nSimilar Solutions Found:\n"
            for i, solution in enumerate(similar_solutions, 1):
                similar_solutions_context += f"\nSolution {i} (Similarity: {solution['similarity']:.2f}):\n"
                similar_solutions_context += f"Question: {solution['question']}\n"
                similar_solutions_context += f"Pseudocode:\n{solution['pseudocode']}\n"

        # Create a prompt for evaluation
        evaluation_prompt = f"""
        Question: {request.question}
        
        Pseudocode Solution:
        {request.pseudocode}
        
        {f'Additional Context: {request.context}' if request.context else ''}
        
        {similar_solutions_context}
        
        Please evaluate this pseudocode solution considering:
        1. Does it correctly address the question?
        2. Is the logical flow sound?
        3. Are there any potential issues or edge cases not handled?
        4. Could the solution be improved?
        5. How does it compare to the similar solutions found?
        
        Provide a detailed evaluation with a score from 0 to 1.
        """

        # Generate evaluation using Cohere's generate endpoint
        response = COHERE_CLIENT.generate(
            prompt=evaluation_prompt,
            max_tokens=500,
            temperature=0.3,
            k=0,
            stop_sequences=[],
            return_likelihoods='NONE'
        )

        # Parse the response to extract score and feedback
        evaluation_text = response.generations[0].text
        
        # Extract score (assuming it's mentioned as a number between 0 and 1)
        import re
        score_match = re.search(r'(\d+\.?\d*)', evaluation_text)
        score = float(score_match.group(1)) if score_match else 0.5
        
        # Split the evaluation into sections
        sections = evaluation_text.split('\n\n')
        feedback = sections[0] if sections else "No detailed feedback available."
        logical_analysis = sections[1] if len(sections) > 1 else "No logical analysis available."
        
        # Extract potential issues
        issues = []
        for section in sections:
            if "issue" in section.lower() or "problem" in section.lower():
                issues.append(section.strip())

        return PseudocodeEvaluationResponse(
            score=score,
            feedback=feedback,
            logical_analysis=logical_analysis,
            potential_issues=issues,
            model_used=settings.COHERE_EMBEDDING_MODEL
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error evaluating pseudocode: {str(e)}"
        ) 