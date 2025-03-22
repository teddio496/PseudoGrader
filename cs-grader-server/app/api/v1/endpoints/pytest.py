from fastapi import APIRouter, HTTPException
from typing import Optional
import tempfile
import os
import docker
import json
from pathlib import Path
from app.core.logging import setup_logger
from pydantic import BaseModel
import subprocess

router = APIRouter()
logger = setup_logger("pytest")

class CodeRequest(BaseModel):
    code: str
    test_code: Optional[str] = None

def check_docker_available():
    """Check if Docker is running and accessible."""
    try:
        # Try to run docker info command
        subprocess.run(["docker", "info"], capture_output=True, check=True, shell=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def create_dockerfile():
    return """
FROM python:3.9-slim

WORKDIR /app

RUN pip install pytest pytest-json-report

COPY . .

CMD ["pytest", "-v", "--json-report"]
"""

def run_pytest_in_container(code: str, test_code: Optional[str] = None):
    logger.info("Starting pytest run with code string")
    
    # Check if Docker is available
    if not check_docker_available():
        logger.error("Docker is not running or not accessible")
        raise HTTPException(
            status_code=503,
            detail="Docker is not running. Please start Docker and try again."
        )
    
    # Create a temporary directory for the test files
    with tempfile.TemporaryDirectory() as temp_dir:
        logger.debug(f"Created temporary directory: {temp_dir}")
        
        # Save the main code
        main_path = os.path.join(temp_dir, "main.py")
        logger.debug("Saving main code")
        with open(main_path, "w") as f:
            f.write(code)
        
        # Save the test code if provided
        if test_code:
            test_path = os.path.join(temp_dir, "test_main.py")
            logger.debug("Saving test code")
            with open(test_path, "w") as f:
                f.write(test_code)
        
        # Create Dockerfile
        dockerfile_path = os.path.join(temp_dir, "Dockerfile")
        logger.debug("Creating Dockerfile")
        with open(dockerfile_path, "w") as f:
            f.write(create_dockerfile())
        
        # Build and run Docker container
        try:
            client = docker.from_env()
        except docker.errors.DockerException as e:
            logger.error(f"Failed to connect to Docker: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="Failed to connect to Docker. Please ensure Docker is running and accessible."
            )
        
        try:
            # Build the image
            logger.info("Building Docker image")
            image, build_logs = client.images.build(
                path=temp_dir,
                dockerfile="Dockerfile",
                tag="pytest-runner",
                rm=True
            )
            
            # Log build output
            for log in build_logs:
                if 'stream' in log:
                    logger.debug(f"Docker build: {log['stream'].strip()}")
            
            # Run the container with auto-remove disabled
            logger.info("Running Docker container")
            container = client.containers.run(
                image.id,
                detach=True,
                remove=False  # Disable auto-remove
            )
            
            # Wait for the container to finish
            result = container.wait()
            logger.info(f"Container finished with exit code: {result['StatusCode']}")
            
            # Get the logs before removing the container
            logs = container.logs().decode()
            logger.debug(f"Container logs: {logs}")
            
            # Copy the JSON report from the container
            try:
                # Get the archive data
                report_data, _ = container.get_archive('/app/.report.json')
                
                # Create a temporary file to store the archive
                archive_path = os.path.join(temp_dir, 'report.tar')
                with open(archive_path, 'wb') as f:
                    for chunk in report_data:
                        f.write(chunk)
                
                # Extract the tar archive
                import tarfile
                with tarfile.open(archive_path) as tar:
                    tar.extractall(path=temp_dir)
                
                # Read the report
                report_path = os.path.join(temp_dir, '.report.json')
                if os.path.exists(report_path):
                    logger.debug("Found JSON report")
                    with open(report_path, "r") as f:
                        report = json.loads(f.read())
                else:
                    logger.debug("No JSON report found")
                    report = None
                
                # Clean up the archive file
                os.remove(archive_path)
                
            except Exception as e:
                logger.warning(f"Failed to copy report from container: {str(e)}")
                report = None
            
            # Remove the container after getting logs and report
            container.remove(force=True)
            
            return {
                "exit_code": result["StatusCode"],
                "logs": logs,
                "report": report
            }
            
        except docker.errors.BuildError as e:
            logger.error(f"Failed to build Docker image: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to build Docker image: {str(e)}")
        except docker.errors.APIError as e:
            logger.error(f"Docker API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Docker API error: {str(e)}")
        finally:
            # Clean up
            try:
                logger.debug("Cleaning up Docker image")
                client.images.remove(image.id, force=True)
            except Exception as e:
                logger.warning(f"Failed to clean up Docker image: {str(e)}")

@router.post("/run")
async def run_pytest(request: CodeRequest):
    """
    Run pytest on provided code string in a Docker container.
    """
    logger.info("Received request to run pytest")
    
    if not request.code:
        logger.warning("No code provided in request")
        raise HTTPException(status_code=400, detail="No code provided")
    
    logger.info("Processing code string")
    return run_pytest_in_container(request.code, request.test_code) 