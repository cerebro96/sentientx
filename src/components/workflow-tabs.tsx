import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Search } from "lucide-react";
import { WorkflowItem } from "./workflow-item";
import { WorkflowDialog, WorkflowFormData } from "./workflow/WorkflowDialog";
import { getWorkflows, Workflow } from "@/lib/workflows";
import { Input } from "@/components/ui/input";

interface WorkflowTabsProps {
  onEditorStateChange: (isActive: boolean) => void;
  onCreateWorkflow: (formData: WorkflowFormData) => void;
  onEditWorkflow: (workflowId: string) => void;
}

export function WorkflowTabs({ 
  onEditorStateChange, 
  onCreateWorkflow, 
  onEditWorkflow 
}: WorkflowTabsProps) {
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const data = await getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflowSuccess = (formData: WorkflowFormData) => {
    setIsWorkflowDialogOpen(false);
    onCreateWorkflow(formData);
  };

  const filteredWorkflows = workflows.filter(workflow => {
    if (!searchQuery.trim()) return true;
    return workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      workflow.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <Tabs defaultValue="workflows" className="w-full">
      <div className="flex justify-between items-center mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>
        <Button 
          variant="default" 
          className="bg-primary text-primary-foreground"
          onClick={() => setIsWorkflowDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create AI Workflow
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      <TabsContent value="workflows" className="mt-6">
        <div className="flex justify-between items-center">
          <div className="relative w-72">
            <Input
              type="search"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Sort by last updated</span>
            <button className="p-2 rounded-md hover:bg-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          {isLoading ? (
            // Loading skeleton
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="p-4 border rounded-md animate-pulse">
                <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-muted rounded"></div>
                  <div className="h-6 w-16 bg-muted rounded"></div>
                </div>
              </div>
            ))
          ) : filteredWorkflows.length > 0 ? (
            filteredWorkflows.map(workflow => (
              <WorkflowItem 
                key={workflow.id}
                id={workflow.id}
                title={workflow.name}
                description={workflow.description || ''}
                tags={workflow.tags}
                lastUpdated={new Date(workflow.updated_at).toLocaleString()}
                created={new Date(workflow.created_at).toLocaleString()}
                isPersonal={true}
                isActive={workflow.is_active}
                onEdit={() => onEditWorkflow(workflow.id)}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No workflows found</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setIsWorkflowDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first workflow
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total {filteredWorkflows.length}</span>
          {filteredWorkflows.length > 0 && (
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 rounded-md bg-primary text-primary-foreground">1</button>
              <span className="text-sm text-muted-foreground">50/page</span>
            </div>
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="credentials">
        <div className="p-4 text-center">
          <p className="text-muted-foreground">No credentials found</p>
        </div>
      </TabsContent>
      
      <TabsContent value="executions">
        <div className="p-4 text-center">
          <p className="text-muted-foreground">No executions found</p>
        </div>
      </TabsContent>

      <WorkflowDialog 
        isOpen={isWorkflowDialogOpen}
        onClose={() => setIsWorkflowDialogOpen(false)}
        onWorkflowCreated={handleCreateWorkflowSuccess}
      />
    </Tabs>
  );
} 