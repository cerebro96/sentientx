'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { WorkflowHeader } from './WorkflowHeader';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkflow, Workflow, updateWorkflow } from '@/lib/workflows';
import { toast } from 'sonner';
import { WorkflowFormData } from './WorkflowDialog';

interface WorkflowCanvasProps {
  isActive: boolean;
  onClose?: () => void;
  workflowId?: string;
  newWorkflowData?: WorkflowFormData | null;
}

export function WorkflowCanvas({ isActive, onClose, workflowId, newWorkflowData }: WorkflowCanvasProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkflow() {
      if (!workflowId) {
        // If no workflow ID, create a new workflow state
        // Use newWorkflowData if available, otherwise use defaults
        setWorkflow({
          id: '',
          user_id: '',
          name: newWorkflowData?.name || 'My workflow',
          description: newWorkflowData?.description || null,
          is_active: newWorkflowData?.isActive || false,
          tags: newWorkflowData?.tags || [],
          nodes: [],
          edges: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getWorkflow(workflowId);
        if (data) {
          setWorkflow(data);
        } else {
          toast.error('Workflow not found');
          onClose?.();
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        // Toast is already shown in the getWorkflow function
        onClose?.();
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkflow();
  }, [workflowId, newWorkflowData, onClose]);

  const handleNameChange = async (name: string) => {
    if (!workflow) return;
    
    const updatedWorkflow = { ...workflow, name };
    setWorkflow(updatedWorkflow);
    
    if (workflow.id) {
      try {
        await updateWorkflow(workflow.id, { name });
      } catch (error) {
        console.error('Error updating workflow name:', error);
        // The UI is already updated, so no need to show an error toast here
      }
    }
  };

  const handleActiveChange = async (is_active: boolean) => {
    if (!workflow) return;
    
    const updatedWorkflow = { ...workflow, is_active };
    setWorkflow(updatedWorkflow);
    
    if (workflow.id) {
      try {
        await updateWorkflow(workflow.id, { is_active });
      } catch (error) {
        console.error('Error updating workflow active state:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="mt-4 text-sm text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }

  if (!workflow) {
    return null;
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
        name={workflow.name}
        onNameChange={handleNameChange}
        isActive={workflow.is_active}
        onActiveChange={handleActiveChange}
        onBack={onClose}
        tags={workflow.tags}
        workflowId={workflow.id}
      />
      
      <div className="flex-1">
        <div className="flex h-full">
          <div className="flex-1 bg-grid-pattern p-8 overflow-auto">
            {workflow.nodes.length === 0 ? (
              <div className="min-h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p>Add first step...</p>
                </div>
              </div>
            ) : (
              <div className="min-h-full">
                {/* Render the actual workflow nodes and edges here */}
                {/* This will be implemented with a proper workflow editor */}
              </div>
            )}
          </div>
          
          <div className="w-12 border-l flex flex-col items-center py-4 gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 