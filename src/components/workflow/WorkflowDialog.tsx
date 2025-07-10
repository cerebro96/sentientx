'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { createWorkflow } from '@/lib/workflows';
import { Tag, X, Plus, Send, MessageSquare, Bot } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowFormData {
  name: string;
  description: string;
  agentType: string;
  isActive: boolean;
  tags: string[];
  systemPrompt?: string;
  model?: string;
  apiKeyId?: string;
}

// AI Builder related interfaces - commented out
// interface ChatMessage {
//   role: 'user' | 'assistant';
//   content: string;
// }

interface WorkflowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowCreated: (formData: WorkflowFormData) => void;
}

const agentTypeOptions = [
  { value: 'single_agent', label: 'Single Agent', description: 'Simple workflows with one AI agent' },
  { value: 'multi_agent', label: 'Multi Agent', description: 'Complex workflows with multiple coordinated agents' },
  { value: 'prebuild_agents', label: 'Prebuild Agents', description: 'Pre-configured agent templates and solutions' }
];

export function WorkflowDialog({ isOpen, onClose, onWorkflowCreated }: WorkflowDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // AI Builder related state - commented out
  // const [chatMessage, setChatMessage] = useState('');
  // const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  // const [isChatLoading, setIsChatLoading] = useState(false);
  // const [builderSessionId, setBuilderSessionId] = useState('');
  // const [isReadyToCreate, setIsReadyToCreate] = useState(false);
  // const [finalWorkflowData, setFinalWorkflowData] = useState<any>(null);
  // const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // AI Builder session initialization - commented out
      // const newSessionId = uuidv4();
      // setBuilderSessionId(newSessionId);
      // sendBuilderMessage('Start', newSessionId);
      // setChatHistory([]);
      // setIsReadyToCreate(false);
      // setFinalWorkflowData(null);
      
      // Reset form
      setName('');
      setDescription('');
      setAgentType('');
      setTags([]);
      setTagInput('');
      setIsLoading(false); // Reset loading state when dialog opens
    } else {
      // Reset loading state when dialog closes
      setIsLoading(false);
    }
  }, [isOpen]);
  
  // AI Builder chat scroll effect - commented out
  // useEffect(() => {
  //   if (scrollAreaRef.current) {
  //     scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
  //   }
  // }, [chatHistory]);

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

  // AI Builder workflow creation - commented out
  // const createWorkflowFromChat = () => {
  //   if (!finalWorkflowData) {
  //     toast.error("Workflow data not ready from AI builder.");
  //     return;
  //   }
  //   
  //   if (isLoading) {
  //     return; // Prevent double submission
  //   }
  //   
  //   console.log("Populating form with AI data:", finalWorkflowData);
  //   
  //   setIsLoading(true);
  //   
  //   try {
  //     setName(finalWorkflowData.name || '');
  //     setDescription(finalWorkflowData.description || '');
  //     setTags(finalWorkflowData.tags || []);
  //     // Set default agent type from AI if not specified
  //     setAgentType(finalWorkflowData.agentType || 'single_agent');
  //     
  //     onWorkflowCreated({
  //       name: finalWorkflowData.name || '',
  //       description: finalWorkflowData.description || '',
  //       agentType: finalWorkflowData.agentType || 'single_agent',
  //       isActive,
  //       tags: finalWorkflowData.tags || [],
  //       systemPrompt: finalWorkflowData.system_prompt,
  //       model: finalWorkflowData.model,
  //       apiKeyId: finalWorkflowData.apiKeyId
  //     });
  //     
  //     toast.info("Creating workflow from AI suggestions...");
  //   } catch (error) {
  //     console.error("Error creating workflow from chat:", error);
  //     setIsLoading(false);
  //   }
  // };
  
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) {
      return;
    }
    
    // Validation
    if (!name.trim()) {
      toast.error("Workflow name is required");
      return;
    }
    
    if (!agentType) {
      toast.error("Agent type is required");
      return;
    }
    
    setIsLoading(true);
    
    try {
      onWorkflowCreated({
        name: name.trim(),
        description: description.trim(),
        agentType,
        isActive,
        tags
      });
    } catch (error) {
      console.error("Error creating workflow:", error);
      setIsLoading(false);
    }
  };

  // AI Builder message sending - commented out
  // const sendBuilderMessage = async (messageToSend: string, currentSessionId: string) => {
  //   if (!messageToSend.trim() || !currentSessionId) return;

  //   setChatHistory(prev => [...prev, { role: 'user', content: messageToSend }]);
  //   setIsChatLoading(true);
  //   setChatMessage('');

  //   try {
  //     const response = await fetch('/api/builder/chat', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ message: messageToSend, session_id: currentSessionId }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.detail || 'Failed to get response from AI builder');
  //     }

  //     const data = await response.json();

  //     setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      
  //     if (data.state) {
  //        setIsReadyToCreate(data.state.ready_to_create || false);
  //        if (data.state.ready_to_create && data.state.workflow_data) {
  //           setFinalWorkflowData(data.state.workflow_data);
  //        }
  //     }
      
  //   } catch (error: any) {
  //     console.error("Error communicating with AI builder:", error);
  //     toast.error("Error getting response from AI builder");
  //     setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
  //   } finally {
  //     setIsChatLoading(false);
  //   }
  // };

  // const handleSendChatMessage = () => {
  //     if (chatMessage.trim() && builderSessionId) {
  //         sendBuilderMessage(chatMessage, builderSessionId);
  //     }
  // };

  const isFormValid = name.trim() && agentType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 flex flex-col h-[85vh]">
        <div className="flex flex-1 overflow-hidden">
          <div className="w-full p-6 overflow-y-auto flex flex-col">
            <form onSubmit={handleManualSubmit} className="flex flex-col h-full">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Fill in the details to create your workflow.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 flex-grow">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
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
                  <Label htmlFor="agentType">
                    Agent Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={agentType} onValueChange={setAgentType} required>
                    <SelectTrigger className="w-96">
                      <SelectValue placeholder="Select agent type" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="flex justify-center">
                          <div className="flex flex-col items-center text-center w-full">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-sm text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!agentType && (
                    <p className="text-sm text-muted-foreground">
                      Choose the type of agent system for your workflow
                    </p>
                  )}
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
                <Button type="submit" disabled={isLoading || !isFormValid}>
                  {isLoading ? "Saving..." : "Create Workflow"}
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* AI Workflow Builder UI - commented out */}
          {/* <div className="w-1/2 p-6 flex flex-col bg-muted/30">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-semibold">AI Workflow Builder</h3>
            </div>
            
            <ScrollArea className="flex-grow border rounded-md p-4 mb-4 bg-background" ref={scrollAreaRef}>
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${ 
                      msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                 <div className="flex justify-start mb-3">
                   <div className="bg-secondary text-secondary-foreground p-2 rounded-lg text-sm animate-pulse">
                     Thinking...
                   </div>
                 </div>
              )}
              {isReadyToCreate && (
                 <div className="mt-4 text-center">
                    <Button onClick={createWorkflowFromChat} size="sm" disabled={isLoading}>
                       <Bot className="mr-2 h-4 w-4" />
                       {isLoading ? "Creating..." : "Create Workflow from Chat"}
                    </Button>
                 </div>
              )}
            </ScrollArea>
            
            <div className="flex gap-2 items-center flex-shrink-0">
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Describe your workflow goal..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && !isChatLoading && handleSendChatMessage()}
                disabled={isChatLoading}
              />
              <Button onClick={handleSendChatMessage} size="icon" disabled={isChatLoading || !chatMessage.trim()}>
                {isChatLoading ? (
                   <div className="h-4 w-4 border-2 border-background border-t-primary rounded-full animate-spin"></div>
                 ) : (
                   <Send className="h-4 w-4" />
                 )}
              </Button>
            </div>
          </div> */}
        </div>
      </DialogContent>
    </Dialog>
  );
} 