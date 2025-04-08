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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, AlertCircle, ExternalLink, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { llmProviderConfigs } from './llm-provider-configs';
import { getApiKeys, createApiKey, getApiKeyWithValue } from "@/lib/api-keys";

interface LlmNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string;
  nodeData?: any;
  onSave?: (data: any) => void;
}

export function LlmNodeModal({ isOpen, onClose, provider, nodeData, onSave }: LlmNodeModalProps) {
  const [activeTab, setActiveTab] = useState("parameters");
  const [availableApiKeys, setAvailableApiKeys] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [options, setOptions] = useState<Array<{ key: string; value: string }>>([]);
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  
  // Add state for advanced settings
  const [advancedSettings, setAdvancedSettings] = useState<Record<string, string>>({
    temperature: "0.7",
    "max-tokens": "1024",
    "system-prompt": "",
    "max-output-tokens": "1024",
    "max-length": "1024"
  });
  
  // Get provider config
  const providerConfig = llmProviderConfigs[provider];
  
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
  
  // Initialize with default values or node data
  useEffect(() => {
    // Only run when the modal is opened
    if (isOpen) {
      // Get the saved API key ID if it exists
      const savedApiKeyId = nodeData?.apiKeyId || "";
      
      console.log(`Modal opened for provider ${provider}:`, {
        nodeData,
        savedApiKeyId
      });
      
      // First store all node data values
      if (nodeData) {
        setSelectedModel(nodeData.model || providerConfig?.defaultModel || "");
        setOptions(nodeData.options || []);
        
        // Extract advanced settings from options
        const savedAdvancedSettings = {...advancedSettings};
        if (nodeData.options && nodeData.options.length > 0) {
          nodeData.options.forEach((option: {key: string, value: string}) => {
            if (savedAdvancedSettings.hasOwnProperty(option.key)) {
              savedAdvancedSettings[option.key] = option.value;
            }
          });
        }
        setAdvancedSettings(savedAdvancedSettings);
      } else {
        setSelectedModel(providerConfig?.defaultModel || "");
        setOptions([]);
      }
      
      // Then load API keys with the saved API key ID
      setIsLoadingKeys(true);
      getApiKeys()
        .then(keys => {
          const serviceName = getServiceNameForProvider(provider);
          console.log(`Filtering keys for service: ${serviceName}`, keys);
          // Check if we have any keys with this service name
          const keyWithServiceCount = keys.filter(key => key.service === serviceName).length;
          if (keyWithServiceCount === 0) {
            console.warn(`No API keys found for service "${serviceName}". Check if your key has the correct service name.`);
          }
          
          const providerKeys = keys.filter(key => key.service === serviceName);
          setAvailableApiKeys(providerKeys.map(key => ({ id: key.id, name: key.name })));
          
          // Set saved key ID if provided and matches a valid key
          if (savedApiKeyId && providerKeys.some(key => key.id === savedApiKeyId)) {
            console.log(`Using saved API key ID: ${savedApiKeyId}`);
            setSelectedApiKeyId(savedApiKeyId);
          } else if (providerKeys.length > 0) {
            // Otherwise use first available key
            console.log(`Selected first available key: ${providerKeys[0].id}`);
            setSelectedApiKeyId(providerKeys[0].id);
          } else {
            console.warn(`No valid API keys found for ${serviceName}.`);
            setSelectedApiKeyId("");
          }
        })
        .catch(error => {
          console.error("Error fetching API keys:", error);
          toast.error("Failed to load API keys");
        })
        .finally(() => {
          setIsLoadingKeys(false);
        });
    }
  }, [nodeData, provider, providerConfig, isOpen]);
  
  // Simple function to refresh API keys
  const fetchApiKeys = async () => {
    const savedApiKeyId = selectedApiKeyId;
    
    setIsLoadingKeys(true);
    try {
      const keys = await getApiKeys();
      const serviceName = getServiceNameForProvider(provider);
      const providerKeys = keys.filter(key => key.service === serviceName);
      setAvailableApiKeys(providerKeys.map(key => ({ id: key.id, name: key.name })));
      
      // Try to keep the same selection if it still exists
      if (savedApiKeyId && providerKeys.some(key => key.id === savedApiKeyId)) {
        setSelectedApiKeyId(savedApiKeyId);
      } else if (providerKeys.length > 0) {
        setSelectedApiKeyId(providerKeys[0].id);
      }
    } catch (error: any) {
      console.error("Error refreshing API keys:", error);
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
    
    setIsSubmitting(true);
    
    try {
      const serviceName = getServiceNameForProvider(provider);
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
      await fetchApiKeys();
      if (newKey?.id) {
        setSelectedApiKeyId(newKey.id);
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to add API key");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle adding a new option
  const handleAddOption = () => {
    setOptions([...options, { key: "", value: "" }]);
  };
  
  // Handle option change
  const handleOptionChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index][field] = value;
    setOptions(updatedOptions);
  };
  
  // Handle option removal
  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    setOptions(updatedOptions);
  };
  
  // Handle save
  const handleSave = () => {
    // Log detailed information
    console.log(`Saving ${provider} configuration:`, {
      provider,
      apiKeyId: selectedApiKeyId,
      model: selectedModel,
      optionsCount: options.filter(option => option.key && option.value).length,
      advancedSettings
    });
    
    if (!selectedApiKeyId) {
      toast.error(`Please select or add a ${getServiceNameForProvider(provider)} API key to continue.`);
      return;
    }

    // Combine regular options with advanced settings
    const allOptions = [...options.filter(option => option.key && option.value)];
    
    // Add advanced settings to options
    Object.entries(advancedSettings).forEach(([key, value]) => {
      if (value) {
        // Check if this setting already exists in options
        const existingIndex = allOptions.findIndex(opt => opt.key === key);
        if (existingIndex >= 0) {
          // Create a new object instead of modifying the existing one
          allOptions[existingIndex] = { ...allOptions[existingIndex], value };
        } else {
          allOptions.push({ key, value });
        }
      }
    });
    
    const data = {
      provider,
      apiKeyId: selectedApiKeyId,
      model: selectedModel,
      options: allOptions
    };
    
    if (onSave) {
      onSave(data);
      
      // Apply manual workflow save for all providers to ensure changes propagate
      // Wait a short time to ensure the node data is updated
      setTimeout(() => {
        // Try to find the save button in the workflow canvas and click it
        const saveBtn = document.querySelector('button:has(.lucide-save)');
        if (saveBtn) {
          console.log(`Triggering manual workflow save for ${provider}`);
          (saveBtn as HTMLButtonElement).click();
        }
      }, 500);
    }
    
    toast.success(`${providerConfig?.displayName} configuration saved`);
    onClose();
  };
  
  if (!providerConfig) {
    return null;
  }
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              {providerConfig.displayName}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="parameters" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="docs">Docs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="parameters" className="space-y-6">
              <div className="space-y-4">
                {/* API Key Selector */}
                <div>
                  <Label htmlFor="credential" className="mb-2 block">API Key</Label>
                  <div className="flex gap-2">
                    {isLoadingKeys ? (
                      <div className="flex-1 h-10 flex items-center justify-center rounded-md border border-input animate-pulse">
                        <span className="text-sm text-muted-foreground">Loading keys...</span>
                      </div>
                    ) : (
                      <>
                        <Select 
                          key={`api-key-select-${selectedApiKeyId}`}
                          value={selectedApiKeyId} 
                          onValueChange={(value) => {
                            console.log('API key selection changed:', value);
                            setSelectedApiKeyId(value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select API key" />
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
                                No API keys found for {providerConfig.displayName}. 
                                Please click the + button to add a new key.
                              </div>
                            )}
                          </SelectContent>
                        </Select>

                        {availableApiKeys.length === 0 ? (
                          <Button 
                            variant="default" 
                            onClick={() => setIsAddKeyDialogOpen(true)}
                            title="Add New API Key"
                            className="whitespace-nowrap"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Key
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setIsAddKeyDialogOpen(true)}
                            title="Add New API Key"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Model Selector */}
                <div>
                  <Label htmlFor="model" className="mb-2 block">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerConfig.models.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Options */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Options</Label>
                  </div>
                  
                  {options.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">No properties</div>
                  ) : (
                    <div className="space-y-2 h-[120px] overflow-y-auto pr-2 pb-2 border rounded-md p-2">
                      {options.map((option, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input 
                            placeholder="Key"
                            value={option.key}
                            onChange={(e) => handleOptionChange(index, 'key', e.target.value)}
                            className="flex-1"
                          />
                          <Input 
                            placeholder="Value"
                            value={option.value}
                            onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={handleAddOption}
                  >
                    Add Option
                  </Button>
                </div>
                
                {/* <div className="p-3 bg-muted rounded-md border text-sm flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    {providerConfig.helpText}
                  </p>
                </div> */}
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-4">
                {/* Advanced settings for the LLM */}
                <div className="max-h-[400px] overflow-y-auto pr-2 pb-2">
                  {providerConfig.advancedSettings?.map((setting, index) => (
                    <div key={index} className="mb-4">
                      <Label htmlFor={setting.id} className="mb-2 block">{setting.label}</Label>
                      {setting.type === 'select' ? (
                        <Select 
                          value={advancedSettings[setting.id] || ''}
                          onValueChange={(value) => {
                            setAdvancedSettings({
                              ...advancedSettings,
                              [setting.id]: value
                            });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Select ${setting.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {setting.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : setting.id === 'system-prompt' ? (
                        <Textarea 
                          id={setting.id}
                          placeholder={setting.placeholder}
                          value={advancedSettings[setting.id] || ''}
                          onChange={(e) => {
                            setAdvancedSettings({
                              ...advancedSettings,
                              [setting.id]: e.target.value
                            });
                          }}
                          className="min-h-[120px] resize-y"
                        />
                      ) : (
                        <Input 
                          id={setting.id}
                          type={setting.type} 
                          placeholder={setting.placeholder}
                          value={advancedSettings[setting.id] || ''}
                          onChange={(e) => {
                            setAdvancedSettings({
                              ...advancedSettings,
                              [setting.id]: e.target.value
                            });
                          }}
                        />
                      )}
                      {setting.id === 'system-prompt' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Instructions that guide the model's behavior
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="docs" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{providerConfig.displayName} Documentation</h3>
                <p className="text-muted-foreground">
                  {providerConfig.documentation.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Usage</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {providerConfig.documentation.usagePoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center space-x-2 text-foreground hover:text-foreground/80 mt-4">
                  <ExternalLink className="h-4 w-4" />
                  <a href={providerConfig.documentation.url} target="_blank" rel="noreferrer" className="text-sm">
                    View full documentation
                  </a>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!selectedApiKeyId}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding a new API key */}
      <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New {getServiceNameForProvider(provider)} Key</DialogTitle>
            <DialogDescription>
              Add a new API key to be securely stored. Only you will be able to view this key.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddKey}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="col-span-3"
                  placeholder={`My ${getServiceNameForProvider(provider)} Key`}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="key" className="text-right">
                  API Key
                </Label>
                <div className="col-span-3 relative">
                  <Input
                    id="key"
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 