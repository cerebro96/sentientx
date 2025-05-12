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
from google.cloud import pubsub_v1
from google.oauth2 import service_account
from datetime import datetime, timezone
import httpx  # Add httpx for making HTTP requests

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

# --- Pub/Sub Globals ---
publisher: Optional[pubsub_v1.PublisherClient] = None
topic_path: Optional[str] = None

# --- ADK Globals (for Builder) ---
# ... llm_agent, session_service, runner, etc. ...

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

def initialize_pubsub():
    """Initializes the Pub/Sub client using credentials from env var JSON string."""
    logger.info("Attempting to initialize Pub/Sub client...")
    local_publisher = None
    local_topic_path = None
    
    credentials_json_str = os.getenv("GOOGLE_CREDENTIALS_JSON")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    topic_id = os.getenv("PUBSUB_TOPIC_ID")

    if credentials_json_str and project_id and topic_id:
        try:
            # Load credentials directly from the JSON string in the env var
            credentials_info = json.loads(credentials_json_str)
            credentials = service_account.Credentials.from_service_account_info(credentials_info)
            
            # Initialize publisher with the credentials object
            local_publisher = pubsub_v1.PublisherClient(credentials=credentials)
            local_topic_path = local_publisher.topic_path(project_id, topic_id)
            logger.info(f"Pub/Sub Publisher initialized successfully for topic: {local_topic_path}")
            
        except json.JSONDecodeError:
            logger.error("Failed to parse JSON from GOOGLE_CREDENTIALS_JSON environment variable. Ensure it contains valid JSON.")
        except Exception as e:
            logger.error(f"Failed to initialize Pub/Sub Publisher from credentials JSON: {e}", exc_info=True)
            local_publisher = None # Ensure reset on error
            local_topic_path = None
    else:
        # Log which specific variables are missing
        missing_vars = []
        if not credentials_json_str: missing_vars.append("GOOGLE_CREDENTIALS_JSON (as string)")
        if not project_id: missing_vars.append("GOOGLE_CLOUD_PROJECT")
        if not topic_id: missing_vars.append("PUBSUB_TOPIC_ID")
        logger.warning(f"Required environment variables missing for Pub/Sub ({', '.join(missing_vars)}). Pub/Sub publishing disabled.")
        
    return local_publisher, local_topic_path

# --- FastAPI App Setup --- 
@asynccontextmanager
async def lifespan(app: FastAPI):
    global llm_agent, session_service, runner, publisher, topic_path # Add publisher/topic_path
    logger.info("Starting main FastAPI application...")

    """Initialize AI Builder model on startup."""
    initialize_ai_builder_model()
    
    # --- Initialize Pub/Sub ---
    pubsub_publisher, pubsub_topic_path = initialize_pubsub()
    # Assign to globals if initialization was successful
    if pubsub_publisher and pubsub_topic_path:
        publisher = pubsub_publisher
        topic_path = pubsub_topic_path
    # -------------------------------------------

    yield
    logger.info("Shutting down FastAPI application")
    # Optional: Add Pub/Sub client cleanup if needed, though often not required

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

class SupabaseAgentRegisterInput(BaseModel):
    user_id: str
    supabase_url: str
    supabase_key: str

class SupabaseAgentRunInput(BaseModel):
    user_id: str
    session_id: str
    message: str
    supabase_url: str
    supabase_key: str

class SupabaseAgentResponse(BaseModel):
    status: str
    session_id: str
    message: Optional[str] = None
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

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
                # --- Publish to Pub/Sub --- 
                if publisher and topic_path:
                    try:
                        # timestamp_utc = datetime.now(timezone.utc).isoformat(timespec='microseconds') + "Z"
                        timestamp_utc = datetime.now(timezone.utc)
                        formatted_timestamp = timestamp_utc.isoformat(timespec='microseconds') # Keep Z implicit with timezone
                         
                        message_payload = {
                            "eventType": "webhook_interaction",
                            "workflowId": workflow_id,
                            "webhookId": preferred_node_id, 
                            "sessionId": session_id,
                            "requestBody": {"message": message}, 
                            "responseBody": {"response": ai_response}, 
                            "timestamp": formatted_timestamp
                        }
                        message_data_bytes = json.dumps(message_payload, ensure_ascii=False).encode('utf-8')
                        
                        # --- Synchronous Publish --- 
                        logger.info(f"Attempting synchronous Pub/Sub publish for session {session_id}...")
                        publish_future = publisher.publish(topic_path, data=message_data_bytes)
                        # Block and wait for the result. Raises exception on failure.
                        message_id = publish_future.result(timeout=30) 
                        logger.info(f"Successfully published Pub/Sub message {message_id} for session {session_id}.")
                        # ---------------------------
                        
                    except Exception as pubsub_error:
                        # Log error but don't fail the main API request (unless desired)
                        # If you *want* the API call to fail if Pub/Sub fails, re-raise the exception here.
                        logger.error(f"Error during synchronous Pub/Sub publish for session {session_id}: {pubsub_error}", exc_info=True)
                # --- End Pub/Sub Publish ---
                
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

