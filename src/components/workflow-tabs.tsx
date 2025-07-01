'use client';

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Search, MoreHorizontal, PenSquare, Copy, Trash2, Tag, AlertCircle, Calendar, Activity, Play, Grid3X3, Table2, ChevronLeft, ChevronRight, Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowItem } from "./workflow-item";
import { WorkflowDialog, WorkflowFormData } from "./workflow/WorkflowDialog";
import { getWorkflows, Workflow, deleteWorkflow, createWorkflow } from "@/lib/workflows";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Use crypto.randomUUID for more robust ID generation, then truncate
function generateRandomId() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    // Generate full UUID, remove hyphens, take first 7 characters
    return window.crypto.randomUUID().replace(/-/g, '').substring(0, 7);
  } else {
    // Fallback: Generate a 7-character random string using Math.random
    console.warn("crypto.randomUUID not available, using Math.random fallback for 7-char ID.");
    return Math.random().toString(36).substring(2, 9); // substring(2, 9) gives 7 chars
  }
}

// Pagination component for table view
interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
}

function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange 
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const delta = 2
    const pages = []
    const rangeStart = Math.max(2, currentPage - delta)
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta)

    if (totalPages <= 1) return []

    // Always show first page
    pages.push(1)

    if (rangeStart > 2) {
      pages.push('...')
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }

    if (rangeEnd < totalPages - 1) {
      pages.push('...')
    }

    // Always show last page (if not already included)
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t">
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} results
        </p>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Rows per page:</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

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
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('active');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Pagination state for table view
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab]);

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

  const formatAgentType = (agentType: string) => {
    switch (agentType) {
      case 'single_agent':
        return 'Single Agent';
      case 'multi_agent':
        return 'Multi Agent';
      case 'prebuild_agents':
        return 'Prebuild Agents';
      default:
        return agentType;
    }
  };

  const handleCreateWorkflowSuccess = async (formData: WorkflowFormData) => {
    try {
      // Create the workflow in the database
      const createdWorkflow = await createWorkflow({
        name: formData.name,
        description: formData.description || undefined,
        agent_type: formData.agentType,
        is_active: formData.isActive,
        tags: formData.tags,
        nodes: [],
        edges: []
      });
      
      // Success notification
      toast.success("Workflow created successfully");
      
      // Close dialog first
      setIsWorkflowDialogOpen(false);
      
      // Navigate to canvas with the CREATED WORKFLOW ID instead of creating a new one
      if (createdWorkflow && createdWorkflow.id) {
        // Pass the actual workflow ID for editing instead of newWorkflowData
        onEditWorkflow(createdWorkflow.id);
      } else {
        // Fallback: if no ID returned, create as new (this shouldn't happen)
        onCreateWorkflow(formData);
      }
      
      // Refresh the list (optional, as user will be in canvas)
      loadWorkflows();
    } catch (error) {
      console.error("Failed to create workflow:", error);
      // Keep dialog open so user can retry
      // Error toast is handled in createWorkflow function
    }
  };

  const handleEditWorkflow = (workflowId: string) => {
    onEditWorkflow(workflowId);
  };

  const handleDuplicateWorkflow = async (workflow: Workflow) => {
    try {
      // Deep copy nodes and edges to avoid modifying the original workflow object
      const nodesCopy = JSON.parse(JSON.stringify(workflow.nodes || []));
      const edgesCopy = JSON.parse(JSON.stringify(workflow.edges || []));
      
      // Regenerate webhookIds for Respond to Webhook nodes
      nodesCopy.forEach((node: any) => {
        if (node.data?.label === 'Respond to Webhook') {
          const newWebhookId = generateRandomId();
          console.log(`Generating new webhook ID for duplicated node ${node.id}: ${newWebhookId}`);
          // Ensure webhookConfig exists before modifying
          if (!node.data.webhookConfig) {
            node.data.webhookConfig = {}; 
          }
          node.data.webhookConfig.webhookId = newWebhookId;
          node.data.webhookConfig.apiEnabled = false; // Ensure copied webhook starts disabled
        }
      });
      
      // Prepare the rest of the duplicated data
      const duplicatedWorkflowData: Partial<Workflow> & Pick<Workflow, 'name' | 'nodes' | 'edges' | 'tags' | 'agent_type'> = {
        name: `${workflow.name} (Copy)`,
        description: workflow.description || undefined,
        agent_type: workflow.agent_type,
        is_active: false, // Start inactive
        tags: workflow.tags || [],
        nodes: nodesCopy, // Use the modified nodes
        edges: edgesCopy,
      };
      
      // No need to delete properties like id, user_id etc. as createWorkflow handles it

      const newWorkflow = await createWorkflow(duplicatedWorkflowData as any);
      toast.success(`Workflow "${workflow.name}" duplicated successfully!`);
      loadWorkflows();
    } catch (error) {
      toast.error(`Failed to duplicate workflow "${workflow.name}".`);
      console.error("Error duplicating workflow:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) return;
    
    try {
      await deleteWorkflow(workflowToDelete);
      setWorkflows(workflows.filter(w => w.id !== workflowToDelete));
      setWorkflowToDelete(null);
    } catch (error) {
      console.error('Failed to delete workflow', error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const { filteredWorkflows, paginatedWorkflows, totalPages } = useMemo(() => {
    let result = workflows.filter(workflow => {
      if (currentTab === 'all') return true;
      if (currentTab === 'active') return workflow.is_active;
      if (currentTab === 'inactive') return !workflow.is_active;
      return true;
    });

    // Calculate pagination for table view
    if (viewMode === 'table') {
      const totalFilteredItems = result.length;
      const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedResults = result.slice(startIndex, endIndex);

      return {
        filteredWorkflows: result,
        paginatedWorkflows: paginatedResults,
        totalPages
      };
    }

    // For cards view, return all filtered workflows
    return {
      filteredWorkflows: result,
      paginatedWorkflows: result,
      totalPages: 1
    };
  }, [workflows, currentTab, viewMode, currentPage, itemsPerPage]);

  const renderCardsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {paginatedWorkflows.map((workflow) => (
        <Card key={workflow.id} className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg truncate max-w-[200px]" title={workflow.name}>
                {workflow.name}
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditWorkflow(workflow.id)}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateWorkflow(workflow)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive" 
                    onClick={() => setWorkflowToDelete(workflow.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription className="line-clamp-2 h-10 mt-2 text-sm text-muted-foreground">
              {workflow.description || 'No description'}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="flex flex-wrap gap-2 mb-4">
              {workflow.tags && workflow.tags.length > 0 ? (
                workflow.tags.map((tag) => (
                  <div key={tag} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>{tag}</span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No tags</span>
              )}
            </div>
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <Bot className="h-4 w-4 mr-1" />
              <span>{formatAgentType(workflow.agent_type)}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Created {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true })}</span>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <div className="flex items-center">
              <Activity className={`h-4 w-4 mr-1 ${workflow.is_active ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">{workflow.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEditWorkflow(workflow.id)}>
                <PenSquare className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Name</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Agent Type</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Description</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Tags</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Created</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedWorkflows.length > 0 ? (
                paginatedWorkflows.map((workflow) => (
                  <tr key={workflow.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 font-medium">
                      <div className="max-w-[200px] truncate" title={workflow.name}>
                        {workflow.name}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="max-w-[300px] truncate" title={workflow.agent_type}>
                        {formatAgentType(workflow.agent_type)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="max-w-[300px] truncate" title={workflow.description || ''}>
                        {workflow.description || 'No description'}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                        <Activity className={`h-3 w-3 mr-1 ${workflow.is_active ? 'text-green-500' : 'text-gray-400'}`} />
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {workflow.tags && workflow.tags.length > 0 ? (
                          workflow.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No tags</span>
                        )}
                        {workflow.tags && workflow.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{workflow.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true })}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditWorkflow(workflow.id)}>
                            <PenSquare className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateWorkflow(workflow)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={() => setWorkflowToDelete(workflow.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/60" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xl font-medium">No workflows found</p>
                        <p className="text-muted-foreground">
                          {currentTab === 'all'
                            ? 'Create your first workflow to get started'
                            : currentTab === 'active'
                            ? 'No active workflows found'
                            : 'No inactive workflows found'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {filteredWorkflows.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredWorkflows.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );

  const renderLoadingView = () => {
    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted rounded-t-lg" />
              <CardContent className="py-6">
                <div className="h-4 bg-muted rounded mb-4 w-3/4" />
                <div className="h-3 bg-muted rounded mb-2 w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="h-8 bg-muted rounded w-1/4" />
                <div className="h-8 bg-muted rounded w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    } else {
      return (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Agent Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-48" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded w-16" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Button onClick={() => setIsWorkflowDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8"
            >
              <Grid3X3 className="mr-2 h-4 w-4" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8"
            >
              <Table2 className="mr-2 h-4 w-4" />
              Table
            </Button>
          </div>
        </div>

        <TabsContent value={currentTab} className="mt-6">
          {isLoading ? (
            renderLoadingView()
          ) : filteredWorkflows.length > 0 ? (
            viewMode === 'cards' ? renderCardsView() : renderTableView()
          ) : (
            <div className="text-center py-10">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No workflows found</h2>
              <p className="text-muted-foreground mb-6">
                {currentTab === 'all'
                  ? 'Create your first workflow to get started'
                  : currentTab === 'active'
                  ? 'No active workflows found'
                  : 'No inactive workflows found'}
              </p>
              <Button onClick={() => setIsWorkflowDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <WorkflowDialog
        isOpen={isWorkflowDialogOpen}
        onClose={() => setIsWorkflowDialogOpen(false)}
        onWorkflowCreated={handleCreateWorkflowSuccess}
      />

      <AlertDialog open={!!workflowToDelete} onOpenChange={(open) => !open && setWorkflowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this workflow and all its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 