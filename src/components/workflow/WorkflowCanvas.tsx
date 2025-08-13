'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  ReactFlowInstance,
  Background,
  Controls,
  Panel,
  MiniMap,
  ConnectionLineType,
  useReactFlow,
  MarkerType,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  Connection,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { WorkflowHeader } from './WorkflowHeader';
import { NodePanel } from './NodePanel';
import { nodeTypes } from './nodeTypes';
import { useWorkflowStore } from '@/lib/store/workflow';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Save, ChevronLeft, Trash2, Maximize, Search, PanelLeftClose, Link as LinkIcon, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { NodeData } from '@/lib/store/workflow';
import { WorkflowFormData } from './WorkflowDialog';
import { createWorkflow, getWorkflow, updateWorkflow, getWorkflows } from '@/lib/workflows';
import { nodeCatalog } from './nodeTypes';
import { getApiKeyWithValue } from "@/lib/api-keys";
import { supabase } from '@/lib/supabase';
import { formatDistanceStrict } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { ExecutionDetailsView } from './ExecutionDetailsView';
import { callSupabaseAgent, generateSupabaseAgentSessionId, runSupabaseAgent } from '@/lib/supabase-agent';
import { getCurrentUser } from '@/lib/auth';
import { AIBuilderModal } from './AIBuilderModal';

// Function to generate a valid agent name from UUID
function generateValidAgentName(): string {
  const rawUuid = uuidv4(); // e.g., 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

  // 1. Remove hyphens
  let transformedUuid = rawUuid.replace(/-/g, ''); // e.g., 'f47ac10b58cc4372a5670e02b2c3d479'

  // 2. Check if it starts with a digit and prepend if necessary
  // The first character of a standard UUID v4 after removing hyphens should be hex (0-9, a-f)
  // If it's a digit, we need to prepend to make it a valid identifier.
  const firstChar = transformedUuid.charAt(0);
  if (!isNaN(parseInt(firstChar, 10)) || firstChar.match(/[^a-zA-Z_]/)) {
    transformedUuid = '_' + transformedUuid; // Prepend with an underscore
  }

  return transformedUuid;
}

interface WorkflowCanvasProps {
  isActive: boolean;
  onClose?: () => void;
  workflowId?: string;
  newWorkflowData?: WorkflowFormData | null;
}

// Add a custom edge style
const edgeOptions = {
  type: 'smoothstep',
  style: { 
    stroke: 'url(#edge-gradient)', 
    strokeWidth: 2,
    opacity: 0.9
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#3b82f6',
    width: 20,
    height: 20
  },
  animated: true
};

