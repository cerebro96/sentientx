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
import { Check, Save, ChevronLeft, Trash2, Maximize, Search, PanelLeftClose } from 'lucide-react';
import { toast } from 'sonner';
import { NodeData } from '@/lib/store/workflow';
import { WorkflowFormData } from './WorkflowDialog';
import { createWorkflow, getWorkflow, updateWorkflow, getWorkflows } from '@/lib/workflows';
import { nodeCatalog } from './nodeTypes';
import { getApiKeyWithValue } from "@/lib/api-keys";
import { supabase } from '@/lib/supabase';
import { formatDistanceStrict } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

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
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('canvas');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  
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
    originalOnConnect(connection);
    
    // Always auto-save when new connections are made
    if (!initialLoadRef.current) {
      console.log('Auto-saving after new connection:', connection);
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

    // Check status when component mounts or workflowId changes
    if (isReady) {
      checkWorkflowStatus();
    }
  }, [workflowId, createdWorkflowId, isReady]);

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
    
    try {
      // Collect all nodes that need API keys
      const nodes = useWorkflowStore.getState().nodes;
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
  };

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
              <TabsTrigger value="code">Executions</TabsTrigger>
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
        workflowId={workflowId}
        onStartWorkflow={handleStartWorkflow}
        onPauseWorkflow={handlePauseWorkflow}
        onStopWorkflow={handleStopWorkflow}
        workflowStatus={workflowStatus}
      />
      
      <div className="flex-1 flex">
        {/* Node Panel with toggle button */}
        <div className={`h-full transition-all duration-300 ${isPanelVisible ? 'w-64' : 'w-0'} relative overflow-hidden`}>
          {isPanelVisible && (
            <NodePanel onToggle={() => setIsPanelVisible(false)} />
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

        {/* Mobile toggle button - only visible when panel is hidden */}
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

        {/* ReactFlow Canvas */}
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
              </Panel>
              <Panel position="top-right" className="flex gap-2">
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
      </div>
    </div>
  );
} 