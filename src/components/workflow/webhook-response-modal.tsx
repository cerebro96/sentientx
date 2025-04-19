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
  const currentWorkflowId = useWorkflowStore(state => state.workflowId);
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
  const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/webhook/chat/${webhookId}`;

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("[WebhookResponseModal] Modal opened for workflow:", currentWorkflowId, "nodeData:", nodeData);
      
      // Determine if this is the initial setup (no existing webhook config)
      const isInitialSetup = !nodeData?.webhookId;
      console.log("[WebhookResponseModal] Is initial setup?", isInitialSetup);

      // Reset initial states for this render
      setIsWorkflowRunning(false);
      setApiEnabled(false); // Default to disabled
      
      // Load basic settings if nodeData exists, or use defaults
      setWebhookUrl(nodeData?.webhookUrl || '');
      setIsOneoff(nodeData?.isOneoff || false);
      
      // Use existing webhookId or keep the generated one
      const currentWebhookId = nodeData?.webhookId || webhookId; // webhookId holds the generated one
      if (nodeData?.webhookId) {
        setWebhookId(nodeData.webhookId);
      }

      // --- Initial Save Logic --- 
      if (isInitialSetup && onSave) {
        console.log("[WebhookResponseModal] Performing initial save with generated ID:", currentWebhookId);
        const initialConfig = {
          webhookUrl: '',       // Initial default
          isOneoff: false,     // Initial default
          webhookId: currentWebhookId, // Use the generated or existing ID
          apiEnabled: false,   // Always start disabled
          workflowId: currentWorkflowId
        };
        onSave(initialConfig);
        // Note: This onSave call will update the nodeData prop for the *next* render,
        // but the rest of this effect execution will still use the initially passed nodeData.
      }
      // ------------------------
      
      // Check workflow status to determine running state and API enablement
      if (currentWorkflowId) {
        console.log(`[WebhookResponseModal] Checking status for workflow: ${currentWorkflowId}`);
        fetch(`/api/workflows/${currentWorkflowId}/status`)
          .then(response => response.json())
          .then(data => {
            const isRunning = data.status === 'running';
            console.log("[WebhookResponseModal] Workflow running state:", isRunning);
            setIsWorkflowRunning(isRunning);
            
            // Use the potentially updated nodeData (from initial save) if available, otherwise the original nodeData
            const relevantNodeData = isInitialSetup ? {} : nodeData; // Use empty object if initial setup happened
            
            // Only set API enabled if the workflow IS running AND it was previously saved as enabled
            if (isRunning && relevantNodeData?.apiEnabled === true) {
              console.log("[WebhookResponseModal] Workflow running and API was saved as enabled. Restoring state.");
              setApiEnabled(true);
            } else {
              // Otherwise, ensure it's disabled (either workflow not running, or wasn't saved as enabled)
              console.log("[WebhookResponseModal] Workflow not running OR API was not saved as enabled. Setting API disabled.");
              setApiEnabled(false);
            }
          })
          .catch(error => {
            console.error("[WebhookResponseModal] Error checking workflow status:", error);
            // Ensure states are reset on error
            setIsWorkflowRunning(false);
            setApiEnabled(false);
          });
      } else {
        // No workflow ID, assume not running and disabled
        console.log("[WebhookResponseModal] No current workflow ID found in store");
        setIsWorkflowRunning(false);
        setApiEnabled(false);
      }
    }
  }, [isOpen, nodeData, currentWorkflowId, onSave]); // Add onSave to dependencies

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
      workflowId: currentWorkflowId
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
  -d '{"message": "Hello from the webhook!", "workflow_id": "${currentWorkflowId || 'your-workflow-id'}"}'`;
  
  // Example fetch code
  const fetchExample = `fetch("${apiUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Hello from the webhook!",
    workflow_id: "${currentWorkflowId || 'your-workflow-id'}"
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
                      // Update local state immediately
                      setApiEnabled(value);
                      
                      // Immediately prepare and save the updated config
                      const updatedConfig = {
                        webhookUrl,
                        isOneoff,
                        webhookId,
                        apiEnabled: value, // Use the new value
                        workflowId: currentWorkflowId
                      };
                      if (onSave) {
                        onSave(updatedConfig);
                      }
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
                    <p className="font-medium">{currentWorkflowId || "Not linked"}</p>
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
              
              {/* Chatbot Client Instructions */}
              <div className="space-y-2 pt-4 border-t border-border/40">
                <Label className="font-medium text-base flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  Building a Chatbot Client
                </Label>
                <div className="text-xs text-muted-foreground space-y-1.5 bg-muted/30 p-3 rounded-md">
                  <p>
                    <strong className='text-foreground'>Important:</strong> Each POST request to this specific Webhook Endpoint URL starts a <strong className='text-foreground'>new, isolated conversation</strong>.
                    The <code>session_id</code> returned in the response is unique to that single request-response cycle.
                  </p>
                  <p>
                    This endpoint is ideal for stateless triggers or single interactions.
                  </p>
                  <p>
                    For a <strong className='text-foreground'>stateful chatbot</strong> (that remembers conversation history), your client application would need to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Make the initial request (like the examples above).</li>
                    <li>Store the <code>session_id</code> received in the first response.</li>
                    <li>For follow-up messages in the same conversation, send requests directly to the backend's primary chat endpoint (e.g., <code>/api/chat/message</code>) including the stored <code>session_id</code>, <code>message</code>, and <code>workflow_id</code> in the request body.</li>
                  </ul>
                  <p>
                     Consult the backend API documentation for details on the primary chat endpoint if you need conversational context.
                  </p>
                </div>
              </div>
              {/* End Chatbot Client Instructions */}
              
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