from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
import json
import os
from dotenv import load_dotenv
import uuid
import google.generativeai as genai  # Add Google GenAI SDK

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Store for workflow status
workflow_status = {}

# Store for initialized LLM models - maps workflow_id -> node_id -> model instance
initialized_llms = {}

# Create FastAPI app
app = FastAPI(
    title="SentientX Workflow API", 
    description="API for managing and executing AI workflows"
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
    api_keys: Optional[Dict[str, str]] = None  # Dictionary of decrypted API keys

class WorkflowResponse(BaseModel):
    status: str
    execution_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None

class ChatMessageInput(BaseModel):
    message: str
    session_id: str
    workflow_id: str
    node_id: str

class ChatMessageResponse(BaseModel):
    status: str
    response: Optional[str] = None
    session_id: str
    error: Optional[str] = None
    message: Optional[str] = None

# Store for chat sessions
chat_sessions = {}

def initialize_gemini_model(api_key: str, model_name: str, settings: Dict[str, Any]):
    """Initialize a Gemini model with the given API key and settings"""
    try:
        logger.info(f"Initializing Gemini model: {model_name}")
        
        # Configure the Gemini API with the provided API key
        genai.configure(api_key=api_key)
        
        # Extract parameters from settings
        temperature = float(settings.get("temperature", 0.7))
        max_output_tokens = int(settings.get("max-output-tokens", 1024))
        system_prompt = settings.get("system-prompt", "")
        
        logger.info(f"Gemini parameters: temp={temperature}, max_tokens={max_output_tokens}")
        
        # Create generation config
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens
        }
        
        # Create and return the configured model
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            system_instruction=system_prompt
        )
        
        return {
            "model": model,
            "chat_sessions": {},
            "system_prompt": system_prompt
        }
    except Exception as e:
        logger.error(f"Error initializing Gemini model: {str(e)}")
        raise

@app.post("/api/workflows/start", response_model=WorkflowResponse)
async def start_workflow(workflow_data: WorkflowInput):
    """
    Start a workflow execution with the provided nodes and edges
    """
    global initialized_llms
    
    logger.info(f"Received request to start workflow: {workflow_data.name}")
    
    try:
        # Use the provided workflow_id or generate a unique ID
        workflow_id = workflow_data.workflow_id or f"workflow-{workflow_data.name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:8]}"
        
        # Initialize dictionary for this workflow's LLMs
        initialized_llms[workflow_id] = {}
        
        # Check if API keys were provided
        api_keys = {}
        if workflow_data.api_keys:
            logger.info(f"Received {len(workflow_data.api_keys)} API keys for workflow {workflow_id}")
            api_keys = workflow_data.api_keys
        
        # Check if the workflow contains any chat trigger nodes
        chat_trigger_nodes = []
        for node in workflow_data.nodes:
            # Check if this is a chat trigger node - multiple detection methods
            if (node.get("data", {}).get("label") == "Chat Trigger" and 
                  "chatConfig" in node.get("data", {})):
                chat_trigger_nodes.append(node)
        
        # Log information about chat trigger nodes
        if chat_trigger_nodes:
            logger.info(f"Found {len(chat_trigger_nodes)} chat trigger nodes in workflow {workflow_id}")
            for node in chat_trigger_nodes:
                node_id = node.get("id", "unknown")
                node_label = node.get("data", {}).get("label", "Unnamed Chat Trigger")
                # Log chatConfig if available
                chat_config = node.get("data", {}).get("chatConfig", {})
                if chat_config:
                    chat_id = chat_config.get("chatId", "unknown")
                    chat_mode = chat_config.get("mode", "unknown")
                    is_public = chat_config.get("isPublic", False)
                    logger.info(f"Chat trigger node: {node_id} - {node_label} (ChatID: {chat_id}, Mode: {chat_mode}, Public: {is_public})")
                else:
                    logger.info(f"Chat trigger node found: {node_id} - {node_label}")
        
        # Check if the workflow contains any LLM nodes
        llm_nodes = []
        for node in workflow_data.nodes:
            # Look for nodes with llmConfig
            if "llmConfig" in node.get("data", {}):
                llm_nodes.append(node)
        
        # Process and initialize LLM nodes
        initialized_nodes = []
        if llm_nodes:
            logger.info(f"Found {len(llm_nodes)} LLM nodes in workflow {workflow_id}")
            for node in llm_nodes:
                node_id = node.get("id", "unknown")
                node_label = node.get("data", {}).get("label", "Unnamed LLM")
                llm_config = node.get("data", {}).get("llmConfig", {})
                
                # Extract LLM configuration details
                model = llm_config.get("model", "unknown")
                provider = llm_config.get("provider", "unknown")
                api_key_id = llm_config.get("apiKeyId", "none")
                
                # Extract options as a dictionary
                options_dict = {}
                options = llm_config.get("options", [])
                if options:
                    for option in options:
                        key = option.get("key", "")
                        value = option.get("value", "")
                        if key:
                            options_dict[key] = value
                
                # Log basic LLM info
                logger.info(f"LLM node: {node_id} - {node_label} (Provider: {provider}, Model: {model})")
                
                # Initialize the LLM if we have an API key
                if api_key_id and api_key_id in api_keys:
                    try:
                        if provider.lower() == "gemini" or "google" in provider.lower():
                            # Initialize Gemini model
                            api_key = api_keys[api_key_id]
                            model_data = initialize_gemini_model(api_key, model, options_dict)
                            
                            # Store the initialized model
                            initialized_llms[workflow_id][node_id] = {
                                "provider": "gemini",
                                "model_name": model,
                                "model_data": model_data
                            }
                            
                            logger.info(f"Successfully initialized Gemini model for node {node_id}")
                            initialized_nodes.append(node_id)
                    except Exception as e:
                        logger.error(f"Failed to initialize LLM for node {node_id}: {str(e)}")
        
        # Store workflow status
        workflow_status[workflow_id] = "running"
        
        logger.info(f"Workflow {workflow_id} successfully started")
        logger.info(f"Initialized {len(initialized_nodes)} LLM nodes: {', '.join(initialized_nodes)}")
        
        # Include chat trigger and LLM information in response message
        message = f"Workflow '{workflow_data.name}' is now running"
        if chat_trigger_nodes:
            message += f" with {len(chat_trigger_nodes)} chat trigger nodes"
        if initialized_nodes:
            message += f" and {len(initialized_nodes)} initialized LLM nodes"
        
        return WorkflowResponse(
            status="running", 
            execution_id=workflow_id,
            message=message
        )
        
    except Exception as e:
        logger.error(f"Error starting workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")

