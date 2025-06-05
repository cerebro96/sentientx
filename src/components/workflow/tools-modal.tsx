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
import { toast } from 'sonner';
import { getApiKeys, createApiKey } from "@/lib/api-keys";
import { Plus, Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  toolType: string;
  nodeData?: {
    apiKeyId?: string;
  };
  onSave: (configData: { 
    apiKeyId: string;
  }) => void;
}

const TOOLS_WITH_API_KEYS = ['EXASearchTool', 'hyperbrowser_tool', 'Serper API', 'BraveSearchTool'];

export function ToolsModal({
  isOpen,
  onClose,
  nodeId,
  toolType,
  nodeData,
  onSave
}: ToolsModalProps) {
  const [availableApiKeys, setAvailableApiKeys] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState("");
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const needsApiKey = TOOLS_WITH_API_KEYS.includes(toolType);

  const getServiceNameForTool = (tool: string): string => {
    const serviceMap: Record<string, string> = {
      'EXASearchTool': 'EXA Search',
      'hyperbrowser_tool': 'Hyperbrowser',
      'Serper API': 'Serper',
      'BraveSearchTool': 'Brave Search'
    };
    return serviceMap[tool] || tool;
  };

  const fetchApiKeys = async (preserveSelection: string = "") => {
    if (!needsApiKey) return;
    
    setIsLoadingKeys(true);
    try {
      const keys = await getApiKeys();
      const serviceName = getServiceNameForTool(toolType);
      const toolKeys = keys.filter(key => key.service === serviceName);
      setAvailableApiKeys(toolKeys.map(key => ({ id: key.id, name: key.name })));
      
      console.log("Available keys for", toolType, ":", toolKeys);
      console.log("Preserve selection:", preserveSelection);
      
      // If we have a saved selection and it exists in the keys, use it
      if (preserveSelection && toolKeys.some(key => key.id === preserveSelection)) {
        console.log("✅ Preserving saved selection:", preserveSelection);
        setSelectedApiKeyId(preserveSelection);
      } else if (!preserveSelection && toolKeys.length > 0) {
        // Only set default if no preserved selection
        console.log("❌ No saved selection, using first available key:", toolKeys[0].id);
        setSelectedApiKeyId(toolKeys[0].id);
      } else if (preserveSelection && !toolKeys.some(key => key.id === preserveSelection)) {
        console.log("⚠️ Saved selection not found in available keys, using first available");
        setSelectedApiKeyId(toolKeys.length > 0 ? toolKeys[0].id : "");
      }
    } catch (error) {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      const savedApiKeyId = nodeData?.apiKeyId || "";
      console.log("🔄 Modal opened for", toolType);
      console.log("📦 nodeData received:", nodeData);
      console.log("🔑 savedApiKeyId from nodeData:", savedApiKeyId);
      
      setSelectedApiKeyId(savedApiKeyId);
      fetchApiKeys(savedApiKeyId);
      setHasInitialized(true);
    } else if (!isOpen) {
      // Reset when modal closes
      setHasInitialized(false);
    }
  }, [isOpen, nodeData?.apiKeyId, toolType]);

  // Debug effect to track nodeData changes
  useEffect(() => {
    console.log("📊 nodeData changed:", nodeData);
  }, [nodeData]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error("All fields are required");
      return;
    }
    setIsSubmittingKey(true);
    try {
      const serviceName = getServiceNameForTool(toolType);
      const newKey = await createApiKey(newKeyName.trim(), serviceName, newKeyValue.trim());
      toast.success("API key added successfully");
      setNewKeyName('');
      setNewKeyValue('');
      setShowKey(false);
      setIsAddKeyDialogOpen(false);
      // Fetch keys again but preserve the new key selection
      await fetchApiKeys(newKey?.id || "");
    } catch (error: any) {
      toast.error(error.message || "Failed to add API key");
    } finally {
      setIsSubmittingKey(false);
    }
  };

  const handleSave = () => {
    if (needsApiKey && !selectedApiKeyId) {
      toast.error(`Please select or add an API key for ${getServiceNameForTool(toolType)}`);
      return;
    }

    console.log("💾 Saving tool config with apiKeyId:", selectedApiKeyId);
    onSave({
      apiKeyId: selectedApiKeyId
    });
    onClose();
  };

  if (!needsApiKey) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{toolType} Configuration</DialogTitle>
            <DialogDescription>This tool doesn't require any configuration.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{toolType} Configuration</DialogTitle>
            <DialogDescription>Configure your tool settings.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>API Key *</Label>
              <div className="flex gap-2">
                {isLoadingKeys ? (
                  <div className="flex-1 h-10 flex items-center justify-center rounded-md border border-input animate-pulse">
                    <span className="text-sm text-muted-foreground">Loading keys...</span>
                  </div>
                ) : (
                  <>
                    <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Select ${getServiceNameForTool(toolType)} API key`} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableApiKeys.length > 0 ? 
                          availableApiKeys.map((key) => (
                            <SelectItem key={key.id} value={key.id}>{key.name}</SelectItem>
                          )) :
                          <div className="p-2 text-sm text-muted-foreground">No keys available. Click + to add.</div>
                        }
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setIsAddKeyDialogOpen(true)} title="Add New API Key">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Key Dialog */}
      <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New {getServiceNameForTool(toolType)} Key</DialogTitle>
            <DialogDescription>Add a new API key to be securely stored. Only you will be able to view this key.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddKey}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-key-name" className="text-right">Name</Label>
                <Input
                  id="new-key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="col-span-3"
                  placeholder={`My ${getServiceNameForTool(toolType)} Key`}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-key-value" className="text-right">API Key</Label>
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