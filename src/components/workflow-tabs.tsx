import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";
import { WorkflowItem } from "./workflow-item";

export function WorkflowTabs() {
  return (
    <Tabs defaultValue="workflows" className="w-full">
      <div className="flex justify-between items-center mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>
        <Button variant="default" className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      <TabsContent value="workflows" className="mt-6">
        <div className="flex justify-between items-center">
          <div className="relative w-72">
            <input
              type="search"
              placeholder="Search"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
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
          <WorkflowItem 
            title="Demo: My first AI Agent in SentientX"
            lastUpdated="28 minutes ago"
            created="2 April"
            isPersonal={true}
            isActive={false}
          />
        </div>
        
        <div className="mt-6 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total 1</span>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 rounded-md bg-primary text-primary-foreground">1</button>
            <span className="text-sm text-muted-foreground">50/page</span>
          </div>
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
    </Tabs>
  );
} 