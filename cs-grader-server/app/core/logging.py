import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
import colorama
from colorama import Fore, Style

# Initialize colorama for Windows compatibility
colorama.init()

# Create logs directory if it doesn't exist
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)

# Configure logging format
class ColoredFormatter(logging.Formatter):
    """Custom formatter with consistent colors"""
    
    COLORS = {
        'DEBUG': Fore.CYAN,
        'INFO': Fore.GREEN,
        'WARNING': Fore.YELLOW,
        'ERROR': Fore.RED,
        'CRITICAL': Fore.RED + Style.BRIGHT
    }
    
    def format(self, record):
        # Add color to the level name
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{Style.RESET_ALL}"
        return super().format(record)

def setup_logger(name: str) -> logging.Logger:
    """Set up a custom logger with both file and console handlers"""
    
    # Create logger
    logger = logging.getLogger(f"cs_grader.{name}")
    logger.setLevel(logging.INFO)
    
    # Prevent propagation to avoid duplicate logs
    logger.propagate = False
    
    # Remove any existing handlers
    logger.handlers = []
    
    # Configure file handler (without colors)
    file_handler = RotatingFileHandler(
        logs_dir / f"{name}.log",
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(logging.Formatter('%(name)s - %(levelname)s - %(asctime)s - %(message)s'))
    file_handler.setLevel(logging.INFO)
    
    # Configure console handler (with colors)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredFormatter('%(name)s - %(levelname)s - %(asctime)s - %(message)s'))
    console_handler.setLevel(logging.INFO)
    
    # Add handlers
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger 