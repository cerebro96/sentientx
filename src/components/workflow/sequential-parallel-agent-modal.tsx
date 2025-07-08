'use client';

import { useState, useEffect } from 'react';
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
import { cn } from "@/lib/utils";
import { Bot, ChevronRight, ChevronDown } from "lucide-react";

interface SequentialParallelAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  agentType: 'sequential' | 'parallel';
  nodeData: {
    name?: string;
    description?: string;
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
    description: string;
    connectedNodes: {
      id: string;
      label: string;
      type: string;
      direction: 'input' | 'output';
      description?: string;
    }[];
  }) => void;
}

export function SequentialParallelAgentModal({ 
  isOpen, 
  onClose, 
  nodeId, 
  agentType,
  nodeData, 
  onSave 
}: SequentialParallelAgentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState('config');
  
  // Get nodes and edges from workflow store
  const { nodes, edges } = useWorkflowStore();
  
  // Filter connected nodes
  const connectedNodes = getConnectedNodes(nodeId, nodes, edges);

  useEffect(() => {
    if (isOpen && nodeData) {
      setName(nodeData.name || '');
      setDescription(nodeData.description || '');
    }
  }, [isOpen, nodeData]);

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
      description,
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
    
    // Return the actual node objects, excluding Multi Agent nodes
    return nodes.filter(node => 
      connectedNodeIds.includes(node.id) && 
      node.data.label !== 'Multi Agent (BaseAgent)'
    );
  }
  
  // Render connected nodes
  const renderConnectedNodes = () => {
    if (connectedNodes.length === 0) {
      return (
        <div className="p-6 bg-muted rounded-lg text-center">
          <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No agents connected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect other agents to this {agentType} agent to see them here
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {/* Execution Flow Visualization */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            Execution Flow
          </h4>
          <p className="text-xs text-muted-foreground">
            {agentType === 'sequential' 
              ? 'Agents will execute one after another in sequence'
              : 'Agents will execute simultaneously in parallel'
            }
          </p>
        </div>

        {connectedNodes.map((node, index) => {
          let displayName = node.data.label;
          if (node.data.label === 'Multi Agent (BaseAgent)' && node.data.multiAgentConfig?.name) {
            displayName = node.data.multiAgentConfig.name;
          } else if (node.data.label === 'LLM Agent' && node.data.llmAgentConfig?.name) {
            displayName = node.data.llmAgentConfig.name;
          }

          let displayDescription = node.data.description;
          if (node.data.label === 'Multi Agent (BaseAgent)' && node.data.multiAgentConfig?.description) {
            displayDescription = node.data.multiAgentConfig.description;
          } else if (node.data.label === 'LLM Agent' && node.data.llmAgentConfig?.description) {
            displayDescription = node.data.llmAgentConfig.description;
          }

          const isOutput = edges.some(edge => edge.source === nodeId && edge.target === node.id);
          
          return (
            <div key={index} className="relative">
              {/* Connection flow indicator for sequential */}
              {agentType === 'sequential' && index > 0 && (
                <div className="absolute -top-2 left-4 flex items-center">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
              <div className="p-4 border rounded-lg bg-background shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-2 w-2 rounded-full ${
                        isOutput ? "bg-blue-500" : "bg-green-500"
                      }`}></div>
                      <h4 className="text-sm font-medium">
                        {displayName}
                      </h4>
                      {displayName !== node.data.label && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {node.data.label}
                        </span>
                      )}
                    </div>
                    
                    {displayDescription && (
                      <p className="text-xs text-muted-foreground mb-2 break-words">
                        {displayDescription}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {isOutput ? "Output to this agent" : "Input from this agent"}
                      </span>
                      {agentType === 'sequential' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Step {index + 1}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {agentType === 'parallel' && (
                    <div className="ml-2">
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Parallel
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const modalTitle = agentType === 'sequential' ? 'Sequential Agent' : 'Parallel Agent';
  const modalDescription = agentType === 'sequential' 
    ? 'Configure your sequential agent that executes connected agents one after another'
    : 'Configure your parallel agent that executes connected agents simultaneously';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            {modalTitle} Configuration
          </DialogTitle>
          <DialogDescription>
            {modalDescription}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-2"> 
          <Tabs defaultValue="config" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="connections">Connected Agents ({connectedNodes.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="config" className="space-y-4 overflow-y-auto flex-grow">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`Enter ${agentType} agent name`}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Describe what this ${agentType} agent does...`}
                    rows={4}
                  />
                </div>

                {/* Info section about the agent type */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2">
                    {agentType === 'sequential' ? 'Sequential Execution' : 'Parallel Execution'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {agentType === 'sequential' 
                      ? 'This agent will execute connected agents one after another in sequence. Each agent waits for the previous one to complete before starting.'
                      : 'This agent will execute all connected agents simultaneously. All agents start at the same time and run in parallel.'
                    }
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="connections" className="space-y-4 overflow-y-auto flex-grow">
              {renderConnectedNodes()}
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 