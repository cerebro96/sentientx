'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/lib/store/workflow';

interface ChatTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId?: string;
  nodeData?: any;
  onSave?: (data: any) => void;
}

export function ChatTriggerModal({ isOpen, onClose, nodeId, nodeData, onSave }: ChatTriggerModalProps) {
  const [activeTab, setActiveTab] = useState("parameters");
  const [isPublic, setIsPublic] = useState(false);
  const [initialMessage, setInitialMessage] = useState("Hello! How can I assist you today?");
  const [mode, setMode] = useState("hosted");
  const [auth, setAuth] = useState("none");
  const [copied, setCopied] = useState(false);
  const [chatId, setChatId] = useState(() => generateRandomId());
  
  // Generate a random chat URL
  function generateRandomId() {
    return Math.random().toString(36).substring(2, 10);
  }
  
  const chatUrl = `http://localhost:3000/api/chat/${chatId}`;
  
  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Chat Trigger modal opened with nodeData:', nodeData);
      
      // Only update state if we have actual data
      if (nodeData && Object.keys(nodeData).length > 0) {
        setIsPublic(nodeData.isPublic ?? false);
        setInitialMessage(nodeData.initialMessage ?? "Hello! How can I assist you today?");
        setMode(nodeData.mode ?? "hosted");
        setAuth(nodeData.auth ?? "none");
        
        // Only set chatId if it exists, otherwise keep the generated one
        if (nodeData.chatId) {
          setChatId(nodeData.chatId);
        }
      }
    }
  }, [isOpen, nodeData]);
  
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(chatUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copied to clipboard");
  };
  
  // Save changes to Supabase
  const handleSave = () => {
    console.log('Saving Chat Trigger configuration:', {
      isPublic,
      initialMessage,
      mode,
      auth,
      chatId
    });
    
    const chatConfig = {
      isPublic,
      initialMessage,
      mode,
      auth,
      chatId
    };
    
    // Use the onSave prop if provided
    if (onSave) {
      onSave(chatConfig);
      
      // Force a manual save to ensure changes persist
      setTimeout(() => {
        // Try to verify the data was saved correctly
        if (nodeId) {
          const node = useWorkflowStore.getState().nodes.find(n => n.id === nodeId);
          console.log('After save, node data is:', node?.data?.chatConfig);
        }
        
        // Apply manual workflow save to ensure changes propagate
        const saveBtn = document.querySelector('button:has(.lucide-save)');
        if (saveBtn) {
          console.log(`Triggering manual workflow save for Chat Trigger`);
          (saveBtn as HTMLButtonElement).click();
        }
      }, 100);
    } else if (nodeId) {
      // Otherwise update the node data directly
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      updateNodeData(nodeId, {
        chatConfig
      });
      
      // Force a manual save to ensure changes persist
      setTimeout(() => {
        // Try to verify the data was saved correctly
        const node = useWorkflowStore.getState().nodes.find(n => n.id === nodeId);
        console.log('After direct update, node data is:', node?.data?.chatConfig);
        
        // Apply manual workflow save to ensure changes propagate
        const saveBtn = document.querySelector('button:has(.lucide-save)');
        if (saveBtn) {
          console.log(`Triggering manual workflow save for Chat Trigger`);
          (saveBtn as HTMLButtonElement).click();
        }
      }, 100);
    }
    
    toast.success("Chat Trigger configuration saved");
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            When chat message received
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="parameters" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="parameters" className="space-y-6">
            <div className="space-y-4">
              {isPublic && (
                <div>
                  <Label htmlFor="chat-url" className="mb-2 block">Chat URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="chat-url" 
                      value={chatUrl} 
                      readOnly 
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleCopyUrl}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="public-chat">Make Chat Publicly Available</Label>
                  <div className="text-xs text-muted-foreground">Anyone with the URL can access this chat</div>
                </div>
                <Switch 
                  id="public-chat" 
                  checked={isPublic} 
                  onCheckedChange={setIsPublic}
                />
              </div>
              
              <div>
                <Label htmlFor="chat-mode" className="mb-2 block">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hosted">Hosted Chat</SelectItem>
                    <SelectItem value="embedded">Embedded Widget</SelectItem>
                    <SelectItem value="api">API Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-3 bg-muted rounded-md border text-sm flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  {isPublic 
                    ? "Chat will be live at the URL above once you activate this workflow." 
                    : "Chat is currently private. Enable 'Make Chat Publicly Available' to get a shareable URL."}
                  {isPublic && " Live executions will show up in the executions tab."}
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="auth-type" className="mb-2 block">Authentication</Label>
                <Select value={auth} onValueChange={setAuth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select authentication type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="api-key">API Key</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="initial-message" className="mb-2 block">Initial Message(s) [Prompt]</Label>
                <Textarea 
                  id="initial-message" 
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Enter message to display when chat is opened..."
                  className="min-h-[120px]"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="docs" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Chat Trigger Documentation</h3>
              <p className="text-muted-foreground">
                The Chat Trigger node activates your workflow when a user sends a message to the chat interface.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium">Usage</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Connect this node to other nodes to process incoming chat messages</li>
                  <li>Use the provided URL to access the chat interface</li>
                  <li>Embed the chat widget on your website using the embed code</li>
                </ul>
              </div>
              
              <div className="flex items-center space-x-2 text-foreground hover:text-foreground/80 mt-4">
                <ExternalLink className="h-4 w-4" />
                <a href="https://docs.sentientx.io/triggers/chat" target="_blank" rel="noreferrer" className="text-sm">
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
            Close
          </Button>
          <Button 
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 