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
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { useWorkflowStore } from '@/lib/store/workflow';

interface RedisMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeData?: any;
  onSave?: (data: any) => void;
}

export function RedisMemoryModal({ isOpen, onClose, nodeId, nodeData, onSave }: RedisMemoryModalProps) {
  const [activeTab, setActiveTab] = useState("parameters");
  const [sessionTTL, setSessionTTL] = useState("0");
  const [contextWindowLength, setContextWindowLength] = useState("5");
  
  // Initialize with default values or node data
  useEffect(() => {
    // Only run when the modal is opened
    if (isOpen) {
      // Get saved settings if they exist
      const savedSessionTTL = nodeData?.sessionTTL || "0";
      const savedContextWindowLength = nodeData?.contextWindowLength || "5";
      
      console.log(`Memory modal opened:`, { nodeData });
      
      // Set values from node data
      setSessionTTL(savedSessionTTL);
      setContextWindowLength(savedContextWindowLength);
    }
  }, [nodeData, isOpen]);
  
  const handleSave = () => {
    // Parse numbers to ensure they are valid
    const parsedSessionTTL = parseInt(sessionTTL);
    const parsedContextWindowLength = parseInt(contextWindowLength);

    if (isNaN(parsedSessionTTL) || parsedSessionTTL < 0) {
      toast.error("Session Time To Live must be a valid number");
      return;
    }

    if (isNaN(parsedContextWindowLength) || parsedContextWindowLength < 1) {
      toast.error("Context Window Length must be a positive number");
      return;
    }

    const memoryConfig = {
      sessionTTL: parsedSessionTTL.toString(),
      contextWindowLength: parsedContextWindowLength.toString()
    };

    console.log('Saving Redis Memory configuration:', memoryConfig);

    // Use the onSave prop if provided
    if (onSave) {
      onSave(memoryConfig);
    } else if (nodeId) {
      // Otherwise update the node data directly
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      updateNodeData(nodeId, {
        memoryConfig
      });
      
      toast.success('Redis Memory configuration updated', {
        description: `Context Window: ${parsedContextWindowLength} messages`,
        duration: 3000
      });
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            Redis Memory Configuration
          </DialogTitle>
          <DialogDescription>
            Configure Redis memory to store conversation history
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="parameters" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="parameters" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Session Time To Live</Label>
                <Input
                  type="number"
                  value={sessionTTL}
                  onChange={(e) => setSessionTTL(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Context Window Length</Label>
                <Input
                  type="number"
                  value={contextWindowLength}
                  onChange={(e) => setContextWindowLength(e.target.value)}
                  placeholder="5"
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  How many past interactions the model receives as context
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="docs" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Redis Memory Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Learn how to use Redis memory effectively in your workflows.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Context Window Length</h4>
                <p className="text-sm text-muted-foreground">
                  This setting controls how many past interactions are included in the context sent to the model.
                  A larger number provides more context but increases token usage.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Session Time To Live</h4>
                <p className="text-sm text-muted-foreground">
                  How long (in seconds) the conversation history should be stored. Use 0 for no expiration.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 