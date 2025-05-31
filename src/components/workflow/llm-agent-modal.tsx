'use client';

import { useState, useEffect, useRef } from 'react';
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
import { NodeData } from '@/lib/store/workflow';
import { llmProviderConfigs } from './llm-provider-configs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, EyeOff, ChevronsUpDown, SearchIcon, Check, ChevronDown, ChevronUp } from "lucide-react";
import { getApiKeys, createApiKey } from "@/lib/api-keys";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkflowStore } from '@/lib/store/workflow';
import { Edge, Node } from 'reactflow';

function getAllModelsForProvider(provider: string) {
  const providerConfig = llmProviderConfigs[provider];
  if (!providerConfig) return [];
  return providerConfig.models.map(model => ({
    value: model.value,
    label: model.label,
    provider: providerConfig.displayName
  }));
}

interface LlmAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string; 
  nodeData: {
    name?: string;
    model?: string;
    description?: string;
    instructions?: string;
    apiKeyId?: string;
    provider?: string; 
  } | undefined;
  onSave: (configData: { 
    name: string; 
    model: string;
    description: string;
    instructions: string;
    apiKeyId: string;
    provider: string; 
  }) => void;
}

export function LlmAgentModal({ 
  isOpen, 
  onClose, 
  nodeId, 
  nodeData, 
  onSave,
}: LlmAgentModalProps) {
  // Get workflow state to check connections
  const { nodes, edges } = useWorkflowStore();

  // Check if this LLM Agent is connected to a Multi Agent
  const isConnectedToMultiAgent = edges.some(edge => {
    const targetNode = nodes.find(n => n.id === edge.target);
    return (edge.source === nodeId && targetNode?.data.label === 'Multi Agent (BaseAgent)') ||
           (edge.target === nodeId && nodes.find(n => n.id === edge.source)?.data.label === 'Multi Agent (BaseAgent)');
  });

  // Log nodeData when modal opens for debugging
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened with nodeData:", nodeData);
    }
  }, [isOpen, nodeData]);

  const [name, setName] = useState(nodeData?.name || '');
  const [currentModel, setCurrentModel] = useState(nodeData?.model || '');
  const [description, setDescription] = useState(nodeData?.description || '');
  const [instructions, setInstructions] = useState(nodeData?.instructions || '');
  const [currentProvider, setCurrentProvider] = useState(nodeData?.provider || '');
  
  const [availableApiKeys, setAvailableApiKeys] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState(nodeData?.apiKeyId || "");
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isModelConfigOpen, setIsModelConfigOpen] = useState(true);

  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);

  const providerConfig = llmProviderConfigs[currentProvider];
  const modelsForCurrentProvider = getAllModelsForProvider(currentProvider);

  const getServiceNameForProvider = (p: string): string => {
    const serviceMap: Record<string, string> = {
      'openai': 'OpenAI',
      'gemini': 'Google Gemini',
      'anthropic': 'Anthropic',
      'deepseek': 'Deepseek'
    };
    return serviceMap[p] || p;
  };

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

  // Main effect for loading/re-loading data from nodeData
  useEffect(() => {
    if (isOpen) {
      console.log("Modal (re)opened or nodeData changed. Initializing with nodeData:", nodeData);

      const initialName = nodeData?.name || '';
      const initialProvider = nodeData?.provider || '';
      const initialModel = nodeData?.model || '';
      const initialDescription = nodeData?.description || '';
      const initialInstructions = nodeData?.instructions || '';
      const initialApiKeyId = nodeData?.apiKeyId || '';

      setName(initialName);
      setDescription(initialDescription);
      setInstructions(initialInstructions);
      
      // Set provider state. This might trigger the second useEffect if the provider changes.
      setCurrentProvider(initialProvider);
      
      // Set API key ID directly from nodeData if available.
      // fetchApiKeys (called below or by second effect) will validate and use it.
      setSelectedApiKeyId(initialApiKeyId);

      if (initialProvider) {
        // Fetch API keys for the provider.
        // fetchApiKeys will use initialApiKeyId if it's valid for this provider, or select the first/none.
        fetchApiKeys(initialProvider, initialApiKeyId);

        // Determine the model to set.
        // Use model from nodeData if it's valid for the provider, otherwise use provider's default.
        const providerModels = getAllModelsForProvider(initialProvider);
        const modelExistsInProviderList = providerModels.some(m => m.value === initialModel);

        if (initialModel && modelExistsInProviderList) {
          setCurrentModel(initialModel);
        } else {
          // If saved model is not in list (or no model saved), set to provider's default.
          setCurrentModel(llmProviderConfigs[initialProvider]?.defaultModel || '');
        }
      } else {
        // No provider, so reset API key, available keys, and model fields
        setAvailableApiKeys([]);
        setSelectedApiKeyId('');
        setCurrentModel('');
      }

      // Collapse model config if a model is already set
      setIsModelConfigOpen(!initialModel);
    } else {
      // Modal is closing
      setModelPopoverOpen(false);
    }
  }, [isOpen, nodeData]); // Key dependencies: isOpen, nodeData

  // Effect for when the user MANUALLY changes the provider in the dropdown
  useEffect(() => {
    if (isOpen && currentProvider) {
      // This condition checks if the currentProvider is different from what was loaded from nodeData.
      // This signifies a manual change by the user.
      const providerFromNode = nodeData?.provider || '';
      if (providerFromNode !== currentProvider) {
        console.log(`Provider manually changed to: ${currentProvider}. Resetting API key and model.`);
        // Fetch API keys for the NEWLY selected provider.
        // fetchApiKeys will typically select the first key if no preferred one is passed or valid.
        fetchApiKeys(currentProvider); // This will also update selectedApiKeyId via its internal logic
        // Set to default model for the NEWLY selected provider
        setCurrentModel(llmProviderConfigs[currentProvider]?.defaultModel || '');
      }
      // If providerFromNode === currentProvider, the main useEffect (above) has already handled
      // loading the specific apiKeyId and model from nodeData. No action needed here for that case.
    }
    // Do not add nodeData to dependencies here to avoid potential infinite loops with the first effect.
    // This effect reacts to changes in `currentProvider` (usually from user interaction) while modal is open.
  }, [currentProvider, isOpen]); // Dependencies: currentProvider, isOpen

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error("All fields are required"); return;
    }
    setIsSubmittingKey(true);
    try {
      const serviceName = getServiceNameForProvider(currentProvider);
      const newKey = await createApiKey(newKeyName.trim(), serviceName, newKeyValue.trim());
      toast.success("API key added successfully");
      setNewKeyName(''); setNewKeyValue(''); setShowKey(false); setIsAddKeyDialogOpen(false);
      // Fetch keys for the current provider and try to select the new one
      await fetchApiKeys(currentProvider, newKey?.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to add API key");
    } finally {
      setIsSubmittingKey(false);
    }
  };

  const handleSave = () => {
    if (!name) {
      toast.error('LLM Agent name is required.'); return;
    }
    if (currentProvider && !selectedApiKeyId) {
      toast.error(`Please select or add an API key for ${llmProviderConfigs[currentProvider].displayName}.`); return;
    }
    if (currentProvider && !currentModel) {
      toast.error(`Please select a model for ${llmProviderConfigs[currentProvider].displayName}.`); return;
    }

    // Instructions will directly be the system prompt if provided
    const finalOptions: Array<{key: string, value: string}> = [];
    if (instructions && instructions.trim() !== '') {
        finalOptions.push({ key: 'system-prompt', value: instructions });
    }

    onSave({
      name,
      model: currentModel,
      description,
      instructions, // Save the direct instructions
      apiKeyId: selectedApiKeyId,
      provider: currentProvider
    });
    onClose(); 
  };

  if (!isOpen) return null;
  
  // Only show configuration error if a provider is selected but not configured
  const currentProviderConfig = currentProvider ? llmProviderConfigs[currentProvider] : null;
  if (currentProvider && !currentProviderConfig) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configuration Error</DialogTitle><DialogDescription>Provider configuration missing for: {currentProvider}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) { onClose(); setModelPopoverOpen(false); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              LLM Agent Configuration
            </DialogTitle>
            <DialogDescription>Configure your LLM Agent settings.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 overflow-y-auto flex-grow pr-2">
            <div className="grid gap-2">
              <Label htmlFor="llm-agent-name">Agent Name *</Label>
              <Input id="llm-agent-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter agent name" />
            </div>

            {/* Model Configuration Section - Hidden when connected to Multi Agent */}
            {!isConnectedToMultiAgent && (
              <div className="border rounded-md">
                <button 
                  type="button"
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                  onClick={() => setIsModelConfigOpen(!isModelConfigOpen)}
                  aria-expanded={isModelConfigOpen}
                >
                  <Label className="font-medium cursor-pointer">Model Configuration</Label>
                  {isModelConfigOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isModelConfigOpen && (
                  <div className="p-4 border-t space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="llm-agent-provider">Provider *</Label>
                        <Select value={currentProvider} onValueChange={setCurrentProvider}>
                            <SelectTrigger><SelectValue placeholder="Select LLM Provider" /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(llmProviderConfigs).map(providerKey => (
                                    <SelectItem key={providerKey} value={providerKey}>
                                        {llmProviderConfigs[providerKey].displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                      <Label htmlFor="api-key">API Key *</Label>
                      <div className="flex gap-2 mt-1">
                        {isLoadingKeys ? (
                          <div className="flex-1 h-10 flex items-center justify-center rounded-md border border-input animate-pulse"><span className="text-sm text-muted-foreground">Loading keys...</span></div>
                        ) : (
                          <>
                            <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId} disabled={!currentProvider}>
                              <SelectTrigger className="w-full"><SelectValue placeholder={currentProvider ? `Select ${currentProviderConfig?.displayName} API key` : "Select a provider first"} /></SelectTrigger>
                              <SelectContent>
                                {availableApiKeys.length > 0 ? 
                                  availableApiKeys.map((key) => <SelectItem key={key.id} value={key.id}>{key.name}</SelectItem>) :
                                  <div className="p-2 text-sm text-muted-foreground">No keys for this provider. Click + to add.</div>}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={() => setIsAddKeyDialogOpen(true)} title="Add New API Key" disabled={!currentProvider}><Plus className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="llm-agent-model">Model *</Label>
                      <Select value={currentModel} onValueChange={setCurrentModel} disabled={!currentProvider}>
                        <SelectTrigger><SelectValue placeholder="Select model..." /></SelectTrigger>
                        <SelectContent>
                          {modelsForCurrentProvider.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No models available for this provider.</div>
                          ) : (
                            modelsForCurrentProvider.map((item) => (
                              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Description field - Hidden when connected to Multi Agent */}
            {!isConnectedToMultiAgent && (
              <div className="grid gap-2">
                <Label htmlFor="llm-agent-description">Description</Label>
                <Textarea id="llm-agent-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this LLM agent does" rows={2}/>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="llm-agent-instructions">Instructions (System Prompt)</Label>
              <Textarea id="llm-agent-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Provide detailed instructions for the agent..." rows={4}/>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { onClose(); setModelPopoverOpen(false); }}>Cancel</Button>
            <Button onClick={handleSave}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Key Dialog */}
      <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New {getServiceNameForProvider(currentProvider)} Key</DialogTitle>
            <DialogDescription>Add a new API key to be securely stored. Only you will be able to view this key.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddKey}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-key-name" className="text-right">Name</Label>
                <Input id="new-key-name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className="col-span-3" placeholder={`My ${getServiceNameForProvider(currentProvider)} Key`} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-key-value" className="text-right">API Key</Label>
                <div className="col-span-3 relative">
                  <Input id="new-key-value" type={showKey ? "text" : "password"} value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} className="pr-9" placeholder="Enter your API key" required />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddKeyDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingKey}>{isSubmittingKey ? "Saving..." : "Save Key"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 