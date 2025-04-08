'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Database, Wrench, FileCode } from "lucide-react";
import { useWorkflowStore } from '@/lib/store/workflow';
import { toast } from 'sonner';
import { Node, Edge } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';

interface AiAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
}

// Helper function to get connected nodes by type
const getConnectedNodes = (
  nodeId: string, 
  nodes: Node<NodeData>[], 
  edges: Edge[], 
  connectorId: string
): Node<NodeData>[] => {
  // Find edges where the source is the current node's connector and get their targets
  const connectedEdges = edges.filter(edge => 
    edge.source === nodeId && 
    edge.sourceHandle?.startsWith(connectorId)
  );
  
  const connectedNodeIds = connectedEdges.map(edge => edge.target);
  return nodes.filter(node => connectedNodeIds.includes(node.id));
};

export function AiAgentModal({ isOpen, onClose, nodeId }: AiAgentModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { nodes, edges } = useWorkflowStore();
  
  // Find the current node
  const currentNode = nodes.find(node => node.id === nodeId);
  
  // Get connected components
  const connectedLLMs = getConnectedNodes(nodeId, nodes, edges, 'llm');
  const connectedMemory = getConnectedNodes(nodeId, nodes, edges, 'memory');
  const connectedTools = getConnectedNodes(nodeId, nodes, edges, 'tool');
  const connectedParsers = getConnectedNodes(nodeId, nodes, edges, 'parser');

  if (!currentNode) return null;
  
  const renderConnectedNodeDetails = (connectedNodes: Node<NodeData>[], type: string) => {
    if (connectedNodes.length === 0) {
      return (
        <div className="p-3 bg-muted rounded-md text-sm flex items-center">
          <p className="text-muted-foreground">No {type} connected</p>
        </div>
      );
    }
    
    return connectedNodes.map((node, index) => (
      <div key={index} className="p-3 border rounded-md mb-2">
        <h4 className="text-sm font-medium">{node.data.label}</h4>
        {node.data.description && (
          <p className="text-xs text-muted-foreground mt-1">{node.data.description}</p>
        )}
        
        {/* Show specific configuration based on node type */}
        {node.data.llmConfig && (
          <div className="mt-2 text-xs">
            <p className="text-muted-foreground">Model: {node.data.llmConfig.model}</p>
            <p className="text-muted-foreground">Provider: {node.data.llmConfig.provider}</p>
          </div>
        )}
        
        {node.data.memoryConfig && (
          <div className="mt-2 text-xs">
            <p className="text-muted-foreground">
              Context Window: {node.data.memoryConfig.contextWindowLength} messages
            </p>
            <p className="text-muted-foreground">
              TTL: {node.data.memoryConfig.sessionTTL || "No expiration"}
            </p>
          </div>
        )}
      </div>
    ));
  };
  
  const getConnectionStatusIcon = (nodes: Node<NodeData>[]) => {
    if (nodes.length > 0) {
      return <div className="h-2 w-2 bg-green-500 rounded-full"></div>;
    }
    return <div className="h-2 w-2 bg-gray-300 rounded-full"></div>;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            AI Agent Configuration
          </DialogTitle>
          <DialogDescription>
            View and manage the components connected to this AI Agent
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="llm">LLM {getConnectionStatusIcon(connectedLLMs)}</TabsTrigger>
            <TabsTrigger value="memory">Memory {getConnectionStatusIcon(connectedMemory)}</TabsTrigger>
            <TabsTrigger value="tools">Tools {getConnectionStatusIcon(connectedTools)}</TabsTrigger>
            <TabsTrigger value="parser">Parser {getConnectionStatusIcon(connectedParsers)}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-2">Connected Components</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <BrainCircuit className="h-5 w-5 mr-2 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">LLM Models</div>
                    <div className="text-xs text-muted-foreground">{connectedLLMs.length} connected</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Database className="h-5 w-5 mr-2 text-purple-500" />
                  <div>
                    <div className="text-sm font-medium">Memory</div>
                    <div className="text-xs text-muted-foreground">{connectedMemory.length} connected</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Wrench className="h-5 w-5 mr-2 text-yellow-500" />
                  <div>
                    <div className="text-sm font-medium">Tools</div>
                    <div className="text-xs text-muted-foreground">{connectedTools.length} connected</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <FileCode className="h-5 w-5 mr-2 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Parser</div>
                    <div className="text-xs text-muted-foreground">{connectedParsers.length} connected</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-md bg-muted/50">
              <h3 className="font-medium mb-2">Agent Configuration</h3>
              <p className="text-sm text-muted-foreground">
                The AI Agent integrates the LLM, Memory, Tools, and Parser to create an intelligent 
                automated system. Connect components to each port to define the agent's capabilities.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="llm" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">LLM Models</h3>
              <p className="text-sm text-muted-foreground mb-4">
                LLM models provide the intelligence for your AI Agent
              </p>
              
              {renderConnectedNodeDetails(connectedLLMs, 'LLM')}
            </div>
          </TabsContent>
          
          <TabsContent value="memory" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Memory</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Memory components allow your agent to retain context across interactions
              </p>
              
              {renderConnectedNodeDetails(connectedMemory, 'Memory')}
            </div>
          </TabsContent>
          
          <TabsContent value="tools" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Tools</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tools give your agent the ability to perform actions
              </p>
              
              {renderConnectedNodeDetails(connectedTools, 'Tools')}
            </div>
          </TabsContent>
          
          <TabsContent value="parser" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Parser</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Parsers help convert and interpret data between components
              </p>
              
              {renderConnectedNodeDetails(connectedParsers, 'Parser')}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 