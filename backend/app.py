from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
import json
import os
from dotenv import load_dotenv
import uuid
import google.generativeai as genai
from contextlib import asynccontextmanager

# Import the AI Builder functionality
from ai_builder import initialize_ai_builder_model, generate_builder_response, BuilderChatInput, BuilderChatResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# --- Globals --- 
# Store for workflow status (simple start/stop)
workflow_status = {}
# Store for initialized LLMs for *running* workflows
initialized_llms = {}
# Store for chat sessions for *running* workflows
chat_sessions = {}

# --- Helper Functions --- 

def initialize_gemini_model(api_key: str, model_name: str, settings: Dict[str, Any]):
    """Initialize a Gemini model for a RUNNING workflow."""
    try:
        logger.info(f"Initializing Gemini model for workflow execution: {model_name}")
        # Configure API key specifically for this instance if genai allows, otherwise rely on global configure
        # Note: Current genai SDK might rely on global configure(). Adapt if SDK changes.
        genai.configure(api_key=api_key)
        temperature = float(settings.get("temperature", 0.7))
        max_output_tokens = int(settings.get("max-output-tokens", 1024))
        system_prompt = settings.get("system-prompt", "")
        generation_config = {"temperature": temperature, "max_output_tokens": max_output_tokens}
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            system_instruction=system_prompt
        )
        return {"model": model, "chat_sessions": {}, "system_prompt": system_prompt}
    except Exception as e:
        logger.error(f"Error initializing Gemini model for workflow: {str(e)}")
        raise

