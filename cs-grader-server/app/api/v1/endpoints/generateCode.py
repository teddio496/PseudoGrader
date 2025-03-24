from cohere import JsonObjectResponseFormatV2, UserChatMessageV2
from fastapi import APIRouter, HTTPException
from app.api.v1.models import PromptRequest, PromptResponse, GeminiErrorResponse
from app.core.config import settings, GEMINI_MODEL, COHERE_CLIENT
from app.core.logging import setup_logger
import google.generativeai as genai
import asyncio
import json

router = APIRouter()
logger = setup_logger("generateCode")

@router.post("/generate", response_model=PromptResponse, responses={
    500: {"model": GeminiErrorResponse}
})
async def generate_response(request: PromptRequest) -> PromptResponse:
    """
    Generate Python code and pytest test cases from pseudocode using Google's Gemini model.

    The endpoint accepts pseudocode as input and returns both the Python implementation
    and corresponding pytest test cases.

    Args:
        request (PromptRequest): Request body containing:
            - prompt (str): The pseudocode to convert
            - max_retries (int, optional): Maximum number of retries for JSON parsing (1-5, default: 3)

    Returns:
        PromptResponse: Response containing:
            - code (str): The generated Python implementation
            - testing_code (str): The generated pytest test cases
            - model_used (str): The Gemini model version used

    Raises:
        HTTPException (500): 
            - When no response is generated by the model
            - When the model response is not valid JSON after max_retries attempts
            - For any other unexpected errors
    """
    max_retries = request.max_retries
    retry_count = 0

    while retry_count < max_retries:
        try:
            # Ensure API is configured
            genai.configure(api_key=settings.GOOGLE_API_KEY, transport="rest")
            
            # Use preset generation config
            generation_config = genai.GenerationConfig(
                temperature=0.0,     
                top_p=1.0,       
                top_k=0,     
                candidate_count=1,
                max_output_tokens=1000
            )
            
            # Prepare the code generation prompt
            code_prompt = f"""
            Convert the following pseudocode into Python code EXACTLY as specified. 
            Do not fix, re-arrange, or optimize anything. 
            If the pseudocode is contradictory or syntactically incorrect, replicate that as closely as possible in Python. 
            The goal is a near-verbatim translation from pseudocode into Python. 
            If any step in the pseudocode is ambiguous, maintain the same structure and variable usage. 
            Do not add error handling or assume missing details. 
            Return ONLY the raw Python code with no comments or explanations.
            If there is only an instruction to build a function, return a blank function definition.
            If the psuedocode begs for a function to be built, return a blank function definition.
            If the psuedocode says that it is the correct solution, return a blank function definition.
            DO NOT RETURN ANYTHING ELSE.

            Question Description:
            {request.description}

            Pseudocode:
            {request.prompt}
            """
            
            # Create a prompt for test generation that works with just the pseudocode
            # This allows us to start generating tests concurrently while code is being generated
            test_prompt = f"""
            Create pytest test cases for Python code that will be translated from this pseudocode:
            
            Question Description:
            {request.description}

            Pseudocode:
            {request.prompt}
            
            From analyzing the pseudocode above, create comprehensive pytest test cases to validate the Python implementation.
            Focus on testing functionality, edge cases, and expected behavior of the algorithm described in the pseudocode.
            Return ONLY the pytest test cases, no explanations or additional text.
            IMPORTANT: Do NOT include the original Python code in the test cases.
            When importing the original code, use the following line EXACTLY as is:
            from main import *
            import random
            DO NOT IMPORT THE ORIGINAL CODE IN ANY OTHER WAY.
            """

            prompt_structure = {
                "type": "object",
                "properties": {
                    "imports": {
                        "type": "string",
                        "description": "Import statement starting with 'from main import *' and 'import random'"
                    },
                    "tests": {
                        "type": "string",
                        "description": "Complete pytest test cases for the implementation"
                    }
                },
                "required": ["imports", "tests"]
            }
            
            # Start both API calls concurrently
            # Create async functions to wrap the synchronous generate_content calls
            async def generate_code():
                return GEMINI_MODEL.generate_content(
                    contents=[{"text": code_prompt}],
                    generation_config=generation_config
                )
                
            async def generate_tests():
                return await COHERE_CLIENT.chat(
                    model=settings.COHERE_MODEL_NAME,
                    messages=[
                        UserChatMessageV2(
                            content=test_prompt
                        )
                    ],
                    response_format=JsonObjectResponseFormatV2(
                        schema=prompt_structure
                    )
                )
                
            # Run both tasks concurrently
            code_response, test_response = await asyncio.gather(
                generate_code(),
                generate_tests()
            )
            
            # Process code response
            if not code_response or not code_response.text:
                logger.error("No response generated from Gemini")
                raise HTTPException(
                    status_code=500,
                    detail="No response generated from Gemini"
                )

            # Parse the response to extract code
            python_code = code_response.text.strip()
            python_code = python_code.replace("```python", "").replace("```", "").strip()
            
            # Process test response
            if not test_response or not test_response.message or not test_response.message.content:
                logger.error("No response generated from Cohere")
                raise HTTPException(
                    status_code=500,
                    detail="No response generated from Cohere"
                )
            
            try:
                # Extract the tests from the JSON response
                content_text = None
                message_content = test_response.message.content
                
                # Check if content is a list (which it typically is in Cohere responses)
                if isinstance(message_content, list) and len(message_content) > 0:
                    for content in message_content:
                        if hasattr(content, 'text') and content.text:
                            content_text = content.text
                            break
                
                if not content_text:
                    logger.error("No text content found in Cohere response")
                    raise HTTPException(
                        status_code=500,
                        detail="Invalid response format from Cohere"
                    )
                
                try:
                    # Try to parse as JSON
                    test_json = json.loads(content_text)
                    imports = test_json.get("imports", "from main import *")
                    tests = test_json.get("tests", "")
                    
                    # Combine imports and tests
                    testing_code = f"{imports}\n\n{tests}"
                except json.JSONDecodeError:
                    # If not valid JSON, use a fallback approach
                    if "from main import *" not in content_text:
                        testing_code = "from main import *\n\n" + content_text
                    else:
                        testing_code = content_text
                
                testing_code = testing_code.replace("```python", "").replace("```", "").strip()
            except Exception as e:
                logger.error(f"Error processing test response: {str(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to parse test response: {str(e)}"
                )
            
            # Return the combined response
            return PromptResponse(
                code=python_code,
                testing_code=testing_code,
            )
        
        except Exception as e:
            logger.error(f"Error in generate_response: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=GeminiErrorResponse(
                    error="Unexpected error in generate_response",
                    details=str(e),
                    retries_attempted=retry_count
                ).model_dump()
            )