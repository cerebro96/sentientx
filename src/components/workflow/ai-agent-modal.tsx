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

// Helper function to get nodes connected to the main input/output handles
const getMainConnectedNodes = (
  nodeId: string,
  nodes: Node<NodeData>[],
  edges: Edge[],
  isOutput: boolean = false
): Node<NodeData>[] => {
  // For main output connections (nodes this agent connects to)
  if (isOutput) {
    const outgoingEdges = edges.filter(edge => 
      edge.source === nodeId && 
      (!edge.sourceHandle || edge.sourceHandle === 'output-right')
    );
    const targetNodeIds = outgoingEdges.map(edge => edge.target);
    return nodes.filter(node => targetNodeIds.includes(node.id));
  } 
  // For main input connections (nodes that connect to this agent)
  else {
    const incomingEdges = edges.filter(edge => 
      edge.target === nodeId && 
      (!edge.targetHandle || edge.targetHandle === 'input-left')
    );
    const sourceNodeIds = incomingEdges.map(edge => edge.source);
    return nodes.filter(node => sourceNodeIds.includes(node.id));
  }
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
  
  // Get main connected nodes
  const inputNodes = getMainConnectedNodes(nodeId, nodes, edges, false);
  const outputNodes = getMainConnectedNodes(nodeId, nodes, edges, true);

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
          <TabsList className="grid grid-cols-6 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="llm">LLM {getConnectionStatusIcon(connectedLLMs)}</TabsTrigger>
            {/* <TabsTrigger value="memory">Memory {getConnectionStatusIcon(connectedMemory)}</TabsTrigger>
            <TabsTrigger value="tools">Tools {getConnectionStatusIcon(connectedTools)}</TabsTrigger>
            <TabsTrigger value="parser">Parser {getConnectionStatusIcon(connectedParsers)}</TabsTrigger> */}
            <TabsTrigger value="connections">Connections</TabsTrigger>
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
                {/* <div className="flex items-center">
                  <Database className="h-5 w-5 mr-2 text-purple-500" />
                  <div>
                    <div className="text-sm font-medium">Memory</div>
                    <div className="text-xs text-muted-foreground">{connectedMemory.length} connected</div>
                  </div>
                </div> */}
                {/* <div className="flex items-center">
                  <Wrench className="h-5 w-5 mr-2 text-yellow-500" />
                  <div>
                    <div className="text-sm font-medium">Tools</div>
                    <div className="text-xs text-muted-foreground">{connectedTools.length} connected</div>
                  </div>
                </div> */}
                {/* <div className="flex items-center">
                  <FileCode className="h-5 w-5 mr-2 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Parser</div>
                    <div className="text-xs text-muted-foreground">{connectedParsers.length} connected</div>
                  </div>
                </div> */}
              </div>
            </div>
            
            {/* <div className="p-4 border rounded-md"> */}
              {/* <h3 className="font-medium mb-3">Main Connections</h3> */}
              {/* <div className="space-y-3"> */}
                {/* <div>
                  <h4 className="text-sm font-medium mb-2">Input Connections <span className="text-xs font-normal text-muted-foreground">({inputNodes.length})</span></h4>
                  {inputNodes.length === 0 ? (
                    <div className="p-2 bg-muted rounded-md text-xs text-muted-foreground">
                      No nodes connected to input
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inputNodes.map((node, index) => (
                        <div key={index} className="p-2 border rounded-md flex items-center">
                          <div className="font-medium text-sm">{node.data.label}</div>
                          {node.data.description && (
                            <div className="text-xs text-muted-foreground ml-2">
                              ({node.data.description})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div> */}
                
                {/* <div>
                  <h4 className="text-sm font-medium mb-2">Output Connections <span className="text-xs font-normal text-muted-foreground">({outputNodes.length})</span></h4>
                  {outputNodes.length === 0 ? (
                    <div className="p-2 bg-muted rounded-md text-xs text-muted-foreground">
                      No nodes connected to output
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {outputNodes.map((node, index) => (
                        <div key={index} className="p-2 border rounded-md flex items-center">
                          <div className="font-medium text-sm">{node.data.label}</div>
                          {node.data.description && (
                            <div className="text-xs text-muted-foreground ml-2">
                              ({node.data.description})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div> */}
              {/* </div> */}
            {/* </div> */}
            
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
          
          {/* <TabsContent value="memory" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Memory</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Memory components allow your agent to retain context across interactions
              </p>
              
              {renderConnectedNodeDetails(connectedMemory, 'Memory')}
            </div>
          </TabsContent> */}
          
          {/* <TabsContent value="tools" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Tools</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tools give your agent the ability to perform actions
              </p>
              
              {renderConnectedNodeDetails(connectedTools, 'Tools')}
            </div>
          </TabsContent> */}
          
          {/* <TabsContent value="parser" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Parser</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Parsers help convert and interpret data between components
              </p>
              
              {renderConnectedNodeDetails(connectedParsers, 'Parser')}
            </div>
          </TabsContent> */}
          
          <TabsContent value="connections" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Main Workflow Connections</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  See what nodes are connected to and from this AI Agent in the main workflow
                </p>
                
                <div className="space-y-6">
                  {/* Input Connections */}
                  <div className="space-y-3">
                    <h4 className="text-md font-medium flex items-center">
                      <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                      Incoming Connections ({inputNodes.length})
                    </h4>
                    
                    {inputNodes.length === 0 ? (
                      <div className="p-4 border rounded-md text-sm text-muted-foreground bg-muted/30">
                        <p>No nodes are sending data to this AI Agent.</p>
                        <p className="text-xs mt-1">
                          Connect nodes to the left side of this Agent to provide input data.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {inputNodes.map((node, index) => (
                          <div key={index} className="p-3 border rounded-md">
                            <div className="flex justify-between items-center">
                              <h5 className="font-medium">{node.data.label}</h5>
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Input
                              </div>
                            </div>
                            {node.data.description && (
                              <p className="text-sm text-muted-foreground mt-1">{node.data.description}</p>
                            )}
                            {/* Show node-specific information */}
                            {node.data.type && (
                              <p className="text-xs text-muted-foreground mt-2">Type: {node.data.type}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Output Connections */}
                  <div className="space-y-3">
                    <h4 className="text-md font-medium flex items-center">
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      Outgoing Connections ({outputNodes.length})
                    </h4>
                    
                    {outputNodes.length === 0 ? (
                      <div className="p-4 border rounded-md text-sm text-muted-foreground bg-muted/30">
                        <p>This AI Agent is not connected to any output nodes.</p>
                        <p className="text-xs mt-1">
                          Connect nodes to the right side of this Agent to process its output.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {outputNodes.map((node, index) => (
                          <div key={index} className="p-3 border rounded-md">
                            <div className="flex justify-between items-center">
                              <h5 className="font-medium">{node.data.label}</h5>
                              <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                Output
                              </div>
                            </div>
                            {node.data.description && (
                              <p className="text-sm text-muted-foreground mt-1">{node.data.description}</p>
                            )}
                            {/* Show node-specific information */}
                            {node.data.type && (
                              <p className="text-xs text-muted-foreground mt-2">Type: {node.data.type}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* <div className="p-4 border rounded-md bg-muted/30">
                <h4 className="font-medium mb-2">Connection Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Connect Chat Triggers to inputs for user-initiated workflows</li>
                  <li>• Connect Webhook nodes for API-based automation</li>
                  <li>• Use HTTP Request nodes to fetch external data</li>
                  <li>• Connect Transform Data nodes to format responses</li>
                </ul>
              </div> */}
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