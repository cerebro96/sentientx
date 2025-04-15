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
import copy

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
# Store for AI Builder chat conversations
builder_sessions: Dict[str, Dict[str, Any]] = {}
# Global instance for the AI Builder Gemini client
ai_builder_model = None

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

def initialize_ai_builder_model():
    """Initialize the dedicated AI Builder model on startup."""
    global ai_builder_model
    api_key = os.getenv("AI_CHATBOT_BUILDER_API")
    if not api_key:
        logger.error("AI_CHATBOT_BUILDER_API key not found in environment variables. Builder disabled.")
        return
    try:
        logger.info("Initializing AI Builder Gemini model (gemini-1.5-flash)")
        # Use a separate configuration for the builder if possible, or ensure the global one is set
        genai.configure(api_key=api_key)
        # Simple config for the builder bot
        generation_config = {"temperature": 0.6, "max_output_tokens": 1000}
        ai_builder_model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            generation_config=generation_config
        )
        logger.info("AI Builder model initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize AI Builder model: {str(e)}")
        ai_builder_model = None # Ensure it's None if init fails

async def generate_builder_response(session_id: str, user_message: str) -> Dict[str, Any]:
    """Handles the conversation logic with the AI Builder."""
    global builder_sessions, ai_builder_model

    if not ai_builder_model:
        logger.warning("AI Builder model not initialized, cannot process chat.")
        return {"response": "Sorry, the AI builder is currently unavailable.", "state": None}

    # Get or create session state
    if session_id not in builder_sessions:
        logger.info(f"Creating new AI builder session: {session_id}")
        builder_sessions[session_id] = {
            "history": [],
            "step": "start",
            "workflow_data": {},
            "user_provided_prompt": None # To store the original prompt
        }
    
    session_state = builder_sessions[session_id]
    history = session_state["history"]
    step = session_state["step"]
    workflow_data = session_state["workflow_data"]
    user_provided_prompt = session_state.get("user_provided_prompt") # Get original prompt if exists

    # Add user message to history (for context)
    # Use a format compatible with Gemini API history
    history.append({"role": "user", "parts": [user_message]})

    ai_response_text = "An internal error occurred."
    next_step = step # Default to staying on the same step
    ready_to_create = False
    updated_workflow_data = copy.deepcopy(workflow_data) # Work on a copy

    try:
        logger.info(f"AI Builder - Session: {session_id}, Current Step: {step}, User Message: {user_message[:50]}...")
        # Start a chat session using the history
        chat = ai_builder_model.start_chat(history=history[:-1]) # Use history BEFORE the current user message
        
        # --- NEW Conversation Logic --- 
        if step == "start":
            # Ask what kind of workflow
            system_instruction = "You are SentientX AI Workflow Builder. Greet the user and ask what kind of workflow they want to build. Only AI Agent Chatbot workflows are supported currently."
            response = await chat.send_message_async(f"{system_instruction} User message: '{user_message}'")
            ai_response_text = response.text
            # Check if user response indicates chatbot
            if "chatbot" in user_message.lower() or "agent" in user_message.lower():
                # User wants chatbot, ask for type/purpose next
                system_instruction_next = "Great! What specific type of AI Agent Chatbot would you like to build? (e.g., sales assistant, customer support bot, appointment scheduler)"
                response_next = await chat.send_message_async(system_instruction_next)
                ai_response_text = response_next.text
                next_step = "get_chatbot_type"
            elif user_message.lower() == 'start': # Handle initial call from frontend
                 # Just return the initial greeting/question
                 pass # ai_response_text already set
                 next_step = "start"
            else:
                # User wants something else, AI should handle saying only chatbots are supported
                # The initial response likely already covers this based on the system instruction
                next_step = "start"
                 
        elif step == "get_chatbot_type":
            # User described the type of chatbot
            chatbot_type_description = user_message.strip()
            updated_workflow_data['chatbot_type_description'] = chatbot_type_description
            # Now ask for the system prompt
            system_instruction = f"Okay, you want to build a '{chatbot_type_description}'. Now, please provide the **System Prompt** you want this chatbot to use. This tells the AI its role, personality, and instructions."
            response = await chat.send_message_async(system_instruction) 
            ai_response_text = response.text
            next_step = "receive_system_prompt"

        elif step == "receive_system_prompt":
            # User has provided the system prompt
            received_prompt = user_message.strip()
            if len(received_prompt) < 10: # Basic check for actual prompt content
                system_instruction = "That doesn't seem like a full system prompt. Please provide the detailed instructions for your chatbot."
                response = await chat.send_message_async(system_instruction)
                ai_response_text = response.text
                next_step = "receive_system_prompt" # Stay here
            else:
                session_state["user_provided_prompt"] = received_prompt # Store original
                updated_workflow_data['system_prompt'] = received_prompt # Store tentatively
                # Use triple quotes for the multi-line f-string
                system_instruction = f"""Got it. Here is the system prompt you provided:

```
{received_prompt}
```

Would you like me to try and improve or refine this prompt for you? (yes/no)"""
                response = await chat.send_message_async(system_instruction)
                ai_response_text = response.text
                next_step = "offer_refinement_decision"

        elif step == "offer_refinement_decision":
            # Ask the AI to decide based on user response to refinement offer
            system_instruction = f"User was asked if they want help improving the prompt. Their response was '{user_message}'. If 'yes', acknowledge and proceed to refine. If 'no', confirm saving the original prompt and move to model confirmation. Otherwise, ask for 'yes' or 'no'."
            response = await chat.send_message_async(system_instruction)
            ai_response_text = response.text
            if user_message.lower().strip() == 'yes':
                next_step = "refine_prompt"
            elif user_message.lower().strip() == 'no':
                updated_workflow_data['system_prompt'] = user_provided_prompt # Ensure original is saved
                next_step = "confirm_model" # Skip refinement
            else:
                next_step = "offer_refinement_decision" # Ask again

        elif step == "refine_prompt":
            # This step generates the refined prompt and asks for confirmation
            if not user_provided_prompt:
                 ai_response_text = "Error: Cannot refine without the original prompt. Let's go back. Please provide the system prompt."
                 next_step = "receive_system_prompt"
            else:
                system_instruction_for_refinement = f"Improve this system prompt for an AI Agent Chatbot, making it clear, concise, and effective: ```{user_provided_prompt}```. Output ONLY the improved prompt text."
                refinement_response = await ai_builder_model.generate_content_async(system_instruction_for_refinement)
                refined_prompt = refinement_response.text.strip()
                updated_workflow_data['system_prompt_refined'] = refined_prompt 
                
                # Use triple quotes for the multi-line f-string
                system_instruction_for_confirmation = f"""Here is a suggested refinement:

```
{refined_prompt}
```

Would you like to use this improved version? (yes/no)"""
                response = await chat.send_message_async(system_instruction_for_confirmation)
                ai_response_text = response.text
                next_step = "confirm_refined_prompt"

        elif step == "confirm_refined_prompt":
            # Ask AI to decide based on user response to the *refined* prompt offer
            refined_prompt = updated_workflow_data.get('system_prompt_refined')
            system_instruction = f"User was shown the refined prompt: ```{refined_prompt}```. Their response was '{user_message}'. If 'yes', confirm saving refined prompt and move to model confirmation. If 'no', ask if they want to use their *original* prompt instead (yes/no). Otherwise, ask for 'yes' or 'no' regarding the refined prompt."
            response = await chat.send_message_async(system_instruction)
            ai_response_text = response.text
            
            if user_message.lower().strip() == 'yes':
                updated_workflow_data['system_prompt'] = refined_prompt # Save refined version
                next_step = "confirm_model"
            elif user_message.lower().strip() == 'no':
                next_step = "confirm_original_after_refine" # Ask about original
            else:
                next_step = "confirm_refined_prompt" # Ask again about refined

        elif step == "confirm_original_after_refine":
            # Ask AI to decide based on user response about using original after rejecting refined
            system_instruction = f"User rejected the refined prompt. They were asked if they want to use their original prompt: ```{user_provided_prompt}```. Their response was '{user_message}'. If 'yes', confirm saving original and move to model confirmation. If 'no', ask them to provide a new prompt. Otherwise, ask for 'yes' or 'no' regarding the original prompt."
            response = await chat.send_message_async(system_instruction)
            ai_response_text = response.text
            if user_message.lower().strip() == 'yes':
                updated_workflow_data['system_prompt'] = user_provided_prompt # Save original
                next_step = "confirm_model"
            elif user_message.lower().strip() == 'no':
                 # Clear stored prompts and go back
                 session_state["user_provided_prompt"] = None
                 updated_workflow_data.pop('system_prompt', None)
                 updated_workflow_data.pop('system_prompt_refined', None)
                 next_step = "receive_system_prompt"
            else:
                 next_step = "confirm_original_after_refine" # Ask again

        # --- Steps after prompt confirmation (confirm_model onwards) --- 
        elif step == "confirm_model":
             # System instruction already included asking about the model in previous steps
             system_instruction = "User is confirming the model. Remind them only Gemini 1.5 Flash is available. If they say 'yes', proceed to ask for API Key ID. If they say anything else, reiterate the limitation and ask for 'yes'."
             response = await chat.send_message_async(f"{system_instruction} User response: '{user_message}'") 
             ai_response_text = response.text
             if user_message.lower().strip() == 'yes':
                 updated_workflow_data['model'] = 'gemini-1.5-flash'
                 updated_workflow_data['provider'] = 'gemini' 
                 next_step = "get_api_key"
             else:
                 next_step = "confirm_model"

        elif step == "get_api_key":
             system_instruction = "User confirmed model. Ask for the API Key ID (found in Credentials)."
             # Pass previous AI response for context, AI asks the question
             response = await chat.send_message_async(f"{system_instruction} Previous AI message was: {history[-2]['parts'][0]}. User input (API Key ID): '{user_message}'") 
             ai_response_text = response.text
             api_key_id = user_message.strip()
             is_potentially_valid = len(api_key_id) > 10 and not any(c in api_key_id for c in ' <>[]{}\"')
             if is_potentially_valid:
                 updated_workflow_data['apiKeyId'] = api_key_id
                 # AI response should now ask for workflow name
                 next_step = "get_name"
             else: # Keep asking if invalid
                 # AI response should indicate invalid and ask again
                 next_step = "get_api_key"

        elif step == "get_name":
             system_instruction = "User provided API Key ID. Ask for the workflow name."
             response = await chat.send_message_async(f"{system_instruction} User input (Workflow Name): '{user_message}'")
             ai_response_text = response.text
             if len(user_message.strip()) > 0:
                  updated_workflow_data['name'] = user_message.strip()
                  # AI response should ask for description
                  next_step = "get_wf_description"
             else:
                  # AI response should ask for name again
                  next_step = "get_name"

        elif step == "get_wf_description":
             system_instruction = "User provided name. Ask for the workflow description."
             response = await chat.send_message_async(f"{system_instruction} User input (Description): '{user_message}'")
             ai_response_text = response.text
             updated_workflow_data['description'] = user_message.strip()
             # AI response should ask for tags
             next_step = "get_tags"

        elif step == "get_tags":
             tags = [tag.strip() for tag in user_message.split(',') if tag.strip()]
             updated_workflow_data['tags'] = tags
             # AI presents summary and asks for confirmation
             system_instruction = f"User provided tags: {tags}. Present a summary (Name, Desc, Tags, Model, API ID, Prompt) and ask if ready to create."
             summary_text = f"Name: {updated_workflow_data.get('name', 'N/A')}, Desc: {updated_workflow_data.get('description', 'N/A')}, Tags: {tags or 'None'}, Model: {updated_workflow_data.get('model', 'N/A')}, API Key ID: {updated_workflow_data.get('apiKeyId', 'N/A')}, Prompt: {updated_workflow_data.get('system_prompt', 'N/A')[:40]}..."
             response = await chat.send_message_async(f"{system_instruction} Summary: {summary_text}")
             ai_response_text = response.text
             next_step = "summarize"

        elif step == "summarize":
             # AI confirms readiness based on user input
             system_instruction = "User shown summary. If 'yes', confirm ready and tell them to use button. If not, ask what to change."
             response = await chat.send_message_async(f"{system_instruction} User response: '{user_message}'")
             ai_response_text = response.text
             if user_message.lower().strip() == 'yes':
                 ready_to_create = True
                 next_step = "ready_to_create"
             else:
                 # AI should ask what to change
                 next_step = "summarize" # Stay here for now
                 
        elif step == "ready_to_create":
             # AI reminds user to click the button
             system_instruction = "User is ready. Remind them to use the 'Create Workflow from Chat' button."
             response = await chat.send_message_async(system_instruction)
             ai_response_text = response.text
             ready_to_create = True
             next_step = "ready_to_create"

        else:
            # Fallback
            logger.warning(f"AI Builder reached unknown step: {step}")
            response = await chat.send_message_async("I seem to have lost my place. Let's restart. What kind of workflow do you want to build? Remember, only AI Agent Chatbots are supported now.")
            ai_response_text = response.text
            next_step = "start"
            updated_workflow_data = {}
            session_state["user_provided_prompt"] = None
            builder_sessions[session_id]["history"] = [] 

    except Exception as e:
        logger.error(f"Error during AI Builder chat processing (step: {step}): {str(e)}", exc_info=True)
        ai_response_text = "Sorry, I encountered an error processing your request. Please try again."

    # Add AI response to history for future context
    history.append({"role": "model", "parts": [ai_response_text]})

    # Update session state
    session_state["step"] = next_step
    session_state["workflow_data"] = updated_workflow_data
    session_state["history"] = history[-20:] # Keep last 10 pairs

    logger.info(f"AI Builder - Session: {session_id}, Next Step: {next_step}, Ready: {ready_to_create}")

    return {
        "response": ai_response_text,
        "state": {
            "step": next_step,
            "ready_to_create": ready_to_create,
            "workflow_data": updated_workflow_data if ready_to_create else None 
        }
    }

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

class BuilderChatInput(BaseModel):
    message: str
    session_id: str # Use a unique ID for each builder session (e.g., generated by frontend)

class BuilderChatResponse(BaseModel):
    response: str
    state: Optional[Dict[str, Any]] = None

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
                    {"role": msg["role"], "parts": [msg["content"]]}
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