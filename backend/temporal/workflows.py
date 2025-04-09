from datetime import timedelta
from temporalio import workflow
from typing import Dict, List, Any, Optional

# Define workflow interfaces
class WorkflowPayload:
    def __init__(self, nodes: List[Dict], edges: List[Dict], workflow_id: str, name: str):
        self.nodes = nodes
        self.edges = edges
        self.workflow_id = workflow_id
        self.name = name

@workflow.defn
class AIAgentWorkflow:
    """Workflow that orchestrates AI agent execution based on node configuration"""
    
    @workflow.run
    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the workflow based on the provided nodes and edges
        
        Args:
            payload: Dictionary containing nodes, edges, workflow_id, and name
        
        Returns:
            Dict with execution results and status
        """
        # Log workflow start
        workflow.logger.info(f"Starting workflow {payload.get('name', 'Unnamed')} (ID: {payload.get('workflow_id', 'unknown')})")
        
        # Initialize workflow state
        workflow_state = {
            "status": "running",
            "steps_completed": 0,
            "current_node": None,
            "results": {}
        }
        
        # Extract workflow components
        nodes = payload.get("nodes", [])
        edges = payload.get("edges", [])
        
        if not nodes:
            workflow.logger.error("No nodes found in workflow definition")
            return {"status": "failed", "error": "No nodes found in workflow definition"}
        
        try:
            # Find entry point nodes (typically trigger nodes with no incoming edges)
            entry_nodes = self._find_entry_nodes(nodes, edges)
            
            if not entry_nodes:
                workflow.logger.error("No entry nodes found in workflow")
                return {"status": "failed", "error": "No entry nodes found in workflow"}
            
            # Process each entry node as a starting point
            for node in entry_nodes:
                workflow_state["current_node"] = node["id"]
                # This would be replaced with actual activity calls
                await workflow.execute_activity(
                    "process_node",
                    node,
                    start_to_close_timeout=timedelta(minutes=5),
                )
                workflow_state["steps_completed"] += 1
            
            workflow_state["status"] = "completed"
            return workflow_state
            
        except Exception as e:
            workflow.logger.error(f"Workflow execution failed: {str(e)}")
            workflow_state["status"] = "failed"
            workflow_state["error"] = str(e)
            return workflow_state
    
    def _find_entry_nodes(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
        """Find nodes that have no incoming edges (entry points)"""
        # Collect all target node IDs from edges
        target_ids = set(edge.get("target") for edge in edges)
        
        # Find nodes that don't appear as targets in any edge
        entry_nodes = [node for node in nodes if node.get("id") not in target_ids]
        
        return entry_nodes 