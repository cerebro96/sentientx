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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, AlertCircle } from "lucide-react";
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
  const apiUrl = `http://localhost:3000/api/chat/${webhookId}`;

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset workflow running state
      setIsWorkflowRunning(false);
      
      // Reset interaction flag when modal opens
      if (!hasInteracted) {
        // Always start with API off on first interaction
        setApiEnabled(false);
      }
      
      // Load stored settings
      if (nodeData && Object.keys(nodeData).length > 0) {
        setWebhookUrl(nodeData.webhookUrl || '');
        setIsOneoff(nodeData.isOneoff || false);
        
        // Only set webhookId if it exists, otherwise keep the generated one
        if (nodeData.webhookId) {
          setWebhookId(nodeData.webhookId);
        }
        
        // If user has interacted with the modal before, respect saved API state
        if (hasInteracted && nodeData.apiEnabled) {
          // Check workflow status
          const workflowId = useWorkflowStore.getState().workflowId;
          if (workflowId) {
            fetch(`/api/workflows/${workflowId}/status`)
              .then(response => response.json())
              .then(data => {
                const isRunning = data.status === 'running';
                setIsWorkflowRunning(isRunning);
                
                // Only enable API if workflow is running AND API was saved as enabled
                if (isRunning && nodeData.apiEnabled) {
                  setApiEnabled(true);
                }
              })
              .catch(error => {
                console.error("Error checking workflow status:", error);
                setIsWorkflowRunning(false);
              });
          }
        } else {
          // Still check workflow status even if not loading API state
          const workflowId = useWorkflowStore.getState().workflowId;
          if (workflowId) {
            fetch(`/api/workflows/${workflowId}/status`)
              .then(response => response.json())
              .then(data => {
                setIsWorkflowRunning(data.status === 'running');
              })
              .catch(error => {
                console.error("Error checking workflow status:", error);
                setIsWorkflowRunning(false);
              });
          }
        }
      }
    }
  }, [isOpen, nodeData, hasInteracted]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API URL copied to clipboard");
  };

  const handleApiToggle = (value: boolean) => {
    if (value && !isWorkflowRunning) {
      toast.error("Cannot enable API", {
        description: "Workflow must be running to enable the API endpoint."
      });
      return;
    }
    setApiEnabled(value);
    setHasInteracted(true); // Mark as interacted when user toggles API
  };

  const handleSave = () => {
    // Mark as interacted when user saves
    setHasInteracted(true);
    
    // Always respect user's choice when workflow is running
    // If workflow is not running, API must be disabled
    const finalApiState = isWorkflowRunning ? apiEnabled : false;
    
    const webhookResponseConfig = {
      webhookUrl,
      isOneoff,
      webhookId,
      apiEnabled: finalApiState
    };
    
    if (onSave) {
      onSave(webhookResponseConfig);
      
      // Show a toast if API couldn't be enabled due to workflow not running
      if (apiEnabled && !isWorkflowRunning) {
        toast.warning("API endpoint saved as disabled", {
          description: "Workflow must be running for the API endpoint to be enabled."
        });
      }
    }
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Webhook Response Configuration</DialogTitle>
          <DialogDescription>
            Configure the webhook that will receive the workflow response
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
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
                onCheckedChange={handleApiToggle}
                disabled={!isWorkflowRunning}
              />
            </div>
            {!isWorkflowRunning && (
              <p className="text-xs text-muted-foreground">
                Start the workflow to enable the API endpoint
              </p>
            )}
          </div>

          {apiEnabled && isWorkflowRunning && (
            <div className="space-y-2">
              <Label htmlFor="api-url" className="font-medium">
                API Endpoint
              </Label>
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
                Send POST requests to this endpoint to trigger the workflow
              </p>
            </div>
          )}

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