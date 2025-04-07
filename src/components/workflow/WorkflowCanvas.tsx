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
import { Check, Save, ChevronLeft, Trash2, Maximize } from 'lucide-react';
import { toast } from 'sonner';
import { NodeData } from '@/lib/store/workflow';
import { WorkflowFormData } from './WorkflowDialog';
import { createWorkflow, getWorkflow, updateWorkflow } from '@/lib/workflows';

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

      // Use existing workflowId, or the one we already created
      const existingId = workflowId || createdWorkflowId;

      if (existingId) {
        // Update existing workflow
        await updateWorkflow(existingId, flowData);
        // Only show notification for manual saves, not auto-saves
        if (!isAutoSave) {
          toast.success('Workflow saved successfully');
        }
      } else {
        // Create new workflow - this should only happen once
        const newWorkflow = await createWorkflow({
          name: workflowName,
          description: newWorkflowData?.description,
          tags: tags,
          is_active: isWorkflowActive,
          nodes: currentNodes,
          edges: currentEdges
        });
        
        // Store the created workflow's ID for future saves
        if (newWorkflow && newWorkflow.id) {
          setCreatedWorkflowId(newWorkflow.id);
        }
        
        // Always show notification for new workflow creation
        toast.success('Workflow created and saved');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      // Only show error notification for manual saves, not auto-saves
      if (!isAutoSave) {
        toast.error('Failed to save workflow');
      }
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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

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
          
          // Initialize the flow with the saved nodes and edges
          if (data.nodes && data.edges) {
            setIsReady(false); // Temporarily disable while loading
            useWorkflowStore.setState({
              nodes: data.nodes,
              edges: data.edges
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
  }, [workflowId, setIsReady]);

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
      />
      
      <div className="flex-1 flex">
        {/* Node Panel */}
        <div className="w-64 h-full">
          <NodePanel />
        </div>

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