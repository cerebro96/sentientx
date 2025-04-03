'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { WorkflowDialog } from '@/components/workflow/WorkflowDialog';
import { getWorkflows, Workflow } from '@/lib/workflows';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, Plus, Calendar, Activity, MoreHorizontal, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function Dashboard() {
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={() => setIsWorkflowDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create AI Workflow
          </Button>
        </div>

        {isLoading ? (
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
        ) : workflows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{workflow.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{workflow.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {workflow.tags.map((tag) => (
                      <div key={tag} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span>{tag}</span>
                      </div>
                    ))}
                    {workflow.tags.length === 0 && <span className="text-sm text-muted-foreground">No tags</span>}
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
                  <Button size="sm" variant="outline">
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold mb-2">No workflows yet</h2>
            <p className="text-muted-foreground mb-6">Create your first AI workflow to get started</p>
            <Button onClick={() => setIsWorkflowDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create AI Workflow
            </Button>
          </div>
        )}
      </main>

      <WorkflowDialog 
        isOpen={isWorkflowDialogOpen}
        onClose={() => setIsWorkflowDialogOpen(false)}
        onWorkflowCreated={loadWorkflows}
      />
    </div>
  );
} 