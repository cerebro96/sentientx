from temporalio import activity
from typing import Dict, Any, List, Optional
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@activity.defn
async def process_node(node: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single node in the workflow"""
    node_id = node.get("id", "unknown")
    node_type = node.get("type", "unknown")
    
    logger.info(f"Processing node {node_id} of type {node_type}")
    
    # Get node data (label, settings, etc.)
    data = node.get("data", {})
    label = data.get("label", "Unnamed Node")
    
    result = {"node_id": node_id, "status": "completed", "output": None}
    
    # Process different node types
    if node_type == "action":
        if data.get("label") == "AI Agent":
            result = await _process_ai_agent_node(node)
        elif "llm" in data.get("label", "").lower():
            result = await _process_llm_node(node)
        elif "memory" in data.get("label", "").lower():
            result = await _process_memory_node(node)
        else:
            # Default action handling
            result = await _process_generic_action(node)
    elif node_type == "trigger":
        result = await _process_trigger_node(node)
    else:
        logger.warning(f"Unknown node type {node_type} for node {node_id}")
        result["status"] = "skipped"
        
    logger.info(f"Completed processing node {node_id} with status {result['status']}")
    return result

async def _process_ai_agent_node(node: Dict[str, Any]) -> Dict[str, Any]:
    """Process an AI Agent node"""
    node_id = node.get("id", "unknown")
    data = node.get("data", {})
    
    # Extract child nodes configuration
    child_nodes = data.get("childNodes", [])
    
    logger.info(f"Processing AI Agent node {node_id} with {len(child_nodes)} child components")
    
    # In a real implementation, we would:
    # 1. Find connected LLM, Memory, Tools, etc. based on edge connections
    # 2. Configure AI agent with these components
    # 3. Run the agent to process user input or other triggers
    
    # Simulate processing
    return {
        "node_id": node_id,
        "status": "completed",
        "output": {"response": "AI Agent processed successfully"}
    }

async def _process_llm_node(node: Dict[str, Any]) -> Dict[str, Any]:
    """Process an LLM node"""
    node_id = node.get("id", "unknown")
    data = node.get("data", {})
    
    # Extract LLM configuration
    llm_config = data.get("llmConfig", {})
    provider = llm_config.get("provider", "unknown")
    model = llm_config.get("model", "unknown")
    
    logger.info(f"Processing LLM node {node_id} with provider {provider} and model {model}")
    
    # In a real implementation, we would:
    # 1. Connect to the appropriate LLM API
    # 2. Send the request with proper formatting
    # 3. Process and return the response
    
    return {
        "node_id": node_id,
        "status": "completed",
        "output": {"text": f"Response from {provider} {model} would appear here"}
    }

async def _process_memory_node(node: Dict[str, Any]) -> Dict[str, Any]:
    """Process a memory node"""
    node_id = node.get("id", "unknown")
    data = node.get("data", {})
    
    # Extract memory configuration
    memory_config = data.get("memoryConfig", {})
    
    logger.info(f"Processing Memory node {node_id}")
    
    # Simulate memory operations
    return {
        "node_id": node_id,
        "status": "completed",
        "output": {"memory_status": "retrieved"}
    }

async def _process_trigger_node(node: Dict[str, Any]) -> Dict[str, Any]:
    """Process a trigger node (webhook, chat, etc.)"""
    node_id = node.get("id", "unknown")
    data = node.get("data", {})
    
    logger.info(f"Processing Trigger node {node_id}")
    
    # For triggers, we might need to set up webhook listeners or chat interfaces
    return {
        "node_id": node_id,
        "status": "completed",
        "output": {"trigger_activated": True}
    }

async def _process_generic_action(node: Dict[str, Any]) -> Dict[str, Any]:
    """Process a generic action node"""
    node_id = node.get("id", "unknown")
    data = node.get("data", {})
    
    logger.info(f"Processing generic node {node_id}")
    
    # Handle generic node logic
    return {
        "node_id": node_id,
        "status": "completed",
        "output": {"processed": True}
    } 