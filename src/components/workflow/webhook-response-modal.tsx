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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [apiEnabled, setApiEnabled] = useState(true);

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
      console.log('Webhook Response modal opened with nodeData:', nodeData);
      
      // Only update state if we have actual data
      if (nodeData && Object.keys(nodeData).length > 0) {
        setWebhookUrl(nodeData.webhookUrl || '');
        setIsOneoff(nodeData.isOneoff || false);
        setApiEnabled(nodeData.apiEnabled !== undefined ? nodeData.apiEnabled : true);
        
        // Only set webhookId if it exists, otherwise keep the generated one
        if (nodeData.webhookId) {
          setWebhookId(nodeData.webhookId);
        }
      }
    }
  }, [isOpen, nodeData]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API URL copied to clipboard");
  };

  const handleSave = () => {
    const webhookResponseConfig = {
      webhookUrl,
      isOneoff,
      webhookId,
      apiEnabled
    };
    
    if (onSave) {
      onSave(webhookResponseConfig);
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
          <div className="flex items-center justify-between">
            <Label htmlFor="api-enabled" className="font-medium">
              API Endpoint Enabled
            </Label>
            <Switch
              id="api-enabled"
              checked={apiEnabled}
              onCheckedChange={setApiEnabled}
            />
          </div>

          {apiEnabled && (
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