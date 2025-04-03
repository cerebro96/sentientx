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

export function WorkflowCanvas({ isActive, onClose, workflowId, newWorkflowData }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [workflowName, setWorkflowName] = useState(newWorkflowData?.name || 'My workflow');
  const [isWorkflowActive, setIsWorkflowActive] = useState(newWorkflowData?.isActive || false);
  const [tags, setTags] = useState<string[]>(newWorkflowData?.tags || []);
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | undefined>(undefined);

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
      <div className="border-b">
        <div className="flex justify-center py-2">
          <Tabs defaultValue="editor" className="w-fit">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
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
              fitViewOptions={{ padding: 0.2 }}
              connectionLineType={ConnectionLineType.SmoothStep}
            >
              <Background />
              <Controls />
              <MiniMap />
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