@app.get("/api/workflows/{workflow_id}/status", response_model=WorkflowResponse)
async def get_workflow_status(workflow_id: str):
    """
    Get the status of a running workflow
    """
    if workflow_id not in workflow_status:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    
    return WorkflowResponse(
        status=workflow_status.get(workflow_id, "unknown"),
        execution_id=workflow_id
    )

@app.post("/api/workflows/{workflow_id}/stop", response_model=WorkflowResponse)
async def stop_workflow(workflow_id: str):
    """
    Stop a running workflow
    """
    if workflow_id not in workflow_status:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    
    if workflow_status[workflow_id] != "running":
        return WorkflowResponse(
            status=workflow_status[workflow_id],
            execution_id=workflow_id,
            message=f"Workflow is already in {workflow_status[workflow_id]} state"
        )
    
    # Update status
    workflow_status[workflow_id] = "stopped"
    
    logger.info(f"Workflow {workflow_id} stopped")
    
    return WorkflowResponse(
        status="stopped",
        execution_id=workflow_id,
        message="Workflow stopped successfully"
    )

@app.post("/api/workflows/{workflow_id}/pause", response_model=WorkflowResponse)
async def pause_workflow(workflow_id: str):
    """
    Pause a running workflow
    """
    if workflow_id not in workflow_status:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    
    if workflow_status[workflow_id] != "running":
        return WorkflowResponse(
            status=workflow_status[workflow_id],
            execution_id=workflow_id,
            message=f"Workflow is in {workflow_status[workflow_id]} state, cannot pause"
        )
    
    # Update status
    workflow_status[workflow_id] = "paused"
    
    logger.info(f"Workflow {workflow_id} paused")
    
    return WorkflowResponse(
        status="paused",
        execution_id=workflow_id,
        message="Workflow paused successfully"
    )

@app.post("/api/workflows/{workflow_id}/resume", response_model=WorkflowResponse)
async def resume_workflow(workflow_id: str):
    """
    Resume a paused workflow
    """
    if workflow_id not in workflow_status:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    
    if workflow_status[workflow_id] != "paused":
        return WorkflowResponse(
            status=workflow_status[workflow_id],
            execution_id=workflow_id,
            message=f"Workflow is in {workflow_status[workflow_id]} state, cannot resume"
        )
    
    # Update status
    workflow_status[workflow_id] = "running"
    
    logger.info(f"Workflow {workflow_id} resumed")
    
    return WorkflowResponse(
        status="running",
        execution_id=workflow_id,
        message="Workflow resumed successfully"
    )

