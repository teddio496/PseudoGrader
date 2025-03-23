from app.core.chroma_middleware import ChromaMiddleware
from fastapi import APIRouter, HTTPException
from app.core.config import COHERE_CLIENT
from app.api.v1.models import PseudocodeEvaluationRequest, PseudocodeEvaluationResponse, SimilarSolution, LogicalAnalysis
from app.core.logging import setup_logger
import re
import json

logger = setup_logger("pseudocode")
router = APIRouter()
chroma_middleware: ChromaMiddleware = ChromaMiddleware()

@router.post("/evaluate", response_model=PseudocodeEvaluationResponse)
async def evaluate_psuedocode_logic(request: PseudocodeEvaluationRequest):
    """
    Evaluate pseudocode solutions using Cohere's embeddings and logical reasoning.
    """
    try:
        logger.info(f"Evaluating pseudocode for question: {request.question[:100]}...")
        
        # Find suggested algorithms from the database
        suggested_algorithms = chroma_middleware.find_algorithms_by_question(
            question=request.question,
            n_results=5
        )
        logger.info(f"Found {len(suggested_algorithms)} suggested algorithms")

        # Create a prompt for evaluation with similar solutions as context
        similar_solutions_context = ""
        if suggested_algorithms:
            similar_solutions_context = "\nSimilar Solutions Found:\n"
            for i, solution in enumerate(suggested_algorithms, 1):
                if solution['similarity'] >= 0.5:
                    similar_solutions_context += f"\nSolution {i} (Similarity: {solution['similarity']:.2f}):\n"
                    similar_solutions_context += f"Question: {solution['question']}\n"
                    similar_solutions_context += f"Pseudocode:\n{solution['pseudocode']}\n"

        if not similar_solutions_context:
            similar_solutions_context = "No similar solutions found."

        # Create a structured prompt for evaluation
        evaluation_prompt = f"""
        Question: {request.question}
        
        Pseudocode Solution:
        {request.pseudocode}
        
        Similar Algorithms:
        {similar_solutions_context}
        
        Please evaluate this pseudocode solution and provide your response in the following JSON format:
        {{
            "score": <float between 0 and 1>,
            "feedback": "<general feedback about the solution>",
            "logical_analysis": {{
                "correctness": "<correctness of the solution>",
                "efficiency": "<efficiency of the solution>",
                "readability": "<readability of the solution>"
            }},
            "potential_issues": [
                "<issue 1>",
                "<issue 2>",
                ...
            ]
        }}
        
        Consider:
        1. Does it correctly address the question?
        2. Is the logical flow sound?
        3. Are there any potential issues or edge cases not handled?
        4. Could the solution be improved?
        5. How does it compare to the similar solutions found?
        
        Ignore any comments. Only evaluate the correctness of the psuedocode. 
        
        Provide a detailed evaluation with a score from 0 to 1.
        """

        logger.debug("Generating evaluation using Cohere")
        # Generate evaluation using Cohere's generate endpoint
        response = COHERE_CLIENT.generate(
            prompt=evaluation_prompt,
            max_tokens=1000,
            temperature=0.3,
            k=0,
            stop_sequences=[],
            return_likelihoods='NONE'
        )

        if not response or not response.generations:
            logger.error("No response generated from Cohere")
            raise HTTPException(
                status_code=500,
                detail="No response generated from Cohere"
            )

        # Parse the response to extract JSON
        evaluation_text = response.generations[0].text
        logger.debug(f"Received evaluation text: {evaluation_text[:100]}...")
        
        try:
            # Extract JSON from the response
            json_match = re.search(r'\{.*\}', evaluation_text, re.DOTALL)
            if not json_match:
                logger.error("No JSON found in response")
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response format from Cohere"
                )
            
            evaluation_json = json.loads(json_match.group(0))
            logger.info(f"Parsed evaluation JSON: {json.dumps(evaluation_json, indent=2)}")
            
            # Create LogicalAnalysis object
            logical_analysis_dict = evaluation_json.get('logical_analysis', {})
            logical_analysis = LogicalAnalysis(
                correctness=logical_analysis_dict.get('correctness', "No correctness analysis available."),
                efficiency=logical_analysis_dict.get('efficiency', "No efficiency analysis available."),
                readability=logical_analysis_dict.get('readability', "No readability analysis available.")
            )
            
            # Convert suggested algorithms to SimilarSolution objects
            similar_solutions = []
            if suggested_algorithms:
                for algo in suggested_algorithms:
                    if algo['similarity'] >= 0.5:  # Only include reasonably similar solutions
                        similar_solutions.append(SimilarSolution(
                            question=algo['question'],
                            pseudocode=algo['pseudocode'],
                            similarity=algo['similarity']
                        ))
                logger.info(f"Including {len(similar_solutions)} similar solutions in response")

            return PseudocodeEvaluationResponse(
                score=evaluation_json.get('score', 0.5),
                feedback=evaluation_json.get('feedback', "No detailed feedback available."),
                logical_analysis=logical_analysis,
                potential_issues=evaluation_json.get('potential_issues', []),
                similar_solutions=similar_solutions
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse evaluation response"
            )

    except Exception as e:
        logger.error(f"Error evaluating pseudocode: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error evaluating pseudocode: {str(e)}"
        )

@router.get("/stats")
async def get_chroma_stats():
    """Get statistics about the ChromaDB collection"""
    return chroma_middleware.get_collection_stats()