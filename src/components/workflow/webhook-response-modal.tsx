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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, AlertCircle, Code, Info, Settings, Terminal } from "lucide-react";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/lib/store/workflow';

interface WebhookResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId?: string;
  nodeData?: any;
  onSave?: (data: any) => void;
}

export function WebhookResponseModal({ isOpen, onClose, nodeId, nodeData, onSave }: WebhookResponseModalProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isOneoff, setIsOneoff] = useState(false);
  const [webhookId, setWebhookId] = useState(() => generateRandomId());
  const [copied, setCopied] = useState(false);
  const [apiEnabled, setApiEnabled] = useState(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  
  // Get workflow ID from the store
  const workflowId = useWorkflowStore(state => state.workflowId);
  const workflowName = useWorkflowStore(state => {
    const nodes = state.nodes || [];
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node.data?.label || "Webhook Response";
      }
    }
    return "Webhook Response";
  });
  
  // Generate a random webhook ID using cryptographically secure random values
  function generateRandomId() {
    // Use Web Crypto API for secure random values
    const crypto = window.crypto || (window as any).msCrypto;
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    
    // Convert to base36 string and take a substring for readability
    return array[0].toString(36).substring(0, 8);
  }

  // Format webhook API URL - use chat endpoint format
  const apiUrl = `http://localhost:3000/webhook/chat/${webhookId}`;

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("[WebhookResponseModal] Modal opened, nodeData:", nodeData);
      
      // Reset workflow running state
      setIsWorkflowRunning(false);
      
      // Load stored settings
      if (nodeData && Object.keys(nodeData).length > 0) {
        // Load saved values
        setWebhookUrl(nodeData.webhookUrl || '');
        setIsOneoff(nodeData.isOneoff || false);
        
        // Only set webhookId if it exists, otherwise keep the generated one
        if (nodeData.webhookId) {
          setWebhookId(nodeData.webhookId);
        }
        
        console.log("[WebhookResponseModal] Saved API state:", nodeData.apiEnabled);
        
        // Check workflow status and set API enabled state accordingly
        const workflowId = useWorkflowStore.getState().workflowId;
        if (workflowId) {
          fetch(`/api/workflows/${workflowId}/status`)
            .then(response => response.json())
            .then(data => {
              const isRunning = data.status === 'running';
              console.log("[WebhookResponseModal] Workflow running state:", isRunning);
              setIsWorkflowRunning(isRunning);
              
              // If workflow is running and API was previously enabled, keep it enabled
              if (isRunning && nodeData.apiEnabled === true) {
                console.log("[WebhookResponseModal] Restoring API enabled state:", nodeData.apiEnabled);
                setApiEnabled(true);
              } else {
                // Otherwise, ensure API is disabled
                console.log("[WebhookResponseModal] Setting API disabled (workflow not running or not previously enabled)");
                setApiEnabled(false);
              }
            })
            .catch(error => {
              console.error("[WebhookResponseModal] Error checking workflow status:", error);
              setIsWorkflowRunning(false);
              setApiEnabled(false);
            });
        } else {
          // If no workflow ID, ensure workflow is marked as not running
          console.log("[WebhookResponseModal] No workflow ID found");
          setIsWorkflowRunning(false);
          setApiEnabled(false);
        }
      } else {
        console.log("[WebhookResponseModal] No saved webhook data found");
      }
    }
  }, [isOpen, nodeData]);

  // Track API toggle changes
  useEffect(() => {
    console.log("[WebhookResponseModal] API enabled state changed:", apiEnabled);
  }, [apiEnabled]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API URL copied to clipboard");
  };
  
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code example copied to clipboard");
  };

  const handleSave = () => {
    // When saving, capture the current apiEnabled state
    // Only force it off if workflow is not running
    const finalApiState = isWorkflowRunning ? apiEnabled : false;
    
    console.log("[WebhookResponseModal] Saving webhook config with API enabled:", finalApiState);
    
    const webhookResponseConfig = {
      webhookUrl,
      isOneoff,
      webhookId,
      apiEnabled: finalApiState,
      workflowId
    };
    
    if (onSave) {
      onSave(webhookResponseConfig);
      
      // Show a toast if API couldn't be enabled due to workflow not running
      if (apiEnabled && !isWorkflowRunning) {
        toast.warning("API endpoint saved as disabled", {
          description: "Workflow must be running for the API endpoint to be enabled."
        });
      } else if (finalApiState) {
        toast.success("API endpoint is enabled", {
          description: "The API will be accessible until the workflow stops."
        });
      }
    }
    
    onClose();
  };

  // Example curl command
  const curlExample = `curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello from the webhook!", "workflow_id": "${workflowId || 'your-workflow-id'}"}'`;
  
  // Example fetch code
  const fetchExample = `fetch("${apiUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Hello from the webhook!",
    workflow_id: "${workflowId || 'your-workflow-id'}"
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error("Error:", error));`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Webhook Response Configuration</DialogTitle>
          <DialogDescription>
            Configure the webhook that will receive the workflow response
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              API Information
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings">
            <div className="grid gap-5 py-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="api-enabled" className="font-medium">
                      API Endpoint Enabled
                    </Label>
                    {!isWorkflowRunning && (
                      <div className="text-amber-500 flex items-center text-xs" title="Workflow must be running to enable API">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Workflow not running
                      </div>
                    )}
                  </div>
                  <Switch
                    id="api-enabled"
                    checked={apiEnabled}
                    onCheckedChange={(value) => {
                      if (value && !isWorkflowRunning) {
                        toast.error("Cannot enable API", {
                          description: "Workflow must be running to enable the API endpoint."
                        });
                        return;
                      }
                      setApiEnabled(value);
                    }}
                    disabled={!isWorkflowRunning}
                  />
                </div>
                {!isWorkflowRunning && (
                  <p className="text-xs text-muted-foreground">
                    Start the workflow to enable the API endpoint
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url" className="font-medium">
                  Callback URL
                </Label>
                <Input
                  id="webhook-url"
                  placeholder="https://example.com/webhook/callback"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  This URL will receive the workflow's response
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="oneoff"
                  checked={isOneoff}
                  onCheckedChange={setIsOneoff}
                />
                <Label htmlFor="oneoff" className="font-medium">
                  One-off webhook (single use)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                When enabled, the webhook will deactivate after one successful call
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="api">
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-medium text-base">Webhook Details</Label>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-md text-sm">
                  <div>
                    <p className="text-muted-foreground">Webhook ID:</p>
                    <p className="font-medium">{webhookId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Workflow ID:</p>
                    <p className="font-medium">{workflowId || "Not linked"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status:</p>
                    <div className="flex items-center">
                      <div className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        isWorkflowRunning && apiEnabled ? "bg-green-500" : "bg-amber-500"
                      )}></div>
                      <span>{isWorkflowRunning && apiEnabled ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type:</p>
                    <p className="font-medium">{isOneoff ? "One-off (single use)" : "Regular"}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium text-base">API Endpoint</Label>
                <div className="flex items-center space-x-2">
                  <div className="bg-muted p-2 rounded-md flex-1 overflow-hidden text-sm">
                    <code className="break-all">{apiUrl}</code>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyUrl}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send POST requests to this endpoint to trigger the workflow. Include the workflow_id in your request body.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium text-base flex items-center gap-1.5">
                  <Terminal className="h-4 w-4" />
                  cURL Example
                </Label>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {curlExample}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 bg-background/80"
                    onClick={() => handleCopyCode(curlExample)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium text-base flex items-center gap-1.5">
                  <Code className="h-4 w-4" />
                  JavaScript Example
                </Label>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {fetchExample}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 bg-background/80"
                    onClick={() => handleCopyCode(fetchExample)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 rounded-md">
                <Info className="text-amber-500 h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  The webhook will only be active when the workflow is running and API is enabled.
                  {isOneoff && " This webhook will deactivate after one successful use."} 
                  Always include the workflow_id in your request for proper routing.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
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