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
import { Check, ChevronsUpDown, Plus, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiKeys, createApiKey } from "@/lib/api-keys";

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
    provider?: string;
    apiKeyId?: string;
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
    provider: string;
    apiKeyId: string;
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
  const [currentProvider, setCurrentProvider] = useState('');
  const [availableApiKeys, setAvailableApiKeys] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState('');
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);
  
  // Get nodes and edges from workflow store
  const { nodes, edges } = useWorkflowStore();
  
  // Filter connected nodes
  const connectedNodes = getConnectedNodes(nodeId, nodes, edges);

  // Map provider names to service names used in credentials
  const getServiceNameForProvider = (provider: string): string => {
    const serviceMap: Record<string, string> = {
      'openai': 'OpenAI',
      'gemini': 'Google Gemini',
      'anthropic': 'Anthropic',
      'deepseek': 'Deepseek'
    };
    return serviceMap[provider] || provider;
  };

  // Fetch API keys for the selected provider
  const fetchApiKeys = async (providerToFetch: string, preferredApiKeyId?: string) => {
    setIsLoadingKeys(true);
    try {
      const keys = await getApiKeys();
      const serviceName = getServiceNameForProvider(providerToFetch);
      const providerKeys = keys.filter(key => key.service === serviceName);
      setAvailableApiKeys(providerKeys.map(key => ({ id: key.id, name: key.name })));
      
      if (preferredApiKeyId && providerKeys.some(key => key.id === preferredApiKeyId)) {
        setSelectedApiKeyId(preferredApiKeyId);
      } else if (providerKeys.length > 0) {
        setSelectedApiKeyId(providerKeys[0].id);
      } else {
        setSelectedApiKeyId("");
      }
    } catch (error) {
      toast.error("Failed to load API keys for " + providerToFetch);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // Handle adding a new API key
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error("All fields are required");
      return;
    }
    
    setIsSubmittingKey(true);
    
    try {
      const serviceName = getServiceNameForProvider(currentProvider);
      const newKey = await createApiKey(
        newKeyName.trim(),
        serviceName,
        newKeyValue.trim()
      );
      
      toast.success("API key added successfully");
      
      // Reset form
      setNewKeyName('');
      setNewKeyValue('');
      setShowKey(false);
      setIsAddKeyDialogOpen(false);
      
      // Refresh the API keys list and select the new key
      await fetchApiKeys(currentProvider, newKey?.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to add API key");
    } finally {
      setIsSubmittingKey(false);
    }
  };

  useEffect(() => {
    if (isOpen && nodeData) {
      setName(nodeData.name || '');
      setModel(nodeData.model || '');
      setCurrentProvider(nodeData.provider || '');
      setSelectedApiKeyId(nodeData.apiKeyId || '');
      setDescription(nodeData.description || '');
      setInstructions(nodeData.instructions || '');
      
      // If we have provider information, fetch the API keys
      if (nodeData.provider) {
        fetchApiKeys(nodeData.provider, nodeData.apiKeyId);
      }
    }
  }, [isOpen, nodeData]);
  
  // Effect to handle provider changes
  useEffect(() => {
    if (isOpen && currentProvider) {
      fetchApiKeys(currentProvider, nodeData?.provider === currentProvider ? nodeData.apiKeyId : undefined);
      
      // Reset the model when provider changes
      if (nodeData?.provider !== currentProvider) {
        setModel('');
      }
    }
  }, [currentProvider, isOpen]);

  const handleSave = () => {
    if (!name) {
      toast.error('Agent name is required.');
      return;
    }

    if (!currentProvider) {
      toast.error('Please select a provider.');
      return;
    }

    if (!selectedApiKeyId) {
      toast.error(`Please select an API key for ${getServiceNameForProvider(currentProvider)}.`);
      return;
    }

    if (!model) {
      toast.error('Please select a model.');
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
      provider: currentProvider,
      apiKeyId: selectedApiKeyId,
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
    
    return connectedNodes.map((node, index) => {
      // Determine the display name: configured name or default label
      let displayName = node.data.label; // Default to original label
      if (node.data.label === 'Multi Agent (BaseAgent)' && node.data.multiAgentConfig?.name) {
        displayName = node.data.multiAgentConfig.name;
      } else if (node.data.label === 'LLM Agent' && node.data.llmAgentConfig?.name) {
        displayName = node.data.llmAgentConfig.name;
      } // Add more else if blocks here for other agent types with configurable names

      return (
        <div key={index} className="p-3 border rounded-md mb-2">
          <h4 className="text-sm font-medium">
            {displayName} 
            {displayName !== node.data.label && (
              <span className="text-xs text-muted-foreground ml-1">({node.data.label})</span>
            )}
          </h4>
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
      );
    });
  };

  // Get models for the selected provider
  const getModelsForProvider = (provider: string) => {
    const providerConfig = llmProviderConfigs[provider];
    if (!providerConfig) return [];
    return providerConfig.models;
  };

  const modelsForCurrentProvider = currentProvider ? getModelsForProvider(currentProvider) : [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              Multi Agent Configuration
            </DialogTitle>
            <DialogDescription>
              Configure your Multi Agent (BaseAgent) settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto pr-2"> 
            <Tabs defaultValue="config" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-2 mb-4 flex-shrink-0">
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="connections">Agents ({connectedNodes.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="config" className="space-y-4 overflow-y-auto flex-grow">
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
                    <Label htmlFor="provider">Provider *</Label>
                    <Select value={currentProvider} onValueChange={setCurrentProvider}>
                      <SelectTrigger><SelectValue placeholder="Select AI Provider" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(llmProviderConfigs).map(providerKey => (
                          <SelectItem key={providerKey} value={providerKey}>
                            {llmProviderConfigs[providerKey].displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="api-key">API Key *</Label>
                    <div className="flex gap-2">
                      {isLoadingKeys ? (
                        <div className="flex-1 h-10 flex items-center justify-center rounded-md border border-input animate-pulse">
                          <span className="text-sm text-muted-foreground">Loading keys...</span>
                        </div>
                      ) : (
                        <>
                          <Select 
                            value={selectedApiKeyId} 
                            onValueChange={setSelectedApiKeyId} 
                            disabled={!currentProvider}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={currentProvider ? 
                                `Select ${llmProviderConfigs[currentProvider]?.displayName} API key` : 
                                "Select a provider first"} 
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableApiKeys.length > 0 ? (
                                availableApiKeys.map((key) => (
                                  <SelectItem key={key.id} value={key.id}>
                                    {key.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground">
                                  No API keys found. Please click + to add a new key.
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setIsAddKeyDialogOpen(true)} 
                            title="Add New API Key" 
                            disabled={!currentProvider}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="model">Model *</Label>
                    <Select value={model} onValueChange={setModel} disabled={!currentProvider || !selectedApiKeyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {modelsForCurrentProvider.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No models available for this provider.
                          </div>
                        ) : (
                          modelsForCurrentProvider.map((modelOption) => (
                            <SelectItem key={modelOption.value} value={modelOption.value}>
                              {modelOption.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
              
              <TabsContent value="connections" className="space-y-4 overflow-y-auto flex-grow">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Connected Agents</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These agents are connected to your Multi Agent
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
          </div>
          
          <DialogFooter className="mt-auto pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Key Dialog */}
      <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New {getServiceNameForProvider(currentProvider)} Key</DialogTitle>
            <DialogDescription>
              Add a new API key to be securely stored. Only you will be able to view this key.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddKey}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-key-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="new-key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="col-span-3"
                  placeholder={`My ${getServiceNameForProvider(currentProvider)} Key`}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-key-value" className="text-right">
                  API Key
                </Label>
                <div className="col-span-3 relative">
                  <Input
                    id="new-key-value"
                    type={showKey ? "text" : "password"}
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    className="pr-9"
                    placeholder="Enter your API key"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddKeyDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingKey}>
                {isSubmittingKey ? "Saving..." : "Save Key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 