export function WorkflowCanvas({ isActive, onClose, workflowId, newWorkflowData }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [workflowName, setWorkflowName] = useState(newWorkflowData?.name || 'My workflow');
  const [isWorkflowActive, setIsWorkflowActive] = useState(newWorkflowData?.isActive || false);
  const [tags, setTags] = useState<string[]>(newWorkflowData?.tags || []);
  const [agentType, setAgentType] = useState<string>(newWorkflowData?.agentType || 'single_agent');
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('canvas');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [isAIBuilderModalOpen, setIsAIBuilderModalOpen] = useState(false);
  
  // Add debounce for auto-saving
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add a flag to prevent auto-saving during initial load
  const initialLoadRef = useRef(true);

  // Access store state and actions
  const {
    nodes,
    edges,
    onNodesChange: originalOnNodesChange,
    onEdgesChange: originalOnEdgesChange,
    onConnect: originalOnConnect,
    addNode: originalAddNode,
    resetWorkflow,
    isReady,
    setIsReady,
    updateNodeData,
    setWorkflowId,
  } = useWorkflowStore();
  
  // Add a ref to track if we need to focus the view
  const shouldFitViewRef = useRef(false);
  
  // Add a new loading state for Supabase agent workflow
  const [isSupabaseAgentLoading, setIsSupabaseAgentLoading] = useState(false);
  
  // Add a saveWorkflow function that both the handleSaveWorkflow and triggerAutoSave can use
  const saveWorkflow = async (isAutoSave = false) => {
    try {
      // Don't save if we're still in initial loading
      if (initialLoadRef.current) {
        console.log('Skipping save during initial load');
        return;
      }
      
      // Use existing workflowId from props, or the one we created locally
      const existingId = workflowId || createdWorkflowId;
      
      // Prevent duplicate creation if already in progress
      if (!existingId && isCreatingWorkflow) {
        console.log('Workflow creation already in progress, skipping save.');
        return;
      }
      
      // Get the current state directly from the store to ensure we have the latest nodes and edges
      const currentNodes = useWorkflowStore.getState().nodes;
      const currentEdges = useWorkflowStore.getState().edges;
      
      console.log('Saving workflow:', isAutoSave ? 'auto' : 'manual', 
        'Nodes:', currentNodes.length, 
        'Edges:', currentEdges.length);
      
      // Special handling for Anthropic nodes
      const nodesWithAnthropic = currentNodes.filter(node => 
        node.data?.llmConfig?.provider === 'anthropic'
      );
      
      if (nodesWithAnthropic.length > 0) {
        console.log('Found Anthropic nodes:', nodesWithAnthropic.length);
        nodesWithAnthropic.forEach(node => {
          console.log('Anthropic node config:', node.id, node.data.llmConfig);
        });
      }
      
      // Prepare workflow data
      const flowData = {
        name: workflowName,
        is_active: isWorkflowActive,
        tags: tags,
        nodes: currentNodes,
        edges: currentEdges
      };

      if (existingId) {
        // Update existing workflow
        await updateWorkflow(existingId, flowData);
        if (!isAutoSave) {
          toast.success('Workflow updated');
        } else {
          console.log('Workflow auto-saved');
        }
      } else {
        // Create new workflow
        
        // Set flag to indicate creation is starting
        setIsCreatingWorkflow(true);
        
        const newWorkflow = await createWorkflow({
          ...flowData,
          description: newWorkflowData?.description || undefined, // Add description if available
          agent_type: newWorkflowData?.agentType || 'single_agent', // Add required agent_type
        });
        
        if (newWorkflow && newWorkflow.id) {
          // Store the created workflow's ID locally
          setCreatedWorkflowId(newWorkflow.id);
          // *** IMPORTANT: Update the Zustand store with the new ID ***
          useWorkflowStore.setState({ workflowId: newWorkflow.id });
          
          if (!isAutoSave) {
            toast.success('Workflow created and saved');
          } else {
            console.log('Workflow auto-created and saved');
          }
        } else {
          throw new Error("Failed to get ID from created workflow");
        }
      }
    } catch (error: any) {
      console.error('Error saving workflow:', error);
      // Error toast is shown in create/update functions
    } finally {
      // Reset creation flag after attempt
      setIsCreatingWorkflow(false);
    }
  };
  
  // Simple wrapper for manual saves
  const handleSaveWorkflow = () => saveWorkflow(false);
  
  // Debounced auto-save function
  const triggerAutoSave = useCallback(() => {
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set a new timeout for auto-saving
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveWorkflow(true);
    }, 1000); // Wait 1 second before saving to avoid too many saves
  }, [
    // We're intentionally not including saveWorkflow in deps
    // to avoid circular reference, since it refers to state variables
    // that are already included here
    workflowName, 
    isWorkflowActive, 
    tags, 
    nodes, 
    edges, 
    workflowId, 
    createdWorkflowId, 
    newWorkflowData
  ]);
  
  // Wrap the store's handlers to add auto-save functionality
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    originalOnNodesChange(changes);
    
    // Auto-save on position changes and node deletions
    const hasPositionChange = changes.some(change => change.type === 'position');
    const hasNodeRemoval = changes.some(change => change.type === 'remove');
    
    if ((hasPositionChange || hasNodeRemoval) && !initialLoadRef.current) {
      console.log('Auto-saving after node change:', hasPositionChange ? 'moved' : 'removed');
      triggerAutoSave();
    }
  }, [originalOnNodesChange, triggerAutoSave]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    originalOnEdgesChange(changes);
    
    // Auto-save if edges are added or removed
    const hasEdgeChange = changes.some(change => 
      change.type === 'add' || change.type === 'remove' || change.type === 'reset'
    );
    
    if (hasEdgeChange && !initialLoadRef.current) {
      console.log('Auto-saving after edge change:', changes);
      triggerAutoSave();
    }
  }, [originalOnEdgesChange, triggerAutoSave]);

  const onConnect = useCallback((connection: Connection) => {
    const { nodes: currentNodes } = useWorkflowStore.getState();
    const sourceNode = currentNodes.find(node => node.id === connection.source);

    let modifiedConnection: Connection & { type?: string; animated?: boolean } = { ...connection };

    if (sourceNode?.data.label === 'Multi Agent (BaseAgent)' || 
      sourceNode?.data.label === 'LLM Agent' ||
      sourceNode?.data.label === 'Sequential agent' ||
      sourceNode?.data.label === 'Loop agent' || 
      sourceNode?.data.label === 'Parallel agent'
    ) {
      modifiedConnection.type = 'bezier';
      modifiedConnection.animated = true;
    }

    originalOnConnect(modifiedConnection);
    
    // Always auto-save when new connections are made
    if (!initialLoadRef.current) {
      console.log('Auto-saving after new connection:', modifiedConnection);
      triggerAutoSave();
    }
  }, [originalOnConnect, triggerAutoSave]);

  const addNode = useCallback((node: Node<NodeData>) => {
    originalAddNode(node);
    
    // Auto-save when new nodes are added
    if (!initialLoadRef.current) {
      triggerAutoSave();
    }
  }, [originalAddNode, triggerAutoSave]);

  // Clear initial load flag after component mounts and data is loaded
  useEffect(() => {
    if (isReady) {
      // Set a small delay to ensure all loading is complete
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 1000);
    }
  }, [isReady]);

  // Add a new useEffect to check workflow status on mount or when ID changes
  useEffect(() => {
    const checkWorkflowStatus = async () => {
      const workflowIdentifier = workflowId || createdWorkflowId;
      if (!workflowIdentifier) return;

      try {
        // Fetch the current workflow status from the API
        const response = await fetch(`/api/workflows/${workflowIdentifier}/status`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched workflow status:', data);
          
          // Update the local state with the fetched status
          if (data.status === 'running' || data.status === 'paused' || data.status === 'idle') {
            setWorkflowStatus(data.status);
          }
        } 
        // else {
        //   console.error('Error fetching workflow status:', response.statusText);
        // }
      } catch (error) {
        console.error('Exception checking workflow status:', error);
      }
    };

    const checkSupabaseWorkflowStatus = async () => {
      const currentWorkflowId = workflowId || createdWorkflowId;
      if (!currentWorkflowId) {
        setWorkflowStatus('idle');
        return;
      }

      try {
        // Check if at least one Supabase AI Agent exists
        const nodes = useWorkflowStore.getState().nodes;
        const supabaseAgentNode = nodes.find(node => node.data.label == "Supabase AI Agent");
        
        // If the Supabase Agent node has no sessionId, set to idle
        if (!supabaseAgentNode?.data.supabaseConfig?.sessionId) {
          console.log('Supabase agent has no active session, setting status to idle');
          setWorkflowStatus('idle');
          return;
        }
        
        console.log(`Checking Supabase execution status for workflow: ${currentWorkflowId}`);
        const { data: runningExecutions, error } = await supabase
          .from('executions')
          .select('id, status')
          .eq('workflow_id', currentWorkflowId)
          .eq('status', 'running')
          .limit(1);

        if (error) {
          console.error('Error fetching Supabase execution status:', error);
          setWorkflowStatus('idle');
          return;
        }

        if (runningExecutions && runningExecutions.length > 0) {
          console.log(`Found running execution for workflow ${currentWorkflowId}. Status: ${runningExecutions[0].status}`);
          setWorkflowStatus('running');
        } else {
          console.log(`No running execution found for workflow ${currentWorkflowId}.`);
          setWorkflowStatus('idle');
        }
      } catch (error) {
        console.error('Exception in checkSupabaseWorkflowStatus:', error);
        setWorkflowStatus('idle');
      }
    };

    const checkMultiAgentWorkflowStatus = async () => {
      const currentWorkflowId = workflowId || createdWorkflowId;
      if (!currentWorkflowId) {
        setWorkflowStatus('idle');
        setActiveAgentName(null);
        console.log('Multi Agent status check: No workflow ID, setting to idle.');
        return;
      }

      try {
        // Check if at least one Supabase AI Agent exists
        console.log(`Checking Supabase execution status for workflow: ${currentWorkflowId}`);
        const { data: runningExecutions, error } = await supabase
          .from('executions')
          .select('id, status')
          .eq('workflow_id', currentWorkflowId)
          .eq('status', 'running')
          .limit(1);
        
          if (error) {
            console.error('Error fetching Supabase execution status:', error);
            setWorkflowStatus('idle');
            setActiveAgentName(null);
            return;
          }
        
          if (runningExecutions && runningExecutions.length > 0) {
            const runningExecution = runningExecutions[0];
            console.log(`Found running execution for workflow ${currentWorkflowId}. Status: ${runningExecution.status}`);
            setWorkflowStatus('running');

            // Now, query agentfactory table for the agent_name
            const { data: agentFactoryData, error: agentFactoryError } = await supabase
              .from('agentfactory')
              .select('agent_name')
              .eq('execution_id', runningExecution.id)
              .eq('status', 'active')
              .single();

            if (agentFactoryError) {
              console.error('Error fetching agent name from agentfactory:', agentFactoryError);
              setActiveAgentName(null);
            } else if (agentFactoryData) {
              console.log(`Found active agent name: ${agentFactoryData.agent_name}`);
              setActiveAgentName(agentFactoryData.agent_name);
            } else {
              console.warn(`No active agent found in agentfactory for execution ID: ${runningExecution.id}`);
              setActiveAgentName(null);
            }
          } else {
            console.log(`No running execution found for workflow ${currentWorkflowId}.`);
            setWorkflowStatus('idle');
            setActiveAgentName(null);
          }
      } catch (error) {
        console.error('Exception checking Multi Agent workflow status:', error);
        setWorkflowStatus('idle');
        setActiveAgentName(null);
      }
    };

    // Check status only if component is ready
    if (isReady) {
      const agentNode = nodes.find(node => 
        node.data.label === "AI Agent" || 
        node.data.label === "Supabase AI Agent" ||
        node.data.label === "Multi Agent (BaseAgent)"
      );
      
      if (agentNode?.data.label === "AI Agent") {
        checkWorkflowStatus();
      } else if (agentNode?.data.label === "Supabase AI Agent") {
        checkSupabaseWorkflowStatus();
      } else if (agentNode?.data.label === "Multi Agent (BaseAgent)") {
        checkMultiAgentWorkflowStatus(); // Call the new function
      } else {
        // If no specific agent node type relevant to status checking is found, set to idle
        setWorkflowStatus('idle'); 
      }
    }
  }, [workflowId, createdWorkflowId, isReady, nodes]); // Ensure all dependencies are correct

  // Existing useEffect for clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Update existing AI Agent nodes with the latest childNodes configuration
  useEffect(() => {
    if (isReady && !initialLoadRef.current) {
      const { nodes, updateNodeData } = useWorkflowStore.getState();
      const aiAgentNodes = nodes.filter(node => node.data.label === 'AI Agent');
      
      if (aiAgentNodes.length > 0) {
        // Get the latest childNodes configuration from nodeCatalog
        const aiAgentConfig = nodeCatalog.find(node => node.label === 'AI Agent');
        
        if (aiAgentConfig && aiAgentConfig.childNodes) {
          console.log('Updating AI Agent nodes with latest childNodes config');
          
          // Update each AI Agent node
          aiAgentNodes.forEach(node => {
            updateNodeData(node.id, {
              childNodes: aiAgentConfig.childNodes
            });
          });
          
          // Trigger a save after updating
          triggerAutoSave();
        }
      }
    }
  }, [isReady]);

  // Initialize workflow from new data
  useEffect(() => {
    if (newWorkflowData && !workflowId) {
      setWorkflowName(newWorkflowData.name);
      setIsWorkflowActive(newWorkflowData.isActive);
      setTags(newWorkflowData.tags || []);
      setAgentType(newWorkflowData.agentType || 'single_agent');
    }
  }, [newWorkflowData, workflowId]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeData = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeData) return;
      
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNodeData = JSON.parse(nodeData);
      const newNode = {
        id: `${newNodeData.type}-${Date.now()}`,
        type: newNodeData.type,
        position,
        data: {
          label: newNodeData.label,
          description: newNodeData.description,
          type: newNodeData.type,
          icon: newNodeData.icon,
          hasError: newNodeData.hasError,
          childNodes: newNodeData.childNodes,
          buttonStyle: newNodeData.buttonStyle
        },
      };

      addNode(newNode);
    },
    [reactFlowInstance, addNode]
  );

  // Load existing workflow if editing
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) return;
      
      try {
        const data = await getWorkflow(workflowId);
        if (data) {
          setWorkflowName(data.name);
          setIsWorkflowActive(data.is_active);
          setTags(data.tags || []);
          setAgentType(data.agent_type || 'single_agent');
          
          // Store the workflow ID in the global state for components to access
          setWorkflowId(workflowId);
          
          // Initialize the flow with the saved nodes and edges
          if (data.nodes && data.edges) {
            setIsReady(false); // Temporarily disable while loading
            useWorkflowStore.setState({
              nodes: data.nodes,
              edges: data.edges,
              workflowId: workflowId  // Also set the workflowId in setState to ensure it's preserved
            });
            setIsReady(true);
            // Immediately flag that we need to center view
            shouldFitViewRef.current = true;
          }
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        // Error toast is already shown in the getWorkflow function
      }
    };

    loadWorkflow();
  }, [workflowId, setIsReady, setWorkflowId]);

  // Single, fast-acting effect to center the view
  useEffect(() => {
    if (reactFlowInstance && isReady) {
      // Immediate centering attempt
      reactFlowInstance.fitView({
        padding: 0.5,
        includeHiddenNodes: true,
        duration: 200 // Faster animation
      });
      
      // Quick follow-up to ensure it worked
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.5,
          includeHiddenNodes: true,
          duration: 100
        });
      }, 50); // Very short delay
    }
  }, [reactFlowInstance, isReady]);

  useEffect(() => {
    setIsReady(true);
    
    return () => {
      setIsReady(false);
      resetWorkflow();
    };
  }, [setIsReady, resetWorkflow]);

  // Auto-open AI Builder for new workflows (when canvas is ready and it's a new workflow)
  useEffect(() => {
    // Check if this is a new workflow (has newWorkflowData but no workflowId and no existing nodes)
    if (nodes.length === 0 && agentType === 'multi_agent') {
      // Add a delay to ensure the canvas is fully loaded and stable
      const timer = setTimeout(() => {
        console.log('Auto-opening AI Builder for new workflow');
        setIsAIBuilderModalOpen(true);
      }, 500); // 1 second delay to ensure everything is ready

      return () => clearTimeout(timer);
    }
  }, [nodes.length, agentType]);

  // Setup keyboard handlers for delete operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle node deletion with Delete or Backspace keys
      if ((event.key === 'Delete' || event.key === 'Backspace') && 
          reactFlowInstance && 
          !initialLoadRef.current) {
        
        const selectedNodes = useWorkflowStore.getState().nodes.filter(node => node.selected);
        const selectedEdges = useWorkflowStore.getState().edges.filter(edge => edge.selected);
        
        // Only process if there are selected items
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          console.log('Keyboard delete detected for:', 
            selectedNodes.length, 'nodes and', 
            selectedEdges.length, 'edges');
          
          // The actual deletion is handled by react-flow, but we need to trigger a save
          // after the state has been updated (in the next tick)
          setTimeout(() => {
            triggerAutoSave();
          }, 50);
        }
      }
    };

    // Add event listener for keyboard events
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [reactFlowInstance, triggerAutoSave]);

  // Add useEffect to trigger save when webhook API enabled state changes
  useEffect(() => {
    // Find webhook nodes
    const webhookNodes = nodes.filter(node => node.data?.label === 'Respond to Webhook');
    
    // If any webhook node's apiEnabled state has changed (requires tracking previous state or a more sophisticated check)
    // For simplicity, we trigger save whenever nodes potentially change, relying on debouncing.
    // A more robust solution might involve comparing previous/current node data for the specific field.
    if (!initialLoadRef.current && webhookNodes.length > 0) {
      // Check if any webhook node's apiEnabled has actually changed - requires comparison logic
      // Simple trigger for now:
      console.log("Detected potential webhook config change, triggering auto-save.");
      triggerAutoSave();
    }
    // Note: Add nodes as a dependency, but be mindful of performance. Deep comparison might be needed.
  }, [nodes, triggerAutoSave]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Add event listener for manual auto-save triggers
  useEffect(() => {
    const handleTriggerAutoSave = () => {
      console.log('🎯 Received triggerAutoSave event');
      triggerAutoSave();
    };

    window.addEventListener('triggerAutoSave', handleTriggerAutoSave);
    
    return () => {
      window.removeEventListener('triggerAutoSave', handleTriggerAutoSave);
    };
  }, [triggerAutoSave]);

  // --- New useEffect to fitView on tab change --- 
  useEffect(() => {
    if (activeTab === 'canvas' && reactFlowInstance) {
      // Use a short delay to ensure the canvas is visible and ready
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.5,
          duration: 200 // Use a moderate duration for smooth transition
        });
      }, 50); // 50ms delay

      return () => clearTimeout(timer); // Cleanup the timer
    }
  }, [activeTab, reactFlowInstance]);

  // Update workflow status in the UI
  useEffect(() => {
    // Make workflow status available globally for child components
    (window as any).__workflowStatus = workflowStatus;
  }, [workflowStatus]);

  // Workflow control handlers
  const handleStartWorkflow = async () => {
    // --- Add Check for Active Status --- 
    if (!isWorkflowActive) {
      toast.error('Workflow is not active', {
        description: 'Please activate the workflow (using the toggle in the header) before starting.',
        duration: 5000
      });
      return; // Stop execution if not active
    }
    
    // -----------------------------------
    // Get nodes from the store
    const nodes = useWorkflowStore.getState().nodes; 
    // Check if at least one AI Agent node exists
    
    const agentNode = nodes.find(node => 
      node.data.label  == "AI Agent" || node.data.label == "Supabase AI Agent" || node.data.label == "Multi Agent (BaseAgent)"
    );

    if (agentNode?.data.label == "AI Agent") {
    try {
      // Collect all nodes that need API keys
      // const nodes = useWorkflowStore.getState().nodes;
      const llmNodes = nodes.filter(node => node.data?.llmConfig?.provider);
      
      // Store decrypted API keys
      const apiKeys: Record<string, string> = {};
      
      // Fetch and decrypt API keys for all LLM nodes
      if (llmNodes.length > 0) {
        console.log(`Collecting API keys for ${llmNodes.length} LLM nodes`);
        
        for (const node of llmNodes) {
          const apiKeyId = node.data?.llmConfig?.apiKeyId;
          
          if (apiKeyId && !apiKeys[apiKeyId]) {
            try {
              // Only fetch each key once
              const keyData = await getApiKeyWithValue(apiKeyId);
              
              if (keyData && keyData.decrypted_key) {
                apiKeys[apiKeyId] = keyData.decrypted_key;
                console.log(`Retrieved API key for ${keyData.service}`);
              }
            } catch (error) {
              console.error(`Error fetching API key ${apiKeyId}:`, error);
            }
          }
        }
        
        console.log(`Successfully collected ${Object.keys(apiKeys).length} API keys`);
      }
      
      // Prepare workflow data to send to the backend
      const workflowData = {
        nodes: useWorkflowStore.getState().nodes,
        edges: useWorkflowStore.getState().edges,
        name: workflowName,
        workflow_id: workflowId || createdWorkflowId,
        is_active: isWorkflowActive,
        tags: tags,
        api_keys: Object.keys(apiKeys).length > 0 ? apiKeys : undefined
      };
      
      // Make API call to start the workflow
      const response = await fetch('/api/workflows/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start workflow');
      }
      
      // Generate execution ID locally
      const executionId = uuidv4();
      console.log(`Generated local execution ID: ${executionId}`);
      
      // Insert execution record into Supabase - match the table structure exactly
      try {
        // Format current timestamp properly
        const timestamp = new Date().toISOString();
        
        // Insert execution data following the exact table structure
        const { data: executionData, error: executionError } = await supabase
          .from('executions')
          .insert({
            id: executionId, // Use the locally generated ID
            workflow_id: workflowId || createdWorkflowId,
            workflow_name: workflowName,
            status: 'running',
            started_at: timestamp,
            triggered_by: 'user'
            // created_at and updated_at will be filled automatically by PostgreSQL
          });
        
        if (executionError) {
          console.error('Error saving execution to Supabase:', executionError);
        } else {
          console.log('Successfully saved workflow execution to Supabase');
        }
      } catch (dbError) {
        console.error('Exception saving execution to Supabase:', dbError);
        // Continue execution even if DB insert fails
      }
      
      // Update workflow status
      setWorkflowStatus('running');
      
      toast.success('Workflow started', {
        description: 'Your workflow is now running',
        duration: 3000
      });
    } catch (error) {
      console.error('Error starting workflow:', error);
      toast.error('Failed to start workflow', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
    }
  } else if (agentNode?.data.label == "Supabase AI Agent") {
    try {
      // First show early notification to user
      const loadingToast = toast.loading('Starting Supabase Agent...', {
        description: 'This might take a few moments',
        duration: 20000, // Long duration since we'll dismiss it manually
      });
      
      // Set the workflow status to running immediately 
      setWorkflowStatus('running');
      setIsSupabaseAgentLoading(true); // Set loading state
      
      // Get the current user
      const { user, error: userError } = await getCurrentUser();
      
      if (userError || !user || !user.id) {
        toast.dismiss(loadingToast);
        console.error('Error getting user ID:', userError);
        toast.error('Could not get user ID', {
          description: 'Please ensure you are logged in to start the workflow.',
          duration: 5000
        });
        setWorkflowStatus('idle'); // Reset status if failed
        setIsSupabaseAgentLoading(false); // Reset loading state
        return; // Stop if user ID is not available
      }

      const userId = user.id; // Use the actual user ID
      
      // Generate a session ID
      const sessionId = generateSupabaseAgentSessionId();
      
      // Save sessionId and userId to the Supabase agent node config
      useWorkflowStore.getState().updateNodeData(agentNode.id, {
        supabaseConfig: {
          ...agentNode.data.supabaseConfig,
          sessionId: sessionId,
          userId: userId
        }
      });
      
      // Get Supabase URL and key from the agent node configuration
      const supabaseUrl = agentNode.data.supabaseConfig?.supabaseUrl;
      const supabaseKey = agentNode.data.supabaseConfig?.supabaseKey;
      
      if (!supabaseUrl || !supabaseKey) {
        toast.dismiss(loadingToast);
        toast.error('Missing Supabase configuration', {
          description: 'Please configure Supabase URL and API key in the agent node',
          duration: 5000
        });
        setWorkflowStatus('idle'); // Reset status if failed
        setIsSupabaseAgentLoading(false); // Reset loading state
        return;
      }
      
      // Generate execution ID locally for database
      const executionId = uuidv4();
      console.log(`Generated local execution ID: ${executionId}`);
      
      // Continue the initialization in the background
      setTimeout(async () => {
        try {
          // Insert execution record into Supabase first
          try {
            const timestamp = new Date().toISOString();
            
            const { error: executionError } = await supabase
              .from('executions')
              .insert({
                id: executionId,
                workflow_id: workflowId || createdWorkflowId,
                workflow_name: workflowName,
                status: 'running',
                started_at: timestamp,
                triggered_by: 'user'
              });
            
            if (executionError) {
              console.error('Error saving execution to Supabase:', executionError);
            } else {
              console.log('Successfully saved workflow execution to Supabase');
            }
          } catch (dbError) {
            console.error('Exception saving execution to Supabase:', dbError);
            // Continue even if DB insert fails
          }
          
          // Make initial call to start the Supabase Agent
          const agentResponse = await callSupabaseAgent(
            userId,
            "Start the workflow", // Initial message to start the workflow
            sessionId
          );
          
          console.log('Supabase Agent API Response:', agentResponse);
          
          // Initialize agent with credentials
          const runResponse = await runSupabaseAgent(
            userId,
            sessionId,
            supabaseUrl,
            supabaseKey
          );
          
          console.log('Supabase Agent Run Response:', runResponse);
          
          // Dismiss loading toast and show success
          toast.dismiss(loadingToast);
          toast.success('Workflow started successfully', {
            description: 'Your Supabase agent workflow is now running',
            duration: 3000
          });
          setIsSupabaseAgentLoading(false); // Reset loading state after success
        } catch (error) {
          // Handle errors that occur during background initialization
          toast.dismiss(loadingToast);
          console.error('Error in Supabase Agent initialization:', error);
          toast.error('Error initializing Supabase Agent', {
            description: error instanceof Error ? error.message : 'Unknown error',
            duration: 5000
          });
          setIsSupabaseAgentLoading(false); // Reset loading state
          // Don't reset status here since the workflow is technically started
        }
      }, 100); // Small delay to ensure UI updates first
      
    } catch (error) {
      console.error('Error starting Supabase Agent workflow:', error);
      toast.error('Failed to start Supabase Agent', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
      setWorkflowStatus('idle'); // Reset status if failed
      setIsSupabaseAgentLoading(false); // Reset loading state
    }
  } else if (agentNode?.data.label == "Multi Agent (BaseAgent)") {

        // Validation for Multi Agent workflow
        const validationErrors: string[] = [];
    
        // Get all nodes and edges from the workflow
        const allNodes = useWorkflowStore.getState().nodes;
        const allEdges = useWorkflowStore.getState().edges;
    
        // Find the Multi Agent node
        const multiAgentNode = allNodes.find(node => node.data.label === 'Multi Agent (BaseAgent)');
        
        // Check Multi Agent API key and model
        if (!multiAgentNode?.data.multiAgentConfig?.apiKeyId) {
          validationErrors.push('Multi Agent API key is not configured');
        } else {
          // Check if the API key ID exists in the database
          try {
            const { data: apiKeyExists, error } = await supabase
              .from('api_keys')
              .select('id')
              .eq('id', multiAgentNode.data.multiAgentConfig.apiKeyId)
              .single();
            
            if (error || !apiKeyExists) {
              validationErrors.push('Multi Agent API key does not exist in database');
            }
          } catch (dbError) {
            console.error('Error checking Multi Agent API key:', dbError);
            validationErrors.push('Unable to verify Multi Agent API key');
          }
        }
        if (!multiAgentNode?.data.multiAgentConfig?.model) {
          validationErrors.push('Multi Agent model is not selected');
        }
        if (!multiAgentNode?.data.multiAgentConfig?.provider) {
          validationErrors.push('Multi Agent provider is not selected');
        }
    
        // Check connected LLM agents
        const connectedLLMAgents = allEdges
          .filter((edge: any) => edge.source === multiAgentNode?.id)
          .map((edge: any) => allNodes.find((node: any) => node.id === edge.target))
          .filter((node: any) => node && node.data.label === 'LLM Agent');
    
        // if (connectedLLMAgents.length === 0) {
        //   validationErrors.push('No LLM agents connected to Multi Agent');
        // }

        // Get Multi Agent provider for comparison
        const multiAgentProvider = multiAgentNode?.data.multiAgentConfig?.provider;

            // Validate each connected LLM agent
    for (let index = 0; index < connectedLLMAgents.length; index++) {
      const llmAgent = connectedLLMAgents[index];
      if (!llmAgent?.data.llmAgentConfig) {
        validationErrors.push(`LLM Agent ${index + 1} is not configured`);
        continue;
      }

      const config = llmAgent.data.llmAgentConfig;
      // Use agent name if available, otherwise use index-based naming
      const agentIdentifier = config.name ? `"${config.name}"` : `${index + 1}`;
      
      // if (!config.name) {
      //   validationErrors.push(`LLM Agent ${index + 1} name is not set`);
      // }
      if (!config.model) {
        validationErrors.push(`LLM Agent ${agentIdentifier} model is not selected`);
      }
      if (!config.provider) {
        validationErrors.push(`LLM Agent ${agentIdentifier} provider is not selected`);
      }
      
      // Check if LLM agent provider matches Multi Agent provider
      if (config.provider && multiAgentProvider && config.provider !== multiAgentProvider) {
        validationErrors.push(`LLM Agent ${agentIdentifier} provider (${config.provider}) must match Multi Agent provider (${multiAgentProvider})`);
      }
      
      // if (!config.apiKeyId) {
      //   validationErrors.push(`LLM Agent ${agentIdentifier} API key is not configured`);
      // }

      // Check tools connected to this LLM agent
      const connectedToolEdges = allEdges.filter((edge: any) => edge.source === llmAgent.id);
      const connectedTools = connectedToolEdges
        .map((edge: any) => allNodes.find((node: any) => node.id === edge.target))
        .filter((node: any): node is NonNullable<typeof node> => 
          node !== undefined && [
            'Serper API', 'get_price', 'YahooFinanceNewsTool', 
            'BraveSearchTool', 'ScrapeWebsiteTool', 'EXASearchTool', 
            'hyperbrowser_tool', 'MCP Tool'
          ].includes(node.data.label)
        );

      // Validate tool API keys for tools that require them and MCP Tool configuration
      for (const tool of connectedTools) {
        const toolName = tool.data.label;
        
        if (toolName === 'MCP Tool') {
          // Validate MCP Tool configuration
          const mcpConfig = tool.data.toolConfig?.mcpConfig;
          if (!mcpConfig) {
            validationErrors.push(`MCP Tool connected to LLM Agent ${agentIdentifier} is not configured`);
          } else {
            if (!mcpConfig.name?.trim()) {
              validationErrors.push(`MCP Tool connected to LLM Agent ${agentIdentifier} requires a name`);
            }
            if (!mcpConfig.url?.trim()) {
              validationErrors.push(`MCP Tool connected to LLM Agent ${agentIdentifier} requires a URL`);
            }
            if (mcpConfig.authentication === 'Bearer Token' && !mcpConfig.bearerToken?.trim()) {
              validationErrors.push(`MCP Tool connected to LLM Agent ${agentIdentifier} requires a bearer token`);
            }
          }
        } else {
          // Validate regular tools with API keys
          const requiresApiKey = ['BraveSearchTool', 'EXASearchTool', 'hyperbrowser_tool', 'Serper API'].includes(toolName);
          
          if (requiresApiKey && !tool.data.toolConfig?.apiKeyId) {
            validationErrors.push(`${toolName} connected to LLM Agent ${agentIdentifier} requires an API key`);
          }
          if (requiresApiKey && tool.data.toolConfig?.apiKeyId) {
            try {
              const { data: apiKeyExists, error } = await supabase
                .from('api_keys')
                .select('id')
                .eq('id', tool.data.toolConfig?.apiKeyId)
                .single();
              
              if (error || !apiKeyExists) {
                validationErrors.push(`${toolName} connected to LLM Agent ${agentIdentifier} API key does not exist in database`);
              }
            } catch (dbError) {
              console.error(`Error checking ${toolName} API key:`, dbError);
              validationErrors.push(`Unable to verify ${toolName} API key`);
            }
          }
        }
      }
    }
    
        // Check Sequential and Parallel agents if any
        const sequentialNodes = allNodes.filter((node: any) => node.data.label === 'Sequential agent');
        const parallelNodes = allNodes.filter((node: any) => node.data.label === 'Parallel agent');
        
        [...sequentialNodes, ...parallelNodes].forEach((agent: any) => {
          const agentType = agent.data.label;
          if (!agent.data.sequentialParallelConfig?.name) {
            validationErrors.push(`${agentType} name is not configured`);
          }
          
          // Check LLM agents connected to Sequential/Parallel agents
          const connectedLLMs = allEdges
            .filter((edge: any) => edge.source === agent.id)
            .map((edge: any) => allNodes.find((n: any) => n.id === edge.target))
            .filter((node: any) => node && node.data.label === 'LLM Agent');
            
          if (connectedLLMs.length === 0) {
            validationErrors.push(`${agentType} has no connected LLM agents`);
          }

          // Validate provider consistency for connected LLM agents
          for (let index = 0; index < connectedLLMs.length; index++) {
            const llmAgent = connectedLLMs[index];
            if (!llmAgent?.data.llmAgentConfig) {
              continue; // Skip if not configured
            }

            const config = llmAgent.data.llmAgentConfig;
            const agentIdentifier = config.name ? `"${config.name}"` : `LLM Agent ${index + 1}`;
            
            // Check if LLM agent provider matches Multi Agent provider
            if (config.provider && multiAgentProvider && config.provider !== multiAgentProvider) {
              validationErrors.push(`${agentIdentifier} connected to ${agentType} provider (${config.provider}) must match Multi Agent provider (${multiAgentProvider})`);
            }
          }
        });
    
        // If there are validation errors, show them and return
        if (validationErrors.length > 0) {
          toast.error('Workflow Configuration Incomplete', {
            description: validationErrors.slice(0, 3).join('. ') + (validationErrors.length > 3 ? ` and ${validationErrors.length - 3} more issues.` : '.'),
            duration: 8000
          });
          
          // Log all errors for debugging
          //console.error('Multi Agent validation errors:', validationErrors);
          return;
        }

    const loadingToast = toast.loading('Starting Multi Agent...', {
      description: 'This might take a few moments',
      duration: 5000, // Long duration since we'll dismiss it manually
    });

    try {
      // Set the workflow status to running immediately 
      setWorkflowStatus('running');

      // Get all nodes and edges from the workflow
      // const allNodes = useWorkflowStore.getState().nodes;
      // const allEdges = useWorkflowStore.getState().edges;

      // Find the Multi Agent node
      const multiAgentNode = allNodes.find(node => node.data.label === 'Multi Agent (BaseAgent)');
      
      if (!multiAgentNode || !multiAgentNode.data.multiAgentConfig) {
        throw new Error('Multi Agent node not properly configured');
      }

      // Find all LLM Agent nodes connected to the Multi Agent
      const connectedLLMAgents = allEdges
        .filter(edge => edge.source === multiAgentNode.id)
        .map(edge => allNodes.find(node => node.id === edge.target))
        .filter(node => node && node.data.label === 'LLM Agent');

      console.log('Found connected LLM Agents:', connectedLLMAgents.length);

      // Helper function to get API key value by ID
      const getApiKeyValue = async (apiKeyId: string): Promise<string> => {
        try {
          const keyData = await getApiKeyWithValue(apiKeyId);
          return keyData?.decrypted_key || '';
        } catch (error) {
          console.error(`Error fetching API key ${apiKeyId}:`, error);
          return '';
        }
      };

      // Helper function to get tool API key for a tool node
      const getToolApiKey = async (toolNodeId: string): Promise<{ toolName: string, apiKey: string, keyName: string }> => {
        const toolNode = allNodes.find(node => node.id === toolNodeId);
        if (!toolNode) return { toolName: '', apiKey: '', keyName: '' };

        const toolName = toolNode.data.label;
        let keyName = '';
        let apiKey = '';

        // Map tool names to API key names
        const toolKeyMap: Record<string, string> = {
          'BraveSearchTool': 'BraveSearchAPIKey',
          'EXASearchTool': 'EXA_API_KEY',
          'hyperbrowser_tool': 'HYPERBROWSER_API_KEY',
          'Serper API': 'SERPER_API_KEY'
        };

        keyName = toolKeyMap[toolName] || '';

        if (toolNode.data.toolConfig?.apiKeyId) {
          apiKey = await getApiKeyValue(toolNode.data.toolConfig.apiKeyId);
        }

        return { toolName, apiKey, keyName };
      };

      // Build connected agents array
      const connectedAgents = await Promise.all(
        connectedLLMAgents.map(async (llmAgent) => {
          if (!llmAgent || !llmAgent.data.llmAgentConfig) return null;

          const config = llmAgent.data.llmAgentConfig;
          
          // Find tools connected to this LLM Agent
          const connectedToolEdges = allEdges.filter(edge => edge.source === llmAgent.id);
          const connectedTools = connectedToolEdges
            .map(edge => allNodes.find(node => node.id === edge.target))
            .filter((node): node is NonNullable<typeof node> => 
              node !== undefined && [
                'Serper API', 'get_price', 'YahooFinanceNewsTool', 
                'BraveSearchTool', 'ScrapeWebsiteTool', 'EXASearchTool', 
                'hyperbrowser_tool', 'MCP Tool'
              ].includes(node.data.label)
            );

          // Map tool labels to expected names
          const toolNameMap: Record<string, string> = {
            'Serper API': 'serper_tool',
            'get_price': 'get_price',
            'YahooFinanceNewsTool': 'YahooFinanceNewsTool',
            'BraveSearchTool': 'BraveSearchTool',
            'ScrapeWebsiteTool': 'ScrapeWebsiteTool',
            'EXASearchTool': 'EXASearchTool',
            'hyperbrowser_tool': 'hyperbrowser_tool',
            'MCP Tool': 'mcp_tool'
          };

          // Get all tool names, map them, and join with a comma
          const toolNames = connectedTools.map(toolNode => {
            const rawToolName = toolNode.data.label || '';
            return toolNameMap[rawToolName] || rawToolName;
          }).filter(name => name); // Filter out any empty names if a tool somehow has no label

          const toolsString = toolNames.join(',');

          // Build the agent object
          const agentData: any = {
            id: llmAgent.id,
            name: config.name || 'unnamed_agent',
            type: 'LLM Agent',
            model: config.model || '',
            provider: config.provider || '',
            instruction: config.instructions || '',
            tools: toolsString // Use the comma-separated string of all tool names
          };

          // Add API keys for tools that require them and MCP configuration
          for (const tool of connectedTools) {
            if (tool.data.label === 'MCP Tool') {
              // Handle MCP Tool configuration
              const mcpConfig = tool.data.toolConfig?.mcpConfig;
              if (mcpConfig) {
                agentData.mcp_config = {
                  name: mcpConfig.name,
                  description: mcpConfig.description,
                  url: mcpConfig.url,
                  transport_protocol: mcpConfig.transportProtocol,
                  authentication: mcpConfig.authentication
                };
                
                // Add bearer token if authentication is Bearer Token
                if (mcpConfig.authentication === 'Bearer Token' && mcpConfig.bearerToken) {
                  agentData.mcp_config.bearer_token = mcpConfig.bearerToken;
                }
              }
            } else {
              // Handle regular tools with API keys
              const { keyName, apiKey } = await getToolApiKey(tool.id);
              if (keyName && apiKey) {
                agentData[keyName] = apiKey;
              }
            }
          }

          return agentData;
        })
      );

      // Filter out null entries
      const validConnectedAgents = connectedAgents.filter(agent => agent !== null);

      // Handle Sequential and Parallel agents data structure
      const sequentialNodes = nodes.filter(node => node.data.label === 'Sequential agent');
      const parallelNodes = nodes.filter(node => node.data.label === 'Parallel agent');
      
              const createAgentDataStructure = async (agentNode: any) => {
          // Find LLM agents that are connected FROM this Sequential/Parallel agent (bottom/outgoing connections)
          const outgoingEdges = edges.filter(edge => edge.source === agentNode.id);
          const connectedLLMNodes = outgoingEdges
            .map(edge => nodes.find(n => n.id === edge.target))
            .filter(node => node && node.data.label === 'LLM Agent');

          // Get connected LLM agents data for this sequential/parallel agent
          const connectedLLMAgents = await Promise.all(
            connectedLLMNodes.map(async (llmNode: any) => {
              // Get tools data for this LLM agent (from connected tool nodes)
              const connectedToolNodes = edges.filter(edge => edge.source === llmNode.id)
                .map(edge => nodes.find(n => n.id === edge.target))
                .filter(node => node && [
                  'Serper API', 'get_price', 'YahooFinanceNewsTool', 
                  'BraveSearchTool', 'ScrapeWebsiteTool', 'EXASearchTool', 
                  'hyperbrowser_tool', 'MCP Tool'
                ].includes(node.data.label));
              
              const toolsString = connectedToolNodes.map((tool: any) => tool.data.label).join(', ');
              
              // Check if it's an LLM Agent node (has llmAgentConfig) or regular LLM node (has llmConfig)
              const isLLMAgentNode = llmNode.data.llmAgentConfig;
              
              return {
                id: llmNode.id,
                name: isLLMAgentNode 
                  ? llmNode.data.llmAgentConfig?.name || 'Unnamed LLM Agent'
                  : 'Unnamed LLM',
                type: 'LLM Agent',
                model: isLLMAgentNode 
                  ? llmNode.data.llmAgentConfig?.model || ''
                  : llmNode.data.llmConfig?.model || '',
                provider: isLLMAgentNode
                  ? llmNode.data.llmAgentConfig?.provider || ''
                  : llmNode.data.llmConfig?.provider || '',
                instruction: isLLMAgentNode
                  ? llmNode.data.llmAgentConfig?.instructions || ''
                  : '',
                tools: toolsString
              };
            })
          );
          
          return {
            id: agentNode.id,
            type: agentNode.data.label,
            name: agentNode.data.sequentialParallelConfig?.name || 'Unnamed Agent',
            description: agentNode.data.sequentialParallelConfig?.description || '',
            connected_agents: connectedLLMAgents
          };
        };

      // Create data structures for Sequential agents
      const sequentialAgentsData = await Promise.all(
        sequentialNodes.map(node => createAgentDataStructure(node))
      );

      // Create data structures for Parallel agents  
      const parallelAgentsData = await Promise.all(
        parallelNodes.map(node => createAgentDataStructure(node))
      );

      // Log the Sequential and Parallel agents data
      if (sequentialAgentsData.length > 0) {
        console.log('Sequential Agents Data:', JSON.stringify(sequentialAgentsData, null, 2));
      }
      if (parallelAgentsData.length > 0) {
        console.log('Parallel Agents Data:', JSON.stringify(parallelAgentsData, null, 2));
      }

      // Add Sequential and Parallel agents data to validConnectedAgents
      validConnectedAgents.push(...sequentialAgentsData, ...parallelAgentsData);

      // Get Multi Agent's API key
      const multiAgentApiKey = multiAgentNode.data.multiAgentConfig.apiKeyId 
        ? await getApiKeyValue(multiAgentNode.data.multiAgentConfig.apiKeyId)
        : '';

      const agentName = generateValidAgentName();
      // Build the main Multi Agent structure
      const multiAgentData = {
        id: multiAgentNode.id,
        type: 'Multi Agent',
        // name: multiAgentNode.data.multiAgentConfig.name || 'MultiAgent' || "_f47ac10b58cc4372a5670e02b2c3d479",
        name: agentName,
        model: multiAgentNode.data.multiAgentConfig.model || '',
        apiKey: multiAgentApiKey,
        provider: multiAgentNode.data.multiAgentConfig.provider || '',
        description: multiAgentNode.data.multiAgentConfig.description || '',
        instructions: multiAgentNode.data.multiAgentConfig.instructions ? 
          multiAgentNode.data.multiAgentConfig.instructions.split('\n').filter(line => line.trim()) :
          [],
        connected_agents: validConnectedAgents
      };

      console.log('Multi Agent workflow data:', JSON.stringify([multiAgentData], null, 2));

      // Get the current user ID
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user || !user.id) {
        throw new Error('User not authenticated. Please log in.');
      }

      // Send to backend server with user ID in headers
      const response = await fetch('/api/multi-agent/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id, // Send user ID in headers
        },
        body: JSON.stringify([multiAgentData]),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start Multi Agent workflow');
      }else{
        const executionId = uuidv4();
        console.log(`Generated local execution ID: ${executionId}`);
        
        // Insert execution record into Supabase
        try {
          const timestamp = new Date().toISOString();
          
          const { error: executionError } = await supabase
            .from('executions')
            .insert({
              id: executionId,
              workflow_id: workflowId || createdWorkflowId,
              workflow_name: workflowName,
              status: 'running',
              started_at: timestamp,
              triggered_by: 'user'
            });
          
          if (executionError) {
            console.error('Error saving execution to Supabase:', executionError);
          } else {
            console.log('Successfully saved Multi Agent execution to Supabase');

            // NOW INSERT INTO AGENTFACTORY TABLE
            const { error: agentFactoryError } = await supabase
              .from('agentfactory')
              .insert({
                agent_name: agentName, // agentName is available here
                workflow_id: workflowId || createdWorkflowId,
                execution_id: executionId,
                status: 'active'
              });
            
            if (agentFactoryError) {
              console.error('Error saving to agentfactory table:', agentFactoryError);
            } else {
              console.log(`Successfully saved agent ${agentName} to agentfactory.`);
              // Also set the active agent name in the state
              setActiveAgentName(agentName);
            }
          }
        } catch (dbError) {
          console.error('Exception saving execution to Supabase:', dbError);
        }
      }

      const result = await response.json();
      console.log('Multi Agent workflow started:', result);

      // Generate execution ID locally for database tracking


      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Multi Agent workflow started successfully', {
        description: `Started with ${validConnectedAgents.length} connected agents`,
        duration: 3000
      });

    } catch (error) {
      console.error('Error starting Multi Agent workflow:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to start Multi Agent workflow', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
      setWorkflowStatus('idle'); // Reset status if failed
    }
  }
  else {
    toast.error('Start workflow aborted: No AI Agent node found. :' + agentNode?.data.label, {
      description: 'Please add an AI Agent node to your workflow before starting.',
        duration: 5000
      });
    }
  };

  const handlePauseWorkflow = async () => {
    try {
      const workflowIdentifier = workflowId || createdWorkflowId;
      if (!workflowIdentifier) {
        throw new Error('No workflow ID available');
      }
      
      // Make API call to pause the workflow
      const response = await fetch(`/api/workflows/${workflowIdentifier}/pause`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to pause workflow');
      }
      
      // Update workflow status
      setWorkflowStatus('paused');
      
      toast.info('Workflow paused', {
        description: 'Your workflow is now paused',
        duration: 3000
      });
    } catch (error) {
      console.error('Error pausing workflow:', error);
      toast.error('Failed to pause workflow', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
    }
  };

  const handleStopWorkflow = async () => {

    const nodes = useWorkflowStore.getState().nodes; 
    // Check if at least one AI Agent node exists
    
    const agentNode = nodes.find(node => 
      node.data.label  == "AI Agent" || node.data.label == "Supabase AI Agent" || node.data.label == "Multi Agent (BaseAgent)"
    );

    if (agentNode?.data.label == "AI Agent") {
    const workflowIdentifier = workflowId || createdWorkflowId;
    if (!workflowIdentifier) {
      toast.error('Cannot stop workflow without an ID');
      return;
    }

    try {
      // Make API call to stop the workflow
      const response = await fetch(`/api/workflows/${workflowIdentifier}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to stop workflow');
      }
      
      // Update workflow status in the UI
      setWorkflowStatus('idle');
      
      // ---- Automatically disable API for webhook nodes ----
      console.log("Workflow stopped. Disabling API for webhook nodes.");
      const { nodes, updateNodeData } = useWorkflowStore.getState();
      const webhookNodes = nodes.filter(node => node.data?.label === 'Respond to Webhook');
      
      webhookNodes.forEach(node => {
        // Check if webhookConfig exists and apiEnabled is true before updating
        if (node.data?.webhookConfig?.apiEnabled === true) {
          console.log(`Disabling API for webhook node: ${node.id}`);
          updateNodeData(node.id, {
            webhookConfig: {
              ...node.data.webhookConfig,
              apiEnabled: false
            }
          });
        }
      });
      
      // Trigger save if any webhook node was updated
      if (webhookNodes.some(node => node.data?.webhookConfig?.apiEnabled === true)) {
          console.log("Triggering save after disabling webhook APIs.");
          triggerAutoSave();
      }
      // ----------------------------------------------------
      
      toast.info('Workflow stopped', {
        description: 'Your workflow has been stopped',
        duration: 3000
      });
      
      // Update the execution record in Supabase
      try {
        // Fetch the execution record to get started_at time
        const { data: executionData, error: fetchError } = await supabase
          .from('executions')
          .select('started_at')
          .eq('workflow_id', workflowIdentifier)
          .eq('status', 'running')
          .single();
        
        if (fetchError) {
          console.error('Error fetching execution record for update:', fetchError);
          // Don't block UI for this error
        } else if (executionData && executionData.started_at) {
          const stoppedAt = new Date();
          const startedAt = new Date(executionData.started_at);
          
          // Calculate run time
          const runTime = formatDistanceStrict(stoppedAt, startedAt);
          // need fix for get the actual runtime of workflow for now just display the stopped time
          // Update the record
          const { error: updateError } = await supabase
            .from('executions')
            .update({ 
              status: 'stopped',
              run_time: stoppedAt
            })
            .eq('workflow_id', workflowIdentifier)
            .eq('status', 'running');
            
          if (updateError) {
            console.error('Error updating execution record in Supabase:', updateError);
          } else {
            console.log(`Successfully updated execution ${workflowIdentifier} status to stopped with run time: ${runTime}`);
          }
        } else {
          console.warn(`Execution record ${workflowIdentifier} not found or missing started_at time.`);
        }
      } catch (dbError) {
        console.error('Exception updating execution in Supabase:', dbError);
      }

    } catch (error) {
      console.error('Error stopping workflow:', error);
      toast.error('Failed to stop workflow', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
    }
  } else if (agentNode?.data.label == "Supabase AI Agent") {
    // Reset the workflow status
    
    // Get the correct workflow identifier
    const currentWorkflowId = workflowId || createdWorkflowId;
    
    // Show notification
    toast.info('Workflow stopped', {
      description: 'Your Supabase agent workflow has been stopped',
      duration: 3000
    });
    
    // Clear the Supabase agent session data from the node
    try {
      // Preserve supabaseUrl and supabaseKey but remove sessionId and userId
      useWorkflowStore.getState().updateNodeData(agentNode.id, {
        supabaseConfig: {
          supabaseUrl: agentNode.data.supabaseConfig?.supabaseUrl,
          supabaseKey: agentNode.data.supabaseConfig?.supabaseKey
          // Not including sessionId and userId to remove them
        }
      });
      
      console.log('Cleared Supabase agent session data while preserving connection settings');
      
      // Update execution record in database
      try {
        // Fetch the execution record to get started_at time
        const { data: executionData, error: fetchError } = await supabase
          .from('executions')
          .select('started_at')
          .eq('workflow_id', currentWorkflowId)
          .eq('status', 'running')
          .single();
        
        if (fetchError) {
          console.error('Error fetching execution record for update:', fetchError);
          // Don't block UI for this error
        } else if (executionData && executionData.started_at) {
          const stoppedAt = new Date();
          const startedAt = new Date(executionData.started_at);
          
          // Calculate run time
          const runTime = formatDistanceStrict(stoppedAt, startedAt);
          
          // Update the record with the correct workflow ID
          const { error: updateError } = await supabase
            .from('executions')
            .update({ 
              status: 'stopped',
              run_time: stoppedAt
            })
            .eq('workflow_id', currentWorkflowId)
            .eq('status', 'running');
          
          setWorkflowStatus('idle');
          if (updateError) {
            console.error('Error updating execution record in Supabase:', updateError);
          } else {
            console.log(`Successfully updated execution ${currentWorkflowId} status to stopped with run time: ${runTime}`);
          }
        } else {
          console.warn(`Execution record ${currentWorkflowId} not found or missing started_at time.`);
        }
      } catch (dbError) {
        console.error('Exception updating execution in Supabase:', dbError);
      }
    } catch (error) {
      console.error('Error clearing Supabase agent session data:', error);
    }
    }else if(agentNode?.data.label == "Multi Agent (BaseAgent)"){
      // Reset the workflow status
      setWorkflowStatus('idle');
      setActiveAgentName(null);
      toast.info('Multi Agent workflow stopped', {
        description: 'Your Multi Agent workflow has been stopped',
        duration: 3000
      });

      // Get the folder name from Multi Agent config
      //const multiAgentNode = nodes.find(node => node.data.label === 'Multi Agent (BaseAgent)');
      //const folderName = multiAgentNode?.data.multiAgentConfig?.name;
      const folderName = activeAgentName;

      if (folderName) {
        try {
          // Get the current user
          const { user, error: userError } = await getCurrentUser();
          if (userError || !user || !user.id) {
            throw new Error('User not authenticated. Please log in.');
          }

          // Call the stop endpoint with the folder name
          const response = await fetch('/api/multi-agent/stop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': user.id
            },
            body: JSON.stringify({
              folder_name: folderName
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to stop Multi Agent workflow');
          }else{
            const currentWorkflowId = workflowId || createdWorkflowId;
      
            try {
              // Fetch the execution record to get started_at time
              const { data: executionData, error: fetchError } = await supabase
                .from('executions')
                .select('id, started_at')
                .eq('workflow_id', currentWorkflowId)
                .eq('status', 'running')
                .single();
              
              if (fetchError) {
                console.error('Error fetching execution record for update:', fetchError);
                // Don't block UI for this error
              } else if (executionData && executionData.started_at) {
                const stoppedAt = new Date();
                const startedAt = new Date(executionData.started_at);
                
                // Calculate run time
                const runTime = formatDistanceStrict(stoppedAt, startedAt);
                
                // Update the record with the correct workflow ID
                const { error: updateError } = await supabase
                  .from('executions')
                  .update({ 
                    status: 'stopped',
                    run_time: stoppedAt
                  })
                  .eq('workflow_id', currentWorkflowId)
                  .eq('status', 'running');

                  // Delete SenClient
                  const { error: DeleteError } = await supabase
                  .from('sentientxclient')
                  .delete()
                  .eq('app_id', folderName);
                  // End Delete SenClient
                
                if (!updateError || !DeleteError) {
                  // Also update the agentfactory record
                  const { error: agentFactoryUpdateError } = await supabase
                    .from('agentfactory')
                    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
                    .eq('execution_id', executionData.id);

                  if (agentFactoryUpdateError) {
                    console.error('Error updating agentfactory record to deleted:', agentFactoryUpdateError);
                  } else {
                    console.log(`Successfully marked agentfactory record as deleted for execution ${executionData.id}`);
                  }
                }
                
                setWorkflowStatus('idle');
                if (updateError) {
                  console.error('Error updating execution record in Supabase:', updateError);
                } else {
                  console.log(`Successfully updated execution ${currentWorkflowId} status to stopped with run time: ${runTime}`);
                }
              } else {
                console.warn(`Execution record ${currentWorkflowId} not found or missing started_at time.`);
              }
            } catch (dbError) {
              console.error('Exception updating execution in Supabase:', dbError);
            }
          }

          console.log(`Successfully stopped Multi Agent workflow and deleted folder: ${folderName}`);
        } catch (error) {
          console.error('Error stopping Multi Agent workflow:', error);
          toast.error('Error stopping Multi Agent workflow', {
            description: error instanceof Error ? error.message : 'Unknown error',
            duration: 5000
          });
        }
      } else {
        console.warn('No folder name found in Multi Agent config');
      }



    }
  };

  // --- Determine the current workflow ID to use --- 
  const currentWorkflowIdentifier = workflowId || createdWorkflowId;

  if (!isReady) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center">
          <svg 
            className="animate-pulse-slow w-16 h-16 text-primary"
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="animate-dash"
            />
            <path 
              d="M7.5 12H16.5" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="animate-dash delay-100"
            />
            <path 
              d="M10.5 7.5L7.5 12L10.5 16.5" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="animate-dash delay-200"
            />
          </svg>
          <p className="text-sm text-muted-foreground mt-2">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center px-4 py-2 border-b">
        <div className="flex items-center">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.5 12H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.5 7.5L7.5 12L10.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="ml-2 text-xl font-bold">SentientX</span>
        </div>
        <div className="flex-1 flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="canvas">Editor</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <WorkflowHeader
        name={workflowName}
        onNameChange={setWorkflowName}
        isActive={isWorkflowActive}
        onActiveChange={setIsWorkflowActive}
        onBack={onClose}
        tags={tags}
        onTagsChange={setTags}
        workflowId={currentWorkflowIdentifier}
        onStartWorkflow={handleStartWorkflow}
        onPauseWorkflow={handlePauseWorkflow}
        onStopWorkflow={handleStopWorkflow}
        workflowStatus={workflowStatus}
        isSupabaseAgentLoading={isSupabaseAgentLoading}
        nodes={nodes}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'canvas' ? (
          <>
            <div className={`h-full transition-all duration-300 ${isPanelVisible ? 'w-64' : 'w-0'} relative overflow-hidden flex-shrink-0`}>
              {isPanelVisible && (
                <NodePanel onToggle={() => setIsPanelVisible(false)} agentType={agentType} />
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute -right-10 top-2 z-10 bg-background rounded-full shadow-md hidden md:flex"
                onClick={() => setIsPanelVisible(!isPanelVisible)}
                title={isPanelVisible ? "Hide node panel" : "Show node panel"}
              >
                <ChevronLeft className={`h-5 w-5 transform transition-transform duration-300 ${isPanelVisible ? '' : 'rotate-180'}`} />
              </Button>
            </div>

            {!isPanelVisible && (
              <Button
                variant="outline"
                size="sm"
                className="absolute left-2 top-[72px] z-10 md:hidden"
                onClick={() => setIsPanelVisible(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Nodes
              </Button>
            )}

            <ReactFlowProvider>
              <div ref={reactFlowWrapper} className="flex-1 h-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  nodeTypes={nodeTypes}
                  deleteKeyCode={['Backspace', 'Delete']}
                  fitView
                  fitViewOptions={{ padding: 0.5, maxZoom: 0.8 }}
                  defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
                  minZoom={0.2}
                  maxZoom={1.5}
                  defaultEdgeOptions={edgeOptions}
                  connectionLineType={ConnectionLineType.SmoothStep}
                  connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2, opacity: 0.8 }}
                  className="bg-background"
                >
                  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                    <defs>
                      <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <Background color="#f1f5f9" gap={16} variant={BackgroundVariant.Dots} />
                  <Controls className="bg-white border border-gray-200 rounded-md shadow-sm" />
                  <MiniMap 
                    nodeStrokeColor={(n) => {
                      if (n.type === 'action') return '#ec4899';
                      if (n.type === 'trigger') return '#3b82f6';
                      return '#94a3b8';
                    }}
                    nodeColor={(n) => {
                      if (n.type === 'action') return '#4c1d95';
                      if (n.type === 'trigger') return '#1e3a8a';
                      return '#1e293b';
                    }}
                    maskColor="rgba(15, 23, 42, 0.6)"
                    style={{ background: '#0f172a' }}
                  />
                  <Panel position="top-left" className="ml-2 mt-2">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setIsPanelVisible(!isPanelVisible)}
                    >
                      {isPanelVisible ? (
                        <>
                          <PanelLeftClose className="h-4 w-4 mr-2" />
                          Hide Panel
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Show Panel
                        </>
                      )}
                    </Button>
                    {/* AI Builder Button */}
                    {(agentType === 'multi_agent') && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-full h-12 w-12 p-0 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white border-2 border-white/30 shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:shadow-xl"
                      onClick={() => setIsAIBuilderModalOpen(true)}
                      title="SentientX AI Builder"
                    >
                      <Bot className="h-6 w-6" />
                    </Button>
                    )}
                  </div>
                  </Panel>
                  <Panel position="top-right" className="flex gap-2">
                    {(() => {
                      // Find Multi-Agent node and check if ADK button should be shown
                      const multiAgentNodeExists = nodes.some(node => node.data.label === 'Multi Agent (BaseAgent)');
                      
                      const adkWebUrl = process.env.NEXT_PUBLIC_ADK_WEB_URL || process.env.ADK_WEB_URL;
                      const adkAppUrl = adkWebUrl && activeAgentName ? 
                        `${adkWebUrl}/?app=${encodeURIComponent(activeAgentName)}` : '';

                      return multiAgentNodeExists ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={workflowStatus !== 'running' || !adkAppUrl}
                          onClick={() => {
                            if (adkAppUrl) {
                              window.open(adkAppUrl, '_blank')
                            }
                          }}
                          title={workflowStatus === 'running' && activeAgentName ? `Open ${activeAgentName} in SentientX Testing Ground` : 'Start the workflow to open in Testing Ground'}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          SentientX Testing Ground
                        </Button>
                      ) : null;
                    })()}
                    <Button size="sm" variant="outline" onClick={() => {
                      if (reactFlowInstance) {
                        reactFlowInstance.fitView({
                          padding: 0.4,
                          includeHiddenNodes: true,
                          duration: 800
                        });
                      }
                    }}>
                      <Maximize className="h-4 w-4 mr-1" />
                      Center View
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetWorkflow}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button size="sm" onClick={handleSaveWorkflow}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </Panel>
                </ReactFlow>
              </div>
            </ReactFlowProvider>
          </>
        ) : (
          <div className="flex-1 h-full overflow-y-auto">
            {currentWorkflowIdentifier ? (
              <ExecutionDetailsView workflowId={currentWorkflowIdentifier} />
            ) : (
              <div className="p-4 text-center text-muted-foreground">Select or create a workflow first.</div>
            )}
          </div>
        )}
      </div>
      
      {/* AI Builder Modal */}
      <AIBuilderModal
        isOpen={isAIBuilderModalOpen}
        onClose={() => setIsAIBuilderModalOpen(false)}
        workflowId={currentWorkflowIdentifier}
        onWorkflowGenerated={(workflowData) => {
          // Handle generated workflow data
          console.log('Generated workflow:', workflowData);
          
          // Refresh the canvas with the new workflow data
          if (workflowData.workflowData) {
            setIsReady(false); // Temporarily disable while loading
            
            // Update the workflow store with new nodes and edges
            useWorkflowStore.setState({
              nodes: workflowData.workflowData.nodes || [],
              edges: workflowData.workflowData.edges || [],
              workflowId: workflowData.workflowId
            });
            
            // Update local state with workflow details
            // setWorkflowName(workflowData.workflowData.name || workflowName);
            // setIsWorkflowActive(workflowData.workflowData.is_active || true);
            // setTags(workflowData.workflowData.tags || ['ai-generated']);
            // setAgentType(workflowData.workflowData.agent_type || 'multi_agent');
            
            // Re-enable and trigger view fit
            setIsReady(true);
            shouldFitViewRef.current = true;
            
            // Fit view after a short delay to ensure nodes are rendered
            setTimeout(() => {
              if (reactFlowInstance) {
                reactFlowInstance.fitView({
                  padding: 0.5,
                  includeHiddenNodes: true,
                  duration: 800
                });
              }
            }, 200);
          }
          
          toast.success('Workflow generated and loaded!', {
            description: 'Your AI-generated workflow is now ready for customization.',
            duration: 5000
          });
        }}
      />
    </div>
  );
} 