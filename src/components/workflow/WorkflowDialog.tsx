'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { createWorkflow } from '@/lib/workflows';
import { Tag, X, Plus, Send, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export interface WorkflowFormData {
  name: string;
  description: string;
  isActive: boolean;
  tags: string[];
}

interface WorkflowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowCreated: (formData: WorkflowFormData) => void;
}

export function WorkflowDialog({ isOpen, onClose, onWorkflowCreated }: WorkflowDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Workflow name is required");
      return;
    }

    setIsLoading(true);

    try {
      onWorkflowCreated({
        name: name.trim(),
        description: description.trim(),
        isActive,
        tags
      });
      
      // Reset form
      setName('');
      setDescription('');
      setIsActive(true);
      setTags([]);
      
    } catch (error: any) {
      console.error("Failed to handle workflow creation:", error);
      toast.error("An error occurred while creating the workflow");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChatMessage = () => {
    console.log("Sending chat message:", chatMessage);
    setChatMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 flex flex-col h-[70vh]">
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 p-6 border-r overflow-y-auto flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Create a new AI workflow. Give it a name and description to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 flex-grow">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My AI Workflow"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this workflow does..."
                    className="resize-none"
                    autoComplete="off"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <div 
                        key={tag} 
                        className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        <span>{tag}</span>
                        <button 
                          type="button"
                          onClick={() => removeTag(tag)} 
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Add tag"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={addTag}
                      disabled={!tagInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-auto border-t pt-4 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !name.trim()}>
                  {isLoading ? "Creating..." : "Create Workflow"}
                </Button>
              </DialogFooter>
            </form>
          </div>

          <div className="w-1/2 p-6 flex flex-col bg-muted/30">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-semibold">AI Workflow Builder</h3>
            </div>
            
            <div className="flex-grow border rounded-md p-4 mb-4 bg-background overflow-y-auto">
              <p className="text-sm text-muted-foreground">
                Chat with the AI to help build your workflow. Start by describing what you want to achieve.
                (Chat functionality not implemented yet)
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Describe your workflow goal..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
              />
              <Button onClick={handleSendChatMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 