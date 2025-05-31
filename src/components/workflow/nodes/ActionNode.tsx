'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';
import { CircleIcon, AlertTriangle, Bot, MessageCircle, Plus, BrainCircuit, DatabaseZap, Webhook, Globe, FileJson, MessageSquare, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChatTriggerModal } from '../chat-trigger-modal';
import { LlmNodeModal } from '../llm-node-modal';
import { RedisMemoryModal } from '../redis-memory-modal';
import { AiAgentModal } from '../ai-agent-modal';
import { WebhookResponseModal } from '../webhook-response-modal';
import { useWorkflowStore } from '@/lib/store/workflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { SupabaseAgentModal } from '../supabase-agent-modal';
import { getCurrentUser } from '@/lib/auth';
import { MultiAgentModal } from '../multi-agent-modal';
import { LlmAgentModal } from '../llm-agent-modal';
import { ToolsModal } from '../tools-modal';

// Simple chat message interface
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Ensure NodeData includes webhookConfig
// declare module '@/lib/store/workflow' {
//   interface NodeData {
//     webhookConfig?: {
//       webhookUrl?: string;
//       isOneoff?: boolean;
//       webhookId?: string;
//     };
//   }
// }

function ActionNodeComponent({ id, data, selected }: NodeProps<NodeData>) {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isLlmModalOpen, setIsLlmModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isAiAgentModalOpen, setIsAiAgentModalOpen] = useState(false);
  const [isWebhookResponseModalOpen, setIsWebhookResponseModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isMultiAgentModalOpen, setIsMultiAgentModalOpen] = useState(false);
  const [isLlmAgentModalOpen, setIsLlmAgentModalOpen] = useState(false);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string>('');
  
  // Chat session state
  const [isChatSessionOpen, setIsChatSessionOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  
  // Check node types
  const isAIAgent = data.label === 'AI Agent';
  const isButtonNode = data.buttonStyle === true;
  const isChatTrigger = data.label === 'Chat Trigger';
  
  // Check if the node is an LLM API node
  const isOpenAI = data.label === 'OpenAI API';
  const isGemini = data.label === 'Google Gemini API';
  const isAnthropic = data.label === 'Anthropic API';
  const isDeepseek = data.label === 'Deepseek API';
  const isLLMNode = isOpenAI || isGemini || isAnthropic || isDeepseek;
  
  const isMemoryNode = data.label === 'Redis Memory';
  const isWebhookTrigger = data.label === 'Webhook';
  const isWebhookResponse = data.label === 'Respond to Webhook';
  const isHttpRequest = data.label === 'HTTP Request';
  const isTransformData = data.label === 'Transform Data';
  const isSupabaseAgent = data.label === 'Supabase AI Agent';
  const isLLMAgent = data.label === 'LLM Agent';
  const isSequentialAgent = data.label === 'Sequential agent';
  const isParallelAgent = data.label === 'Parallel agent';
  const isLoopAgent = data.label === 'Loop agent';
  const isMultiAgent = data.label === 'Multi Agent (BaseAgent)';
  const isSerperApi = data.label === 'Serper API';
  const isGetPrice = data.label === 'get_price';
  const isYahooFinanceNewsTool = data.label === 'YahooFinanceNewsTool';
  const isBraveSearchTool = data.label === 'BraveSearchTool';
  const isScrapeWebsiteTool = data.label === 'ScrapeWebsiteTool';
  const isEXASearchTool = data.label === 'EXASearchTool';
  const isHyperbrowserTool = data.label === 'hyperbrowser_tool';
  const isToolNode = isSerperApi || isGetPrice || isYahooFinanceNewsTool || 
    isBraveSearchTool || isScrapeWebsiteTool || isEXASearchTool || isHyperbrowserTool;
  // Handle icon selection based on node type
  let IconComponent;
  
  // Select the appropriate icon based on node type using the label
  if (isAIAgent || isSupabaseAgent || isLLMAgent ||
     isSequentialAgent || isParallelAgent || isLoopAgent || isMultiAgent) { // Handle both generic and Supabase AI agents
    IconComponent = Bot;
  } else if (isButtonNode) {
    IconComponent = MessageCircle;
  } else if (isLLMNode) {
    IconComponent = BrainCircuit;
  } else if (isMemoryNode) {
    IconComponent = DatabaseZap;
  } else if (isChatTrigger) {
    IconComponent = MessageCircle;
  } else if (isWebhookTrigger || isWebhookResponse) {
    IconComponent = Webhook;
  } else if (isHttpRequest) {
    IconComponent = Globe;
  } else if (isTransformData) {
    IconComponent = FileJson;
  } else if (isToolNode) {
    IconComponent = Wrench;
  } else {
    IconComponent = CircleIcon;
  }
  
  const handleOpenChat = () => {
    console.log('Opening Chat Trigger Modal with data:', id, data.chatConfig);
    setIsChatModalOpen(true);
  };
  
  const handleOpenLlmConfig = () => {
    // Set the appropriate LLM provider based on the node label
    if (isOpenAI) setLlmProvider('openai');
    else if (isGemini) setLlmProvider('gemini');
    else if (isAnthropic) setLlmProvider('anthropic');
    else if (isDeepseek) setLlmProvider('deepseek');
    
    setIsLlmModalOpen(true);
  };
  
  const handleOpenMemoryConfig = () => {
    setIsMemoryModalOpen(true);
  };
  
  const handleOpenAiAgentConfig = () => {
    setIsAiAgentModalOpen(true);
  };
  
  const handleOpenWebhookResponse = () => {
    console.log('Opening Webhook Response Modal with data:', id, data.webhookConfig);
    setIsWebhookResponseModalOpen(true);
  };
  
  const handleOpenSupabaseConfig = () => {
    setIsSupabaseModalOpen(true);
  };
  
  const handleOpenMultiAgentConfig = () => {
    setIsMultiAgentModalOpen(true);
  };
  
  const handleOpenLlmAgentConfig = () => {
    setIsLlmAgentModalOpen(true);
  };
  
  const triggerAutoSave = () => {
    // Get the current workflow canvas instance and trigger auto-save
    const event = new CustomEvent('triggerAutoSave');
    window.dispatchEvent(event);
  };
  
  const handleToolConfigSave = (configData: { apiKeyId: string }) => {
    if (id) {
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      console.log('💾 Saving Tool configuration in node:', id, configData);
      console.log('🔍 Current node data before save:', data);
      
      updateNodeData(id, {
        toolConfig: {
          apiKeyId: configData.apiKeyId
        }
      });
      
      // Explicitly trigger auto-save to ensure persistence
      setTimeout(() => {
        const event = new CustomEvent('triggerAutoSave');
        window.dispatchEvent(event);
        console.log('🚀 Triggered auto-save after tool config update');
      }, 100);
      
      // Debug: Check if the data was saved correctly
      setTimeout(() => {
        const updatedNode = useWorkflowStore.getState().nodes.find(n => n.id === id);
        console.log('✅ Tool configuration saved. Updated node data:', updatedNode?.data);
        console.log('🔑 Saved toolConfig:', updatedNode?.data.toolConfig);
      }, 200);
      
      toast.success('Tool configuration updated');
    }
  };
  
  const handleChatButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    let finalSessionId: string | undefined;
    const agentNode = useWorkflowStore.getState().nodes.find(node => 
      node.data.label  == "AI Agent" || node.data.label == "Supabase AI Agent"
    );
    if (agentNode?.data.label == "Supabase AI Agent") {
      // Use existing session ID for Supabase Agent
      finalSessionId = useWorkflowStore.getState().nodes.find(node => 
        node.data.label == "Supabase AI Agent"
      )?.data.supabaseConfig?.sessionId;
    } else {
      // Generate new session ID for Chat Trigger or if Supabase agent doesn't have one yet
    const generateSessionId = () => {
      const crypto = window.crypto || (window as any).msCrypto;
        const array = new Uint8Array(6); // Increased array size for longer ID
      crypto.getRandomValues(array);
      
      // Convert to base36 string and combine for a 24-character ID
      return Array.from(array)
        .map(num => num.toString(36).padStart(4, '0'))
        .join('')
        .substring(0, 24);
    };
      finalSessionId = `chat-${generateSessionId()}`;
    }

    if (!finalSessionId) {
      toast.error("Failed to determine session ID.");
      return;
    }
    
    setChatSessionId(finalSessionId);
    
    // Initialize chat with welcome message if available
    const initialMessage = data.chatConfig?.initialMessage || "Hello! How can I assist you today?";
    setChatMessages([{
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date()
    }]);
    
    // Open chat session modal
    setIsChatSessionOpen(true);
    
    toast.success('Chat session opened', {
      description: `Session ID: ${finalSessionId}`,
      duration: 3000
    });
  };
  
  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    const userMessage = {
      role: 'user' as const,
      content: currentMessage,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    const messageToProcess = currentMessage; // Store before clearing
    setCurrentMessage('');
    
    try {
      let endpoint = '/api/chat/message';
      let requestBody: any;
      const agentNode = useWorkflowStore.getState().nodes.find(node => 
        node.data.label  == "AI Agent" || node.data.label == "Supabase AI Agent"
      );
      if (agentNode?.data.label == "Supabase AI Agent") {
        const { user, error: userError } = await getCurrentUser();
        if (userError || !user || !user.id) {
          toast.error("User ID not found. Please log in.");
          setChatMessages(prev => prev.slice(0, -1)); // Remove optimistic user message
          return;
        }
        endpoint = '/api/supabase/message';
        requestBody = {
          user_id: user.id,
          session_id: chatSessionId, // This comes from handleChatButtonClick
          message: messageToProcess
        };
      } else {
        // Existing logic for other chat types
      const workflowState = useWorkflowStore.getState();
      let workflowId = workflowState.workflowId;
      if (!workflowId) {
          const tempNodeId = id.substring(0, 8);
          workflowId = `workflow-${tempNodeId}`;
        }
        requestBody = {
          message: messageToProcess,
        session_id: chatSessionId,
        workflow_id: workflowId,
        node_id: id
      };
      }
      
      console.log(`Sending API request to: ${endpoint}`, requestBody);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Check for non-JSON responses first (like HTML error pages)
      let contentType
      let errorMessage = "Failed to get response from AI";
      let jsonData;
      
      if (agentNode?.data.label == "Supabase AI Agent") {
         jsonData = await response.json(); 
      } else {
         contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        jsonData = await response.json();
      } else {
        // Handle non-JSON response (likely HTML error page)
        const text = await response.text();
        console.error("Received non-JSON response:", text.substring(0, 200) + "...");
        throw new Error("Server returned a non-JSON response. The backend may be unavailable.");
      }
      }
      
      
      console.log("jsonData", jsonData);
      
      
      if (!response.ok) {
        throw new Error(jsonData?.error || errorMessage);
      }
      
      // Add assistant response to chat
      let assistantResponseContent = "No response received from server";
      if (agentNode?.data.label == "Supabase AI Agent") {
        // For Supabase agent, get the message property
        if (jsonData.message) {
          // Check if message is an object or string
          if (typeof jsonData.message === 'object' && jsonData.message !== null) {
            // If it's an object, stringify it for display
            try {
              assistantResponseContent = JSON.stringify(jsonData.message, null, 2);
            } catch (e) {
              console.error("Error stringifying message object:", e);
              assistantResponseContent = "Error processing response data";
            }
          } else {
            // If it's already a string, use it directly
            assistantResponseContent = jsonData.message;
          }
        }
      } else if (jsonData && jsonData.response) {
        // For generic chat or if Supabase agent response structure changes unexpectedly
        assistantResponseContent = jsonData.response;
      }

      const assistantMessage = {
        role: 'assistant' as const,
        content: assistantResponseContent,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message to chat
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to get AI response", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
  
  const handleLlmConfigSave = (configData: any) => {
    // Use the id from the node props instead of looking for it in data
    if (id) {
      // Access updateNodeData from the workflow store
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      
      console.log('Saving LLM configuration in node:', configData);
      
      // Special handling for Anthropic to ensure it saves properly
      if (configData.provider === 'anthropic') {
        console.log('Saving Anthropic configuration with special handling:', {
          provider: configData.provider,
          apiKeyId: configData.apiKeyId,
          model: configData.model
        });
      }
      
      // Update the node data
      updateNodeData(id, {
        llmConfig: {
          provider: configData.provider,
          apiKeyId: configData.apiKeyId,
          model: configData.model,
          options: configData.options
        }
      });
      
      // Force a rerender of the node to ensure UI is updated
      setTimeout(() => {
        // Trigger a save to the database to persist the changes
        if (configData.provider === 'anthropic') {
          console.log('Anthropic configuration saved. Verifying data:', 
            useWorkflowStore.getState().nodes.find(n => n.id === id)?.data?.llmConfig
          );
        }
      }, 100);
      
      toast.success('LLM configuration updated', {
        description: `Model: ${configData.model}`,
        duration: 3000
      });
    }
  };
  
  const handleMemoryConfigSave = (configData: any) => {
    if (id) {
      // Access updateNodeData from the workflow store
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      
      console.log('Saving Redis Memory configuration in node:', configData);
      
      // Update the node data
      updateNodeData(id, {
        memoryConfig: {
          // apiKeyId: configData.apiKeyId,
          // sessionKey: configData.sessionKey,
          sessionTTL: configData.sessionTTL,
          contextWindowLength: configData.contextWindowLength
        }
      });
      
      toast.success('Redis Memory configuration updated', {
        description: `Context Window: ${configData.contextWindowLength} messages`,
        duration: 3000
      });
    }
  };
  
  const handleChatConfigSave = (configData: any) => {
    if (id) {
      // Access updateNodeData from the workflow store
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      
      console.log('Saving Chat Trigger configuration in node:', configData);
      
      // Update the node data
      updateNodeData(id, {
        chatConfig: {
          isPublic: configData.isPublic,
          initialMessage: configData.initialMessage,
          mode: configData.mode,
          auth: configData.auth,
          chatId: configData.chatId
        }
      });
      
      toast.success('Chat Trigger configuration updated', {
        description: `Chat URL ${configData.isPublic ? 'is public' : 'is private'}`,
        duration: 3000
      });
    }
  };
  
  const handleWebhookConfigSave = (configData: any) => {
    if (id) {
      // Access updateNodeData from the workflow store
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      
      // Get current workflow ID from the store
      const workflowId = useWorkflowStore.getState().workflowId;
      
      console.log('Saving Webhook Response configuration:', {
        webhookUrl: configData.webhookUrl,
        isOneoff: configData.isOneoff,
        webhookId: configData.webhookId,
        apiEnabled: configData.apiEnabled,
        workflowId
      });
      
      // Update the node data
      updateNodeData(id, {
        webhookConfig: {
          webhookUrl: configData.webhookUrl,
          isOneoff: configData.isOneoff,
          webhookId: configData.webhookId,
          apiEnabled: configData.apiEnabled,
          workflowId: workflowId  // Include current workflow ID
        }
      });
      
      toast.success('Webhook configuration updated', {
        description: `API ${configData.apiEnabled ? 'enabled' : 'disabled'}`,
        duration: 3000
      });
    }
  };
  
  const handleSupabaseConfigSave = (configData: { supabaseUrl: string; supabaseKey: string }) => {
    if (id) {
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      console.log('Saving Supabase configuration in node:', configData);
      updateNodeData(id, {
        supabaseConfig: {
          supabaseUrl: configData.supabaseUrl,
          supabaseKey: configData.supabaseKey,
          // Preserve the existing sessionId and userId if they exist
          ...(data.supabaseConfig?.sessionId && { sessionId: data.supabaseConfig.sessionId }),
          ...(data.supabaseConfig?.userId && { userId: data.supabaseConfig.userId }),
        }
      });
      toast.success('Supabase configuration updated');
    }
  };
  
  const handleMultiAgentConfigSave = (configData: { 
    name: string; 
    model: string;
    description: string;
    instructions: string;
    provider: string;
    apiKeyId?: string;
    connectedNodes: {
      id: string;
      label: string;
      type: string;
      direction: 'input' | 'output';
      description?: string;
    }[];
  }) => {
    if (id) {
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      
      console.log('Saving Multi Agent configuration in node:', configData);
      
      updateNodeData(id, {
        multiAgentConfig: {
          name: configData.name,
          model: configData.model,
          description: configData.description,
          instructions: configData.instructions,
          provider: configData.provider,
          apiKeyId: configData.apiKeyId,
          connectedNodes: configData.connectedNodes
        }
      });
      
      toast.success('Multi Agent configuration updated');
    }
  };
  
  const handleLlmAgentConfigSave = (configData: { 
    name: string; 
    model: string;
    description: string;
    instructions: string;
    apiKeyId: string;
    provider: string;
  }) => {
    if (id) {
      const updateNodeData = useWorkflowStore.getState().updateNodeData;
      console.log('Saving LLM Agent configuration in node:', configData);
      updateNodeData(id, {
        llmAgentConfig: {
          name: configData.name,
          model: configData.model,
          description: configData.description,
          instructions: configData.instructions,
          apiKeyId: configData.apiKeyId,
          provider: configData.provider
        }
      });
      toast.success('LLM Agent configuration updated');
    }
  };
  
  // If it's a button style node, render a button
  if (isButtonNode) {
    return (
      <Button 
        className="py-3 px-5 rounded-md min-w-[120px] bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium shadow-[0_0_15px_-3px_rgba(236,72,153,0.5)] border border-pink-400 transition-all duration-200"
        onClick={() => console.log('Open chat clicked')}
      >
        <IconComponent className="h-5 w-5 mr-2" />
        {data.label}
      </Button>
    );
  }
  
  return (
    <>
      <div 
        className={cn(
          "p-4 rounded-lg border-2 bg-slate-800 flex flex-col min-w-[180px] transition-all duration-200 relative",
          isAIAgent ? "min-w-[280px] min-h-[240px]" : "",
          (isSerperApi || isGetPrice || isYahooFinanceNewsTool || isBraveSearchTool 
            || isScrapeWebsiteTool || isEXASearchTool || isHyperbrowserTool) ? "rounded-full !min-w-[120px] !min-h-[120px] flex items-center justify-center" : "",
          isMultiAgent
            ? selected 
              ? "border-yellow-500 shadow-[0_0_20px_-5px_rgba(234,179,8,0.7)]" 
              : "border-yellow-600 shadow-[0_0_10px_-5px_rgba(234,179,8,0.3)]"
            : isSupabaseAgent
            ? selected
              ? "border-green-500 shadow-[0_0_20px_-5px_rgba(34,197,94,0.7)]"
              : "border-green-600 shadow-[0_0_10px_-5px_rgba(34,197,94,0.3)]"
            : isAIAgent
            ? selected 
              ? "border-pink-500 shadow-[0_0_20px_-5px_rgba(236,72,153,0.7)]" 
              : "border-pink-600 shadow-[0_0_10px_-5px_rgba(236,72,153,0.3)]"
            : selected 
              ? "border-blue-500 shadow-[0_0_20px_-5px_rgba(59,130,246,0.7)]" 
              : "border-blue-600 shadow-[0_0_10px_-5px_rgba(59,130,246,0.3)]"
        )}
        onClick={
          isChatTrigger 
            ? handleOpenChat 
            : isLLMNode 
              ? handleOpenLlmConfig 
              : isMemoryNode
                ? handleOpenMemoryConfig
                : isAIAgent
                  ? handleOpenAiAgentConfig
                  : isWebhookResponse
                    ? handleOpenWebhookResponse
                    : isSupabaseAgent
                      ? handleOpenSupabaseConfig
                    : isMultiAgent
                      ? handleOpenMultiAgentConfig
                    : isLLMAgent
                      ? handleOpenLlmAgentConfig
                    : isToolNode
                      ? () => setIsToolModalOpen(true)
                    : undefined
        }
        style={(
          isChatTrigger || 
          isLLMNode || 
          isMemoryNode || 
          isAIAgent || 
          isWebhookResponse || 
          isSupabaseAgent ||
          isMultiAgent ||
          isLLMAgent ||
          isToolNode
        ) ? { cursor: 'pointer' } : undefined}
      >
        {/* Gradient glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-lg opacity-50 blur-sm",
          isMultiAgent 
            ? "bg-gradient-to-r from-yellow-600 to-amber-600 animate-pulse-slow"
            : isSupabaseAgent
            ? "bg-gradient-to-r from-green-600 to-emerald-600 animate-pulse-slow"
            : isAIAgent
            ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 animate-pulse-slow" 
            : "bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse-slow"
        )} />
        
        <div className="relative w-full flex flex-col items-center z-10">
          {isMultiAgent && data.multiAgentConfig?.name && (
            <div className="text-xs font-semibold text-yellow-400 mb-1 text-center break-all px-1">
              {data.multiAgentConfig.name}
            </div>
          )}
          {(isLLMAgent && data.llmAgentConfig?.name) && (
            <div className="text-xs font-semibold text-blue-400 mb-1 text-center break-all px-1">
              {data.llmAgentConfig.name}
            </div>
          )}
          <div className={cn(
            "flex-shrink-0 p-3 rounded-full mb-2 transition-all",
            isSerperApi || isGetPrice || isYahooFinanceNewsTool || isBraveSearchTool || isScrapeWebsiteTool || isEXASearchTool || isHyperbrowserTool
              ? "bg-slate-700 text-orange-400 !mb-1"
              : isMultiAgent
              ? "bg-slate-700 text-yellow-400"
              : isSupabaseAgent
              ? "bg-slate-700 text-green-400"
              : isAIAgent
              ? "bg-slate-700 text-pink-400" 
              : "bg-slate-700 text-blue-400"
          )}>
            <IconComponent className={cn("h-6 w-6", (isSerperApi || isGetPrice || isYahooFinanceNewsTool || isBraveSearchTool || 
              isScrapeWebsiteTool || isEXASearchTool || isHyperbrowserTool) && "h-8 w-8")} />
          </div>
          <div className={cn(
            "font-medium text-center text-white",
            (isSerperApi || isGetPrice || isYahooFinanceNewsTool || isBraveSearchTool || isScrapeWebsiteTool || isEXASearchTool || isHyperbrowserTool) && "text-sm"
          )}>{data.label}</div>
          
          {/* Display node description logic */}
          {isMultiAgent ? (
            data.multiAgentConfig?.description ? (
              <div className="text-xs text-slate-300 text-center mt-1 px-1 break-words">
                {data.multiAgentConfig.description}
              </div>
            ) : data.description ? (
              <div className="text-xs text-slate-300 text-center mt-1 px-1 break-words">
                {data.description}
              </div>
            ) : null
          ) : isLLMAgent ? (
            data.llmAgentConfig?.description ? (
              <div className="text-xs text-slate-300 text-center mt-1 px-1 break-words">
                {data.llmAgentConfig.description}
              </div>
            ) : data.description ? (
              <div className="text-xs text-slate-300 text-center mt-1 px-1 break-words">
                {data.description}
              </div>
            ) : null
          ) : isAIAgent && data.description ? (
            <div className="text-xs text-slate-300 text-center mt-1 px-1 break-words">
              {data.description}
            </div>
          ) : !isAIAgent && !isMultiAgent && !isLLMAgent && !isSerperApi && !isGetPrice && !isYahooFinanceNewsTool && 
          !isBraveSearchTool && !isScrapeWebsiteTool && !isEXASearchTool && !isHyperbrowserTool && data.description ? (
            <div className="text-xs text-slate-300 text-center mt-1 mb-1 px-1 break-words">
              {data.description}
            </div>
          ) : null}

          {data.hasError && (
            <div className="absolute top-2 right-2 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-pink-500" />
            </div>
          )}
        </div>
        
        {/* Chat button that appears only for Chat Trigger nodes */}
        {isChatTrigger && (
          <div className="absolute right-0 top-full mt-2 z-20">
            <Button 
              size="sm" 
              onClick={handleChatButtonClick}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium shadow-[0_0_15px_-3px_rgba(236,72,153,0.5)] border border-pink-400 transition-all duration-200 rounded-full p-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="ml-1.5">Open Chat</span>
            </Button>
          </div>
        )}
        
        {/* Child nodes connections for AI Agent */}
        {isAIAgent && data.childNodes && (
          <div className="relative z-10 mt-10 w-full flex justify-between px-4">
            {data.childNodes.map((childNode: any, index: number) => (
              <div key={index} className="flex flex-col items-center group relative mx-2">
                <div className="text-xs text-slate-300 group-hover:text-pink-300 transition-colors mb-2">{childNode.label}</div>
                
                <div className="w-full h-[1px] bg-pink-500/30 my-1"></div>
                
                <div className="relative flex items-center justify-center w-16 h-16 border-2 border-pink-500/50 rounded-lg bg-slate-700/80 hover:border-pink-400 hover:bg-slate-600/80 transition-all group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Plus size={24} className="text-pink-400 group-hover:text-pink-300" />
                    
                    {/* Output handle (source) - only keeping this one */}
                    <Handle
                      id={`${childNode.label.toLowerCase()}-output`}
                      type="source"
                      position={Position.Bottom}
                      className="!absolute !bottom-0 !translate-y-[50%] !bg-pink-500 !border-pink-400 !w-5 !h-5 hover:!w-6 hover:!h-6 hover:!bg-pink-400 !z-50 !transition-all"
                      style={{ left: '50%', transform: 'translate(-50%, 50%)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Input handles */}
        {/* Top input handle - Hide for Chat Trigger, Webhooks, HTTP, Transform, AI Agent, Supabase Agent, and Multi Agent */}
        {(!isChatTrigger && !isWebhookTrigger && !isWebhookResponse && !isHttpRequest && !isTransformData && !isAIAgent && !isSupabaseAgent && !isMultiAgent) && (
          <Handle 
            id="input-top"
            type="target" 
            position={Position.Top} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isMultiAgent
                ? "!bg-yellow-500 !border-yellow-400 !w-3 !h-3 hover:!bg-yellow-400 hover:!shadow-[0_0_10px_rgba(234,179,8,0.8)]"
                : isSupabaseAgent
                ? "!bg-green-500 !border-green-400 !w-3 !h-3 hover:!bg-green-400 hover:!shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                : isAIAgent
                ? "!bg-pink-500 !border-pink-400 !w-3 !h-3 hover:!bg-pink-400 hover:!shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
                : "!bg-blue-500 !border-blue-400 !w-3 !h-3 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            )}
          />
        )}
        
        {/* Left input handle - not shown for LLM, Memory, Chat Trigger nodes, or Multi Agent */}
        {(!isChatTrigger && !isLLMNode && !isMemoryNode && !isWebhookTrigger && !isMultiAgent && !isLLMAgent && !isSequentialAgent && !isParallelAgent && !isLoopAgent && !isSerperApi && !isGetPrice && !isYahooFinanceNewsTool 
        && !isBraveSearchTool && !isScrapeWebsiteTool && !isEXASearchTool && !isHyperbrowserTool) && (
          <Handle 
            id="input-left"
            type="target" 
            position={Position.Left} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isSupabaseAgent
                ? "!bg-green-500 !border-green-400 !w-3 !h-3 hover:!bg-green-400 hover:!shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                : isAIAgent
                ? "!bg-pink-500 !border-pink-400 !w-3 !h-3 hover:!bg-pink-400 hover:!shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
                : "!bg-blue-500 !border-blue-400 !w-3 !h-3 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            )}
          />
        )}
        
        {/* Right output handle - for Chat Trigger, Webhook nodes, HTTP Request, Transform Data, and all nodes except LLM, Memory, and Multi Agent */}
        {(isChatTrigger || isWebhookTrigger || isWebhookResponse || isHttpRequest || isTransformData || (!isLLMNode && !isMemoryNode && !isMultiAgent && !isLLMAgent && !isSequentialAgent && !isParallelAgent && !isLoopAgent 
        && !isSerperApi && !isGetPrice && !isYahooFinanceNewsTool && !isBraveSearchTool && !isScrapeWebsiteTool && !isEXASearchTool && !isHyperbrowserTool)) && (
          <Handle 
            id="output-right"
            type="source" 
            position={Position.Right} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isSupabaseAgent
                ? "!bg-green-500 !border-green-400 !w-3 !h-3 hover:!bg-green-400 hover:!shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                : isAIAgent
                ? "!bg-pink-500 !border-pink-400 !w-3 !h-3 hover:!bg-pink-400 hover:!shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
                : "!bg-blue-500 !border-blue-400 !w-3 !h-3 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            )}
          />
        )}
        
        {/* Bottom output handle - Keep this for Multi Agent */}
        {((!isChatTrigger && !isWebhookTrigger && !isWebhookResponse && !isHttpRequest && !isTransformData && !isLLMNode && !isMemoryNode && !isAIAgent && !isSupabaseAgent && !isSerperApi && !isGetPrice && !isYahooFinanceNewsTool && !isBraveSearchTool 
        && !isScrapeWebsiteTool && !isEXASearchTool && !isHyperbrowserTool) || isMultiAgent) && (
          <Handle 
            id="output-bottom"
            type="source" 
            position={Position.Bottom} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isMultiAgent
                ? "!bg-yellow-500 !border-yellow-400 !w-3 !h-3 hover:!bg-yellow-400 hover:!shadow-[0_0_10px_rgba(234,179,8,0.8)]"
                : isSupabaseAgent
                ? "!bg-green-500 !border-green-400 !w-3 !h-3 hover:!bg-green-400 hover:!shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                : isAIAgent
                ? "!bg-pink-500 !border-pink-400 !w-3 !h-3 hover:!bg-pink-400 hover:!shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
                : "!bg-blue-500 !border-blue-400 !w-3 !h-3 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            )}
          />
        )}
      </div>
      
      {/* Chat Trigger Modal */}
      {isChatTrigger && (
        <ChatTriggerModal 
          isOpen={isChatModalOpen} 
          onClose={() => setIsChatModalOpen(false)}
          nodeId={id}
          nodeData={(data && data.chatConfig) ? data.chatConfig : {}}
          onSave={handleChatConfigSave}
        />
      )}
      
      {/* LLM Configuration Modal */}
      {isLLMNode && llmProvider && (
        <LlmNodeModal
          isOpen={isLlmModalOpen}
          onClose={() => setIsLlmModalOpen(false)}
          provider={llmProvider}
          nodeData={data.llmConfig || {}}
          onSave={handleLlmConfigSave}
        />
      )}
      
      {/* Redis Memory Configuration Modal */}
      {isMemoryNode && (
        <RedisMemoryModal
          isOpen={isMemoryModalOpen}
          onClose={() => setIsMemoryModalOpen(false)}
          nodeId={id}
          nodeData={data.memoryConfig || {}}
          onSave={handleMemoryConfigSave}
        />
      )}
      
      {/* AI Agent Configuration Modal */}
      {isAIAgent && (
        <AiAgentModal
          isOpen={isAiAgentModalOpen}
          onClose={() => setIsAiAgentModalOpen(false)}
          nodeId={id}
        />
      )}
      
      {/* Webhook Response Modal */}
      {isWebhookResponse && (
        <WebhookResponseModal 
          isOpen={isWebhookResponseModalOpen} 
          onClose={() => setIsWebhookResponseModalOpen(false)}
          nodeId={id}
          nodeData={(data && data.webhookConfig) ? data.webhookConfig : {}}
          onSave={handleWebhookConfigSave}
        />
      )}
      
      {/* Supabase Agent Configuration Modal */}
      {isSupabaseAgent && (
        <SupabaseAgentModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          nodeId={id}
          nodeData={data.supabaseConfig}
          onSave={handleSupabaseConfigSave}
        />
      )}
      
      {/* Multi Agent Configuration Modal */}
      {isMultiAgent && (
        <MultiAgentModal
          isOpen={isMultiAgentModalOpen}
          onClose={() => setIsMultiAgentModalOpen(false)}
          nodeId={id}
          nodeData={data.multiAgentConfig}
          onSave={handleMultiAgentConfigSave}
        />
      )}
      
      {/* LLM Agent Configuration Modal */}
      {isLLMAgent && (
        <LlmAgentModal
          isOpen={isLlmAgentModalOpen}
          onClose={() => setIsLlmAgentModalOpen(false)}
          nodeId={id}
          nodeData={data.llmAgentConfig}
          onSave={handleLlmAgentConfigSave}
        />
      )}
      
      {/* Chat Session Modal */}
      <Dialog open={isChatSessionOpen} onOpenChange={(open) => !open && setIsChatSessionOpen(false)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Chat Session (ID: {chatSessionId})
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-4 max-h-[50vh]">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex flex-col p-3 rounded-lg max-w-[80%]",
                  msg.role === 'user' 
                    ? "ml-auto bg-blue-600 text-white" 
                    : "mr-auto bg-slate-700 text-slate-100"
                )}
              >
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 pt-2 border-t">
            <Textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 min-h-[60px] resize-none"
            />
            <Button onClick={handleSendMessage} className="self-end">Send</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tools Configuration Modal */}
      {isToolNode && (
        <ToolsModal
          isOpen={isToolModalOpen}
          onClose={() => setIsToolModalOpen(false)}
          nodeId={id}
          toolType={data.label}
          nodeData={data.toolConfig}
          onSave={handleToolConfigSave}
        />
      )}
    </>
  );
}

export const ActionNode = memo(ActionNodeComponent);