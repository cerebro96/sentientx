'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';
import { CircleIcon, AlertTriangle, Bot, MessageCircle, Plus, BrainCircuit, DatabaseZap, Webhook, Globe, FileJson, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChatTriggerModal } from '../chat-trigger-modal';
import { LlmNodeModal } from '../llm-node-modal';
import { useWorkflowStore } from '@/lib/store/workflow';

function ActionNodeComponent({ id, data, selected }: NodeProps<NodeData>) {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isLlmModalOpen, setIsLlmModalOpen] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string>('');
  
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
  
  // Handle icon selection based on node type
  let IconComponent;
  
  // Select the appropriate icon based on node type
  if (isAIAgent) {
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
  } else {
    IconComponent = CircleIcon;
  }
  
  const handleOpenChat = () => {
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
  
  const handleChatButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('Chat interface opened', {
      description: 'Users can now interact with your chat',
      duration: 3000
    });
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
          isAIAgent 
            ? selected 
              ? "border-pink-500 shadow-[0_0_20px_-5px_rgba(236,72,153,0.7)]" 
              : "border-pink-600 shadow-[0_0_10px_-5px_rgba(236,72,153,0.3)]"
            : selected 
              ? "border-blue-500 shadow-[0_0_20px_-5px_rgba(59,130,246,0.7)]" 
              : "border-blue-600 shadow-[0_0_10px_-5px_rgba(59,130,246,0.3)]"
        )}
        onClick={isChatTrigger ? handleOpenChat : isLLMNode ? handleOpenLlmConfig : undefined}
        style={(isChatTrigger || isLLMNode) ? { cursor: 'pointer' } : undefined}
      >
        {/* Gradient glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-lg opacity-50 blur-sm",
          isAIAgent 
            ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 animate-pulse-slow" 
            : "bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse-slow"
        )} />
        
        <div className="relative w-full flex flex-col items-center mb-2 z-10">
          <div className={cn(
            "flex-shrink-0 p-3 rounded-full mb-2 transition-all",
            isAIAgent 
              ? "bg-slate-700 text-pink-400" 
              : "bg-slate-700 text-blue-400"
          )}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div className="font-medium text-center text-white">{data.label}</div>
          {isAIAgent && (
            <div className="text-xs text-slate-300 text-center mt-1">{data.description}</div>
          )}
          {data.hasError && (
            <div className="absolute top-2 right-2 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-pink-500" />
            </div>
          )}
        </div>
        
        {!isAIAgent && data.description && (
          <div className="relative z-10 text-xs text-slate-300 text-center mt-1 mb-1">{data.description}</div>
        )}
        
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
        {/* Top input handle - always shown for LLM and Memory nodes, and other nodes except Chat Trigger, Webhook nodes, HTTP Request, Transform Data, and AI Agent */}
        {(!isChatTrigger && !isWebhookTrigger && !isWebhookResponse && !isHttpRequest && !isTransformData && !isAIAgent) && (
          <Handle 
            id="input-top"
            type="target" 
            position={Position.Top} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isAIAgent 
                ? "!bg-pink-500 !border-pink-400 !w-3 !h-3 hover:!bg-pink-400 hover:!shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
                : "!bg-blue-500 !border-blue-400 !w-3 !h-3 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            )}
          />
        )}
        
        {/* Left input handle - not shown for LLM, Memory, or Chat Trigger nodes */}
        {(!isChatTrigger && !isLLMNode && !isMemoryNode && !isWebhookTrigger) && (
          <Handle 
            id="input-left"
            type="target" 
            position={Position.Left} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isAIAgent 
                ? "!bg-pink-500 !border-pink-400 !w-3 !h-3 hover:!bg-pink-400 hover:!shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
                : "!bg-blue-500 !border-blue-400 !w-3 !h-3 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            )}
          />
        )}
        
        {/* Right output handle - for Chat Trigger, Webhook nodes, HTTP Request, Transform Data, and all nodes except LLM and Memory */}
        {(isChatTrigger || isWebhookTrigger || isWebhookResponse || isHttpRequest || isTransformData || (!isLLMNode && !isMemoryNode)) && (
          <Handle 
            id="output-right"
            type="source" 
            position={Position.Right} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isAIAgent 
                ? "!bg-pink-500 !border-pink-400 !w-3 !h-3 hover:!bg-pink-400 hover:!shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
                : "!bg-blue-500 !border-blue-400 !w-3 !h-3 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            )}
          />
        )}
        
        {/* Bottom output handle - not shown for Chat Trigger, Webhook nodes, HTTP Request, Transform Data, LLM, or Memory nodes */}
        {(!isChatTrigger && !isWebhookTrigger && !isWebhookResponse && !isHttpRequest && !isTransformData && !isLLMNode && !isMemoryNode) && (
          <Handle 
            id="output-bottom"
            type="source" 
            position={Position.Bottom} 
            className={cn(
              "!transition-all hover:!w-4 hover:!h-4",
              isAIAgent 
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
    </>
  );
}

export const ActionNode = memo(ActionNodeComponent); 