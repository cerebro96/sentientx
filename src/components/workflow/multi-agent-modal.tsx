'use client';

import { useState, useEffect } from 'react';
import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Node, Edge } from 'reactflow';
import { NodeData, useWorkflowStore } from '@/lib/store/workflow';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { llmProviderConfigs } from './llm-provider-configs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";

// Function to get all models from all providers
function getAllModels() {
  const allModels: { value: string; label: string; provider: string }[] = [];
  
  Object.entries(llmProviderConfigs).forEach(([provider, config]) => {
    config.models.forEach(model => {
      allModels.push({
        value: model.value,
        label: model.label,
        provider: config.displayName
      });
    });
  });
  
  return allModels;
}

interface MultiAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeData: {
    name?: string;
    model?: string;
    description?: string;
    instructions?: string;
    connectedNodes?: {
      id: string;
      label: string;
      type: string;
      direction: 'input' | 'output';
      description?: string;
    }[];
  } | undefined;
  onSave: (configData: { 
    name: string; 
    model: string;
    description: string;
    instructions: string;
    connectedNodes: {
      id: string;
      label: string;
      type: string;
      direction: 'input' | 'output';
      description?: string;
    }[];
  }) => void;
}

export function MultiAgentModal({ 
  isOpen, 
  onClose, 
  nodeId, 
  nodeData, 
  onSave 
}: MultiAgentModalProps) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [activeTab, setActiveTab] = useState('config');
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get all models from all providers
  const allModels = getAllModels();
  
  // Filter models based on search query
  const filteredModels = searchQuery.trim() === '' 
    ? allModels 
    : allModels.filter(item => 
        `${item.label} ${item.value}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
  // Get nodes and edges from workflow store
  const { nodes, edges } = useWorkflowStore();
  
  // Filter connected nodes
  const connectedNodes = getConnectedNodes(nodeId, nodes, edges);

  useEffect(() => {
    if (isOpen && nodeData) {
      setName(nodeData.name || '');
      setModel(nodeData.model || '');
      setDescription(nodeData.description || '');
      setInstructions(nodeData.instructions || '');
    }
  }, [isOpen, nodeData]);

  // Add more aggressive focus management
  useEffect(() => {
    if (open) {
      // When dropdown opens, focus immediately and set periodic refocus
      const focusInput = () => {
        if (searchRef.current) {
          searchRef.current.focus();
        }
      };
      
      // Focus immediately
      focusInput();
      
      // And also after a small delay to ensure it's rendered
      const timer1 = setTimeout(focusInput, 10);
      const timer2 = setTimeout(focusInput, 100);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [open]);
  
  // Inhibit popover modal from trapping focus elsewhere
  useEffect(() => {
    if (open) {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Ensure input can accept key presses
        if (searchRef.current) {
          searchRef.current.focus();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open]);

  const handleSave = () => {
    if (!name) {
      toast.error('Agent name is required.');
      return;
    }
    
    // Prepare connected nodes data for saving
    const connectedNodesData = connectedNodes.map(node => {
      return {
        id: node.id,
        label: node.data.label,
        type: node.type || 'action',
        direction: edges.some(edge => edge.source === nodeId && edge.target === node.id) 
          ? 'output' as const
          : 'input' as const,
        description: node.data.description
      };
    });
    
    onSave({ 
      name, 
      model, 
      description, 
      instructions,
      connectedNodes: connectedNodesData
    });
    
    onClose(); 
  };
  
  // Helper function to find nodes connected to this node
  function getConnectedNodes(nodeId: string, nodes: Node<NodeData>[], edges: Edge[]) {
    // Find all edges where this node is the source
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    // Find all edges where this node is the target
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    
    // Get connected nodes from edges
    const connectedNodeIds = [
      ...outgoingEdges.map(edge => edge.target),
      ...incomingEdges.map(edge => edge.source)
    ];
    
    // Return the actual node objects
    return nodes.filter(node => connectedNodeIds.includes(node.id));
  }
  
  // Render connected nodes
  const renderConnectedNodes = () => {
    if (connectedNodes.length === 0) {
      return (
        <div className="p-3 bg-muted rounded-md text-sm flex items-center">
          <p className="text-muted-foreground">No nodes connected</p>
        </div>
      );
    }
    
    return connectedNodes.map((node, index) => (
      <div key={index} className="p-3 border rounded-md mb-2">
        <h4 className="text-sm font-medium">{node.data.label}</h4>
        {node.data.description && (
          <p className="text-xs text-muted-foreground mt-1">{node.data.description}</p>
        )}
        
        {/* Show connection type - whether incoming or outgoing */}
        <div className="mt-2 flex items-center">
          <div className={`h-2 w-2 rounded-full ${
            edges.some(edge => edge.source === nodeId && edge.target === node.id)
              ? "bg-blue-500" // Outgoing connection
              : "bg-green-500" // Incoming connection
          }`}></div>
          <span className="text-xs ml-1 text-muted-foreground">
            {edges.some(edge => edge.source === nodeId && edge.target === node.id)
              ? "Output to this node"
              : "Input from this node"
            }
          </span>
        </div>
      </div>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            Multi Agent Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your Multi Agent (BaseAgent) settings
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="config" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="connections">Connections ({connectedNodes.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="config" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter agent name"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <div className="relative w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(!open)}
                    className="w-full justify-between"
                  >
                    {model
                      ? allModels.find((item) => item.value === model)?.label
                      : "Select model..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                  
                  {open && (
                    <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                      <div className="flex h-9 items-center gap-2 border-b px-3">
                        <SearchIcon className="size-4 shrink-0 opacity-50" />
                        <input
                          ref={searchRef}
                          type="text"
                          autoFocus
                          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none"
                          placeholder="Search models..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredModels.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No model found.
                          </div>
                        ) : (
                          Object.entries(llmProviderConfigs).map(([providerId, config]) => {
                            // Filter models for this provider
                            const providerModels = config.models.filter(item => 
                              filteredModels.some(m => m.value === item.value)
                            );
                            
                            // Only show provider if it has matching models
                            if (providerModels.length === 0) return null;
                            
                            return (
                              <div key={providerId} className="mb-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{config.displayName}</div>
                                <div>
                                  {providerModels.map((item) => (
                                    <div
                                      key={item.value}
                                      className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                      onClick={() => {
                                        setModel(item.value);
                                        setOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          model === item.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {item.label}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Invisible backdrop to close dropdown when clicking outside */}
                  {open && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setOpen(false)}
                    />
                  )}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this agent does"
                  rows={2}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Provide detailed instructions for the agent"
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="connections" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Connected Nodes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                These nodes are connected to your Multi Agent
              </p>
              
              {renderConnectedNodes()}
              
              <div className="p-4 border rounded-md bg-muted/50 mt-4">
                <h3 className="font-medium mb-2">Connection Tips</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Connect to other agents to create a hierarchical structure</li>
                  <li>• Use the output to send data to other nodes</li>
                  <li>• Create a network of specialized agents working together</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 