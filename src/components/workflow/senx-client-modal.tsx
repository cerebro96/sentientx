'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useWorkflowStore } from '@/lib/store/workflow';

interface SenXClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SenXClientModal({ isOpen, onClose }: SenXClientModalProps) {
  const [appName, setAppName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [existingRecord, setExistingRecord] = useState<boolean>(false);
  const [savedAppId, setSavedAppId] = useState<string>('');

  // Check for existing record when modal opens
  useEffect(() => {
    if (isOpen) {
      checkExistingRecord();
    } else {
      // Reset states when modal closes
      setAppName('');
      setExistingRecord(false);
      setSavedAppId('');
    }
  }, [isOpen]);

  const checkExistingRecord = async () => {
    setIsLoadingExisting(true);
    setExistingRecord(false);
    setSavedAppId('');
    try {
      // Get current workflow ID
      const workflowId = useWorkflowStore.getState().workflowId;
      
      if (!workflowId) {
        return;
      }

      // First, get the running execution for this workflow
      const { data: executionData, error: executionError } = await supabase
        .from('executions')
        .select('id')
        .eq('workflow_id', workflowId)
        .eq('status', 'running')
        .single();

      if (executionError || !executionData) {
        return;
      }

      // Get the agent_name from agentfactory table using execution_id
      const { data: agentData, error: agentError } = await supabase
        .from('agentfactory')
        .select('agent_name')
        .eq('execution_id', executionData.id)
        .eq('status', 'active')
        .single();

      if (agentError || !agentData) {
        return;
      }

      // Check if there's already a record in sentientxclient with this app_id
      const { data: existingRecordData, error: existingError } = await supabase
        .from('sentientxclient')
        .select('app_name')
        .eq('app_id', agentData.agent_name)
        .single();

      if (!existingError && existingRecordData) {
        // Pre-populate the app name if record exists
        setAppName(existingRecordData.app_name);
        setExistingRecord(true);
        setSavedAppId(agentData.agent_name);
        console.log('Found existing SenX Client app:', existingRecordData.app_name);
      }
    } catch (error) {
      console.error('Error checking existing record:', error);
      // Don't show error toast for this, just log it
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const handleSubmit = async () => {
    if (!appName.trim()) {
      toast.error('Please enter an app name');
      return;
    }

    setIsLoading(true);
    try {
      // Get current workflow ID
      const workflowId = useWorkflowStore.getState().workflowId;
      
      if (!workflowId) {
        throw new Error('No workflow ID found');
      }

      // First, get the running execution for this workflow
      const { data: executionData, error: executionError } = await supabase
        .from('executions')
        .select('id')
        .eq('workflow_id', workflowId)
        .eq('status', 'running')
        .single();

      if (executionError || !executionData) {
        throw new Error('No running execution found for this workflow');
      }

      // Get the agent_name from agentfactory table using execution_id
      const { data: agentData, error: agentError } = await supabase
        .from('agentfactory')
        .select('agent_name')
        .eq('execution_id', executionData.id)
        .eq('status', 'active')
        .single();

      if (agentError || !agentData) {
        throw new Error('No active agent found for this execution');
      }

      const appId = agentData.agent_name; // Use agent_name as app_id
      
      let data, error;
      
      if (existingRecord) {
        // Update existing record
        console.log('Updating existing SenX Client app:', { app_id: appId, app_name: appName });
        ({ data, error } = await supabase
          .from('sentientxclient')
          .update({
            app_name: appName
          })
          .eq('app_id', appId));
      } else {
        // Insert new record
        console.log('Creating new SenX Client app:', { app_id: appId, app_name: appName });
        ({ data, error } = await supabase
          .from('sentientxclient')
          .insert({
            app_id: appId,
            app_name: appName
          }));
      }

      if (error) {
        throw error;
      }

      console.log(`Successfully ${existingRecord ? 'updated' : 'created'} SenX Client app:`, data);
      toast.success(`SenX Client app ${existingRecord ? 'updated' : 'created'} successfully`);
      
      // Set the saved app ID and existing record flag
      setSavedAppId(appId);
      setExistingRecord(true);
      
      // Don't close the modal anymore
    } catch (error) {
      console.error('Error saving SenX Client app:', error);
      toast.error(`Failed to save SenX Client app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAppName('');
    setExistingRecord(false);
    setSavedAppId('');
    onClose();
  };

  const getClientAppUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SEN_CLIENT;
    return baseUrl ? `${baseUrl}/?app=${savedAppId}` : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create SenX Client App</DialogTitle>
          <DialogDescription>
            Enter a name for your new SenX Client application.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="appName">App Name</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder={isLoadingExisting ? "Loading..." : "Enter app name..."}
              disabled={isLoadingExisting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          
          {/* Show client app link if record exists */}
          {savedAppId && (
            <div className="grid gap-2">
              <Label>Client App Access</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getClientAppUrl(), '_blank')}
                  disabled={!getClientAppUrl()}
                  className="flex-1"
                >
                  Open Client App
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                App ID: {savedAppId}
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading || isLoadingExisting}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isLoadingExisting || !appName.trim()}>
            {isLoading ? 'Saving...' : 'Save App'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 