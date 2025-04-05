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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { WorkflowHeader } from './WorkflowHeader';
import { NodePanel } from './NodePanel';
import { nodeTypes } from './nodeTypes';
import { useWorkflowStore } from '@/lib/store/workflow';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Save, ChevronLeft, Trash2 } from 'lucide-react';
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

  // Access store state and actions
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    resetWorkflow,
    isReady,
    setIsReady,
  } = useWorkflowStore();

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

  const handleSaveWorkflow = async () => {
    try {
      // Prepare workflow data
      const flowData = {
        name: workflowName,
        is_active: isWorkflowActive,
        tags: tags,
        nodes: nodes,
        edges: edges
      };

      // Use existing workflowId, or the one we already created
      const existingId = workflowId || createdWorkflowId;

      if (existingId) {
        // Update existing workflow
        await updateWorkflow(existingId, flowData);
      } else {
        // Create new workflow - this should only happen once
        const newWorkflow = await createWorkflow({
          name: workflowName,
          description: newWorkflowData?.description,
          tags: tags,
          is_active: isWorkflowActive,
          nodes: nodes,
          edges: edges
        });
        
        // Store the created workflow's ID for future saves
        if (newWorkflow && newWorkflow.id) {
          setCreatedWorkflowId(newWorkflow.id);
        }
      }
      
      toast.success('Workflow saved successfully');
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    }
  };

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
            setTimeout(() => {
              useWorkflowStore.setState({
                nodes: data.nodes,
                edges: data.edges
              });
              setIsReady(true);
            }, 0);
          }
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        // Error toast is already shown in the getWorkflow function
      }
    };

    loadWorkflow();
  }, [workflowId, setIsReady]);

  useEffect(() => {
    setIsReady(true);
    
    return () => {
      setIsReady(false);
      resetWorkflow();
    };
  }, [setIsReady, resetWorkflow]);

  if (!isReady) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
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