# --- Supabase Agent Endpoints ---

@app.post("/api/supabase/registeragent", response_model=SupabaseAgentResponse)
async def register_supabase_agent(data: Dict[str, Any] = Body(...)):
    """Register a new Supabase Agent with credentials."""
    try:
        # Extract data from request
        user_id = data.get("user_id")
        message = data.get("message", "")
        session_id = data.get("sessionId")
        
        if not user_id or not session_id:
            raise HTTPException(status_code=400, detail="Missing required fields: user_id and sessionId")
        
        # Get the base URL from environment variable
        base_url = os.getenv("SUPABASEAGENT_URL", "http://localhost:8000")
        
        # Construct the full URL
        url = f"{base_url}/apps/supabase_agent/users/{user_id}/sessions/{session_id}"
        
        logger.info(f"Forwarding request to Supabase Agent URL: {url}")
        
        # Forward the request to the Supabase Agent URL
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json={"message": message},
                headers={"Content-Type": "application/json"}
            )
            
        # Check if the request was successful
        if response.status_code != 200:
            error_text = await response.text()
            # If the external service returns 400, treat it as Not Found locally
            if response.status_code == 400:
                logger.warning(f"Supabase Agent service returned 400 for session {session_id}. Treating as Not Found.")
                raise HTTPException(
                    status_code=404, 
                    detail=f"Supabase Agent session not found or invalid: {session_id}"
                )
            # For other errors, forward the status and message
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error from Supabase Agent service: {error_text}"
            )
            
        # Parse the response safely
        response_data = {}
        try:
            raw_data = response.json()
            # Ensure response_data is a dictionary - wrap non-dict responses
            if isinstance(raw_data, dict):
                response_data = raw_data
            else:
                # If it's not a dictionary, wrap it in a dictionary
                response_data = {"result": raw_data}
        except Exception as e:
            logger.warning(f"Failed to parse JSON response: {str(e)}")
        
        logger.info(f"Supabase Agent response: {response_data}")
        # Return the response with session ID
        return SupabaseAgentResponse(
            status="success",
            session_id=session_id,
            data=response_data
        )
    except httpx.RequestError as e:
        logger.error(f"Error connecting to Supabase Agent: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Error connecting to Supabase Agent service: {str(e)}")
    except Exception as e:
        logger.error(f"Error in register_supabase_agent: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Not Found session: {session_id}")

@app.post("/api/supabase/runagent", response_model=SupabaseAgentResponse)
async def run_supabase_agent(data: Dict[str, Any] = Body(...)):
    """Run a Supabase Agent with the provided credentials."""
    try:
        # Extract data from the frontend request
        user_id = data.get("user_id")
        session_id = data.get("session_id")
        message = data.get("message", "")
        supabase_url = data.get("supabase_url")
        supabase_key = data.get("supabase_key")
        
        if not user_id or not session_id:
            raise HTTPException(status_code=400, detail="Missing required fields: user_id and session_id")
        
        # Build the special message text if credentials are provided
        message_text = message
        if supabase_url and supabase_key:
            # Format the credentials as expected by the agent
            if not message:
                message_text = f"[[SUPABASE_URL={supabase_url},SUPABASE_KEY={supabase_key}]]"
        
        # Construct the payload in the format expected by the external service
        payload = {
            "app_name": "supabase_agent",
            "user_id": user_id,
            "session_id": session_id,
            "new_message": {
                "role": "user",
                "parts": [
                    {
                        "text": message_text
                    }
                ]
            }
        }
        
        # Get the backend URL from environment or use default
        agent_url = os.getenv("SUPABASEAGENT_URL", "http://localhost:8000")
        run_endpoint = f"{agent_url}/run"
        
        logger.info(f"Forwarding request to Supabase Agent run endpoint: {run_endpoint}")
        logger.debug(f"Sending payload: {json.dumps(payload)}")
        
        # Forward the request to the external service
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                run_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
        
        # Check if the request was successful
        if response.status_code != 200:
            error_text = await response.text()
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error from Supabase Agent service: {error_text}"
            )
        
        # Parse the response safely
        response_data = {}
        try:
            raw_data = response.json()
            # Ensure response_data is a dictionary - wrap non-dict responses
            if isinstance(raw_data, dict):
                response_data = raw_data
            else:
                # If it's not a dictionary, wrap it in a dictionary
                response_data = {"result": raw_data}
        except Exception as e:
            logger.warning(f"Failed to parse JSON response: {str(e)}")
        logger.info(f"Supabase Agent response: {response_data}")
        # Return the response with session ID
        return SupabaseAgentResponse(
            status="success",
            session_id=session_id,
            data=response_data
        )
        
    except httpx.RequestError as e:
        logger.error(f"Error connecting to Supabase Agent: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Error connecting to Supabase Agent service: {str(e)}")
    except Exception as e:
        logger.error(f"Error running Supabase agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/supabase/message", response_model=SupabaseAgentResponse)
