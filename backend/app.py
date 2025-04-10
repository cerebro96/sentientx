from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import asyncio
import logging
import json
import os
from dotenv import load_dotenv
from temporalio.client import Client
from contextlib import asynccontextmanager

# Import workflow definitions
from temporal.workflows import AIAgentWorkflow

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Store for workflow status
workflow_status = {}

# Initialize Temporal client
temporal_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown events"""
    global temporal_client
    
    # Connect to Temporal server on startup
    temporal_server_url = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
    try:
        logger.info(f"Connecting to Temporal server at {temporal_server_url}")
        temporal_client = await Client.connect(temporal_server_url)
        logger.info("Successfully connected to Temporal server")
    except Exception as e:
        logger.error(f"Failed to connect to Temporal server: {str(e)}")
        # We'll continue running and retry connections later
    
    yield  # This is where FastAPI runs
    
    # Shutdown logic (if needed)
    # Add any cleanup code here

# Create FastAPI app
app = FastAPI(
    title="SentientX Workflow API", 
    description="API for managing and executing AI workflows",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request/response models
class WorkflowInput(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    name: str
    workflow_id: Optional[str] = None
    is_active: bool = True
    tags: List[str] = []

class WorkflowResponse(BaseModel):
    status: str
    execution_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None

@app.post("/api/workflows/start", response_model=WorkflowResponse)
async def start_workflow(workflow_data: WorkflowInput):
    """
    Start a workflow execution with the provided nodes and edges
    """
    global temporal_client
    
    if not temporal_client:
        try:
            # Try to reconnect if client is not available
            temporal_server_url = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
            temporal_client = await Client.connect(temporal_server_url)
        except Exception as e:
            logger.error(f"Failed to connect to Temporal server: {str(e)}")
            raise HTTPException(status_code=503, detail="Temporal server unavailable")
    
    logger.info(f"Received request to start workflow: {workflow_data.name}")
    
    try:
        # Use the provided workflow_id or generate a unique ID
        workflow_id = workflow_data.workflow_id or f"workflow-{workflow_data.name.lower().replace(' ', '-')}-{os.urandom(4).hex()}"
        
        # Prepare the payload
        payload = {
            "nodes": workflow_data.nodes,
            "edges": workflow_data.edges,
            "workflow_id": workflow_id,
            "name": workflow_data.name,
            "is_active": workflow_data.is_active,
            "tags": workflow_data.tags
        }
        
        # Store workflow status immediately
        workflow_status[workflow_id] = "starting"
        
        # Create a response to return quickly
        response = WorkflowResponse(
            status="starting", 
            execution_id=workflow_id,
            message=f"Workflow '{workflow_data.name}' is being started"
        )
        
        # Start the workflow in the background without waiting for it
        asyncio.create_task(
            _start_workflow_background(workflow_id, payload, workflow_data.name)
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error preparing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")

async def _start_workflow_background(workflow_id: str, payload: dict, workflow_name: str):
    """
    Background task to actually start the workflow
    """
    global temporal_client, workflow_status
    
    try:
        logger.info(f"Starting workflow with ID: {workflow_id} in background")
        handle = await temporal_client.start_workflow(
            AIAgentWorkflow.run,
            payload,
            id=workflow_id,
            task_queue="ai-workflow-task-queue",
        )
        
        # Update workflow status
        workflow_status[workflow_id] = "running"
        logger.info(f"Workflow {workflow_id} successfully started in background")
    except Exception as e:
        logger.error(f"Background error starting workflow {workflow_id}: {str(e)}")
        workflow_status[workflow_id] = "error"

@app.get("/api/workflows/{workflow_id}/status", response_model=WorkflowResponse)
async def get_workflow_status(workflow_id: str):
    """
    Get the status of a running workflow
    """
    global temporal_client
    
    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal server unavailable")
    
    try:
        # Get workflow handle
        handle = temporal_client.get_workflow_handle(workflow_id)
        
        # Check if workflow is running
        try:
            result = await handle.query("status")
            return WorkflowResponse(
                status=result,
                execution_id=workflow_id
            )
        except Exception as e:
            # If we can't query, try to check if it's completed
            try:
                # This will raise an error if workflow is still running
                result = await handle.result()
                return WorkflowResponse(
                    status="completed",
                    execution_id=workflow_id,
                    message="Workflow completed successfully"
                )
            except Exception as inner_e:
                return WorkflowResponse(
                    status=workflow_status.get(workflow_id, "unknown"),
                    execution_id=workflow_id,
                    error=str(e)
                )
    
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Workflow not found or error: {str(e)}")

@app.post("/api/workflows/{workflow_id}/stop", response_model=WorkflowResponse)
async def stop_workflow(workflow_id: str):
    """
    Stop a running workflow
    """
    global temporal_client
    
    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal server unavailable")
    
    try:
        # Get workflow handle
        handle = temporal_client.get_workflow_handle(workflow_id)
        
        # Cancel the workflow
        # await handle.cancel()
        await handle.terminate()
        
        # Update status
        workflow_status[workflow_id] = "terminated"
        
        return WorkflowResponse(
            status="terminated",
            execution_id=workflow_id,
            message="Workflow terminated successfully"
        )
    
    except Exception as e:
        logger.error(f"Error canceling workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel workflow: {str(e)}")

@app.post("/api/workflows/{workflow_id}/pause", response_model=WorkflowResponse)
async def pause_workflow(workflow_id: str):
    """
    Pause a running workflow (using Temporal signals)
    """
    global temporal_client
    
    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal server unavailable")
    
    try:
        # Get workflow handle
        handle = temporal_client.get_workflow_handle(workflow_id)
        
        # Send pause signal to the workflow
        await handle.signal("pause")
        
        # Update status
        workflow_status[workflow_id] = "paused"
        
        return WorkflowResponse(
            status="paused",
            execution_id=workflow_id,
            message="Workflow paused successfully"
        )
    
    except Exception as e:
        logger.error(f"Error pausing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to pause workflow: {str(e)}")

@app.post("/api/workflows/{workflow_id}/resume", response_model=WorkflowResponse)
async def resume_workflow(workflow_id: str):
    """
    Resume a paused workflow (using Temporal signals)
    """
    global temporal_client
    
    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal server unavailable")
    
    try:
        # Get workflow handle
        handle = temporal_client.get_workflow_handle(workflow_id)
        
        # Send resume signal to the workflow
        await handle.signal("resume")
        
        # Update status
        workflow_status[workflow_id] = "running"
        
        return WorkflowResponse(
            status="running",
            execution_id=workflow_id,
            message="Workflow resumed successfully"
        )
    
    except Exception as e:
        logger.error(f"Error resuming workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resume workflow: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 