@app.post("/api/chat/message", response_model=ChatMessageResponse)
async def send_chat_message(message_data: ChatMessageInput):
    """
    Send a chat message to a running workflow
    """
    global initialized_llms, chat_sessions
    
    workflow_id = message_data.workflow_id
    session_id = message_data.session_id
    message = message_data.message
    # We'll only use node_id as a preference, not a requirement
    preferred_node_id = message_data.node_id
    
    logger.info(f"Sending chat message to workflow {workflow_id}, session {session_id}")
    logger.info(f"Message content: {message}")
    
    # Check if workflow exists and is running
    if workflow_id not in workflow_status:
        logger.error(f"Workflow {workflow_id} not found")
        raise HTTPException(
            status_code=404, 
            detail=f"Workflow {workflow_id} not found"
        )
            
    if workflow_status[workflow_id] != "running":
        logger.error(f"Workflow {workflow_id} status is {workflow_status[workflow_id]}")
        raise HTTPException(
            status_code=400, 
            detail=f"Workflow {workflow_id} is {workflow_status[workflow_id]}, not running"
        )
    
    # Initialize session if needed
    session_key = f"{workflow_id}:{session_id}"
    if session_key not in chat_sessions:
        chat_sessions[session_key] = {
            "history": []
        }
    
    # Add user message to history
    chat_sessions[session_key]["history"].append({
        "role": "user",
        "content": message
    })
    
    # First check if there are any LLMs for this workflow
    if workflow_id not in initialized_llms or not initialized_llms[workflow_id]:
        logger.warning(f"No LLMs initialized for workflow {workflow_id}")
        return ChatMessageResponse(
            status="success",
            response=f"Echo: {message} (No LLMs initialized for this workflow)",
            session_id=session_id
        )
    
    # Determine which LLM node to use
    selected_node_id = None
    
    # First try to use the preferred node (if specified and available)
    if preferred_node_id and preferred_node_id in initialized_llms[workflow_id]:
        selected_node_id = preferred_node_id
        logger.info(f"Using preferred node {selected_node_id}")
    else:
        # If preferred node not available, use the first available LLM
        available_nodes = list(initialized_llms[workflow_id].keys())
        if available_nodes:
            selected_node_id = available_nodes[0]
            logger.info(f"Using first available LLM node: {selected_node_id}")
        else:
            logger.warning("No LLM nodes available")
    
    # If we found a node to use
    if selected_node_id:
        llm_data = initialized_llms[workflow_id][selected_node_id]
        logger.info(f"Using initialized {llm_data['provider']} model for chat")
        
        try:
            # Handle based on provider
            if llm_data["provider"] == "gemini":
                model_data = llm_data["model_data"]
                model = model_data["model"]
                
                # Get or create a chat session
                chat_key = f"{workflow_id}:{selected_node_id}:{session_id}"
                if chat_key not in model_data["chat_sessions"]:
                    model_data["chat_sessions"][chat_key] = model.start_chat(
                        history=[]
                    )
                
                chat = model_data["chat_sessions"][chat_key]
                response = chat.send_message(message)
                
                ai_response = response.text
                
                # Add AI response to history
                chat_sessions[session_key]["history"].append({
                    "role": "assistant",
                    "content": ai_response
                })
                
                logger.info(f"Generated response: {ai_response[:50]}...")
                
                return ChatMessageResponse(
                    status="success",
                    response=ai_response,
                    session_id=session_id
                )
            
            else:
                logger.warning(f"Unsupported LLM provider: {llm_data['provider']}")
                return ChatMessageResponse(
                    status="error",
                    response="Unsupported LLM provider",
                    session_id=session_id,
                    error=f"LLM provider {llm_data['provider']} is not supported for chat"
                )
                
        except Exception as e:
            logger.error(f"Error generating chat response: {str(e)}")
            return ChatMessageResponse(
                status="error",
                response=f"Error: {str(e)}",
                session_id=session_id,
                error=str(e)
            )
    
    # If we couldn't find a node to use
    logger.warning(f"No suitable LLM found for chat in workflow {workflow_id}")
    return ChatMessageResponse(
        status="success",
        response=f"Echo: {message} (No suitable LLM found in workflow)",
        session_id=session_id
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 