async def supabase_agent_message(data: Dict[str, Any] = Body(...)):
    """Send a message to the Supabase Agent's /run endpoint."""
    try:
        user_id = data.get("user_id")
        session_id = data.get("session_id")
        message = data.get("message")

        if not all([user_id, session_id, message]):
            raise HTTPException(status_code=400, detail="Missing required fields: user_id, session_id, and message")

        # Construct the payload for the external /run endpoint
        payload = {
            "app_name": "supabase_agent",
            "user_id": user_id,
            "session_id": session_id,
            "new_message": {
                "role": "user",
                "parts": [{"text": message}]
            }
        }

        agent_url = os.getenv("SUPABASEAGENT_URL", "http://localhost:8000")
        run_endpoint = f"{agent_url}/run"

        logger.info(f"Forwarding message to Supabase Agent /run: {run_endpoint} for session {session_id}")
        logger.debug(f"Payload: {json.dumps(payload)}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                run_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"}
            )

        if response.status_code != 200:
            error_text = await response.text()
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error from Supabase Agent service (/run): {error_text}"
            )

        response_data = {}
        try:
            raw_data = response.json()
            if isinstance(raw_data, dict):
                response_data = raw_data
            else:
                response_data = {"result": raw_data}
        except Exception as e:
            logger.warning(f"Failed to parse JSON response from /run: {str(e)}")
        logger.info(f"Supabase Agent response: {response_data}")

        extracted_message = ""
        try:
            for result in response_data['result']:
                for part in result['content']['parts']:
                    if 'text' in part:
                        text = part['text']
                        # If the text looks like it contains JSON or code blocks, extract just the content
                        if text.startswith('```') and text.endswith('```'):
                            # Extract content between code blocks
                            content = text.split('```')[1]
                            if content.startswith('json\n'):
                                content = content[5:]  # Remove 'json\n' prefix
                            try:
                                # Try to parse as JSON if that's what it is
                                parsed_json = json.loads(content.strip())
                                # If parsed_json is a list, dict, or non-string type, convert to JSON string
                                if not isinstance(parsed_json, str):
                                    extracted_message = json.dumps(parsed_json)
                                else:
                                    extracted_message = parsed_json
                            except json.JSONDecodeError:
                                # If it's not valid JSON, just use the cleaned text
                                extracted_message = content.strip()
                        else:
                            # Use the raw text if it's not in code blocks
                            extracted_message = text
        except Exception as e:
            logger.warning(f"Error extracting clean content: {str(e)}")
            # Fallback to using the first text part if available
            if response_data.get('result') and len(response_data['result']) > 0:
                first_result = response_data['result'][0]
                if 'content' in first_result and 'parts' in first_result['content']:
                    first_part = first_result['content']['parts'][0]
                    extracted_message = first_part.get('text', '')
            
        # Final check to ensure extracted_message is a string
        if not isinstance(extracted_message, str):
            try:
                extracted_message = json.dumps(extracted_message)
            except:
                # Last resort fallback
                extracted_message = str(extracted_message)
            
        return SupabaseAgentResponse(
            status="success",
            session_id=session_id,
            message=extracted_message
        )
        
    except httpx.RequestError as e:
        logger.error(f"Error connecting to Supabase Agent (/run): {str(e)}")
        raise HTTPException(status_code=503, detail=f"Error connecting to Supabase Agent service: {str(e)}")
    except Exception as e:
        logger.error(f"Error in supabase_agent_message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# --- Main Execution --- 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True) 