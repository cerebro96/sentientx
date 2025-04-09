import asyncio
import logging
from temporalio.client import Client
from temporalio.worker import Worker
from dotenv import load_dotenv
import os

# Import our workflow and activities
from workflows import AIAgentWorkflow
from activities import process_node

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def main():
    """Run the Temporal worker"""
    # Get Temporal server address from environment variable or use default
    temporal_server_url = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
    
    # Create Temporal client
    logger.info(f"Connecting to Temporal server at {temporal_server_url}")
    client = await Client.connect(temporal_server_url)
    
    # Create a namespace for our application
    namespace = os.getenv("TEMPORAL_NAMESPACE", "sentientx")
    
    # Create and run worker
    logger.info(f"Starting Temporal worker in namespace {namespace}")
    worker = Worker(
        client,
        task_queue="ai-workflow-task-queue",
        workflows=[AIAgentWorkflow],
        activities=[process_node],
    )
    
    # Start the worker
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main()) 