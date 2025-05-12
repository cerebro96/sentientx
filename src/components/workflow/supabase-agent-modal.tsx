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

interface SupabaseAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeData: {
    supabaseUrl?: string;
    supabaseKey?: string;
    sessionId?: string;
    userId?: string;
  } | undefined;
  onSave: (configData: { supabaseUrl: string; supabaseKey: string }) => void;
}

export function SupabaseAgentModal({ 
  isOpen, 
  onClose, 
  nodeId, 
  nodeData, 
  onSave 
}: SupabaseAgentModalProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  useEffect(() => {
    if (isOpen && nodeData) {
      setSupabaseUrl(nodeData.supabaseUrl || '');
      setSupabaseKey(nodeData.supabaseKey || '');
    }
  }, [isOpen, nodeData]);

  const handleSave = () => {
    if (!supabaseUrl || !supabaseKey) {
      toast.error('Supabase URL and Key are required.');
      return;
    }
    onSave({ supabaseUrl, supabaseKey });
    onClose(); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Supabase AI Agent</DialogTitle>
          <DialogDescription>
            Enter your Supabase project URL and anon key.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supabase-url" className="text-right">
              Supabase URL
            </Label>
            <Input
              id="supabase-url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://your-project-ref.supabase.co"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supabase-key" className="text-right">
              Anon Key
            </Label>
            <Input
              id="supabase-key"
              type="password" // Use password type for keys
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="col-span-3"
              placeholder="Enter your Supabase anon key"
            />
          </div>
          
          {/* Display Session ID and User ID if available */}
          {nodeData?.sessionId && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="session-id" className="text-right">
                Session ID
              </Label>
              <div className="col-span-3 text-sm text-gray-500 truncate" title={nodeData.sessionId}>
                {nodeData.sessionId}
              </div>
            </div>
          )}
          
          {nodeData?.userId && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-id" className="text-right">
                User ID
              </Label>
              <div className="col-span-3 text-sm text-gray-500 truncate" title={nodeData.userId}>
                {nodeData.userId}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 