# --- FastAPI App Setup --- 
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize AI Builder model on startup."""
    initialize_ai_builder_model()
    yield
    # Cleanup if needed on shutdown
    logger.info("Shutting down FastAPI application")

app = FastAPI(
    title="SentientX Workflow API", 
    description="API for managing and executing AI workflows",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Models --- 
class WorkflowInput(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    name: str
    workflow_id: Optional[str] = None
    is_active: bool = True
    tags: List[str] = []
    api_keys: Optional[Dict[str, str]] = None

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

# --- API Endpoints --- 

@app.post("/api/builder/chat", response_model=BuilderChatResponse)
async def handle_builder_chat(chat_input: BuilderChatInput):
    """Handles chat messages for the AI Workflow Builder."""
    # Generate a unique session ID if not provided or handle appropriately
    # For simplicity, we'll rely on the frontend sending a consistent ID for the dialog session
    if not chat_input.session_id:
         raise HTTPException(status_code=400, detail="session_id is required.")
         
    try:
        result = await generate_builder_response(chat_input.session_id, chat_input.message)
        return BuilderChatResponse(**result)
    except Exception as e:
        logger.error(f"Error in /api/builder/chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error processing chat message.")

@app.post("/api/workflows/start", response_model=WorkflowResponse)
async def start_workflow(workflow_data: WorkflowInput):
    """Start a workflow execution (simplified)."""
    global initialized_llms
    logger.info(f"Received request to start workflow: {workflow_data.name}")
    try:
        workflow_id = workflow_data.workflow_id or f"workflow-{workflow_data.name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:8]}"
        initialized_llms[workflow_id] = {}
        api_keys = workflow_data.api_keys or {}
        
        llm_nodes = [n for n in workflow_data.nodes if "llmConfig" in n.get("data", {})]
        initialized_nodes = []
        if llm_nodes:
            logger.info(f"Processing {len(llm_nodes)} LLM nodes for workflow {workflow_id}")
            for node in llm_nodes:
                # ... (Existing LLM node initialization logic) ...
                node_id = node.get("id", "unknown")
                llm_config = node.get("data", {}).get("llmConfig", {})
                provider = llm_config.get("provider", "unknown")
                api_key_id = llm_config.get("apiKeyId", "none")
                model = llm_config.get("model", "unknown")
                options_dict = {opt.get("key"): opt.get("value") for opt in llm_config.get("options", []) if opt.get("key")}
                
                if api_key_id in api_keys:
                    try:
                        if provider.lower() == "gemini" or "google" in provider.lower():
                             api_key = api_keys[api_key_id]
                             model_data = initialize_gemini_model(api_key, model, options_dict)
                             initialized_llms[workflow_id][node_id] = {
                                 "provider": "gemini",
                                 "model_name": model,
                                 "model_data": model_data
                             }
                             initialized_nodes.append(node_id)
                             logger.info(f"Initialized Gemini model for node {node_id}")
                    except Exception as e:
                         logger.error(f"Failed to initialize LLM for node {node_id}: {str(e)}")
            logger.info(f"Initialized {len(initialized_nodes)} LLM nodes: {', '.join(initialized_nodes)}")
            
        workflow_status[workflow_id] = "running"
        logger.info(f"Workflow {workflow_id} successfully started")
        return WorkflowResponse(status="running", execution_id=workflow_id, message=f"Workflow '{workflow_data.name}' started.")
    except Exception as e:
        logger.error(f"Error starting workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")

@app.post("/api/workflows/{workflow_id}/stop", response_model=WorkflowResponse)
async def stop_workflow(workflow_id: str):
    """Stop a running workflow and clean up resources."""
    global initialized_llms, chat_sessions, workflow_status
    if workflow_id not in workflow_status or workflow_status[workflow_id] != "running":
        status = workflow_status.get(workflow_id, "not found")
        raise HTTPException(status_code=400, detail=f"Workflow {workflow_id} is not running (status: {status}).")
    
    logger.info(f"Stopping workflow {workflow_id} and cleaning up resources")
    # ... (Existing cleanup logic) ...
    if workflow_id in initialized_llms:
        logger.info(f"Cleaning up LLMs for workflow {workflow_id}")
        initialized_llms.pop(workflow_id)
    sessions_to_remove = [k for k in chat_sessions if k.startswith(f"{workflow_id}:")]
    for k in sessions_to_remove:
        chat_sessions.pop(k)
    logger.info(f"Removed {len(sessions_to_remove)} chat sessions.")
        
    workflow_status[workflow_id] = "stopped"
    logger.info(f"Workflow {workflow_id} stopped and resources cleaned up")
    return WorkflowResponse(status="stopped", execution_id=workflow_id, message="Workflow stopped successfully.")

@app.post("/api/chat/message", response_model=ChatMessageResponse)
async def send_chat_message(message_data: ChatMessageInput):
    """Handles chat messages for RUNNING workflows."""
    global initialized_llms, chat_sessions, workflow_status
    workflow_id = message_data.workflow_id
    session_id = message_data.session_id
    message = message_data.message
    preferred_node_id = message_data.node_id # Used as preference

    logger.info(f"Received chat message for running workflow {workflow_id}, session {session_id}")

    if workflow_id not in workflow_status or workflow_status[workflow_id] != "running":
         status = workflow_status.get(workflow_id, "not found")
         raise HTTPException(status_code=400, detail=f"Workflow {workflow_id} is not running (status: {status}).")

    # ... (Existing chat session history management logic) ...
    session_key = f"{workflow_id}:{session_id}"
    if session_key not in chat_sessions:
        chat_sessions[session_key] = {"history": []}
    chat_sessions[session_key]["history"].append({"role": "user", "content": message})

    # ... (Existing logic to find and use an LLM node for chat) ...
    selected_node_id = None
    if workflow_id in initialized_llms:
        if preferred_node_id and preferred_node_id in initialized_llms[workflow_id]:
            selected_node_id = preferred_node_id
        elif initialized_llms[workflow_id]:
            # Fallback to first available LLM node in the workflow
            try:
                selected_node_id = list(initialized_llms[workflow_id].keys())[0]
            except IndexError:
                logger.warning(f"Workflow {workflow_id} has LLM dict but no nodes.")
                selected_node_id = None
            
    if selected_node_id:
        llm_data = initialized_llms[workflow_id][selected_node_id]
        logger.info(f"Using {llm_data.get('provider', 'unknown')} model ({selected_node_id}) for chat reply.")
        try:
            if llm_data.get("provider") == "gemini":
                # ... (Existing Gemini chat interaction logic) ...
                model_data = llm_data.get("model_data", {})
                model = model_data.get("model")
                if not model:
                    raise ValueError("Gemini model object not found in stored data.")
                
                chat_sessions_dict = model_data.setdefault("chat_sessions", {})
                chat_key = f"{workflow_id}:{selected_node_id}:{session_id}"
                
                # Get chat history for this specific session (if any)
                # Note: This history is separate from the builder history
                current_session_history = chat_sessions.get(session_key, {}).get("history", [])
                # Format history for Gemini API (excluding last user message which is the current input)
                gemini_history = [
                    {"role": "user" if msg["role"] == "user" else "model", "parts": [msg["content"]]}
                    for msg in current_session_history[:-1]
                ]
                
                # Start chat with potentially existing history for context
                chat = model.start_chat(history=gemini_history)
                
                response = await chat.send_message_async(message) # Send only the current message
                ai_response = response.text
                chat_sessions[session_key]["history"].append({"role": "assistant", "content": ai_response})
                return ChatMessageResponse(status="success", response=ai_response, session_id=session_id)
            else:
                provider = llm_data.get('provider', 'unknown')
                logger.warning(f"Unsupported provider: {provider}")
                raise HTTPException(status_code=501, detail=f"Unsupported LLM provider '{provider}' for chat.")
        except Exception as e:
             logger.error(f"Error generating chat response: {str(e)}", exc_info=True)
             raise HTTPException(status_code=500, detail="Error generating AI response.")
    else:
         logger.warning(f"No suitable LLM found for workflow {workflow_id}")
         return ChatMessageResponse(status="success", response=f"Echo: {message} (No LLM initialized)", session_id=session_id)

# --- Other Endpoints (Keep simplified versions) ---
@app.get("/api/workflows/{workflow_id}/status", response_model=WorkflowResponse)
async def get_workflow_status(workflow_id: str):
    if workflow_id not in workflow_status:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    return WorkflowResponse(status=workflow_status.get(workflow_id, "unknown"), execution_id=workflow_id)

@app.post("/api/workflows/{workflow_id}/pause", response_model=WorkflowResponse)
async def pause_workflow(workflow_id: str):
    # Simplified: just update status if running
    if workflow_id in workflow_status and workflow_status[workflow_id] == "running":
        workflow_status[workflow_id] = "paused"
        return WorkflowResponse(status="paused", execution_id=workflow_id, message="Workflow paused.")
    status = workflow_status.get(workflow_id, "not found")
    raise HTTPException(status_code=400, detail=f"Workflow not in running state (status: {status}).")

@app.post("/api/workflows/{workflow_id}/resume", response_model=WorkflowResponse)
async def resume_workflow(workflow_id: str):
    # Simplified: just update status if paused
    if workflow_id in workflow_status and workflow_status[workflow_id] == "paused":
        workflow_status[workflow_id] = "running"
        return WorkflowResponse(status="running", execution_id=workflow_id, message="Workflow resumed.")
    status = workflow_status.get(workflow_id, "not found")
    raise HTTPException(status_code=400, detail=f"Workflow not in paused state (status: {status}).")

# --- Main Execution --- 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 