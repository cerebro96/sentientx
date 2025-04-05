'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';
import { CircleIcon, AlertTriangle, Bot, MessageCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function ActionNodeComponent({ data, selected }: NodeProps<NodeData>) {
  // Check node types
  const isAIAgent = data.label === 'AI Agent';
  const isButtonNode = data.buttonStyle === true;
  
  // Safely render icon component
  const IconComponent = isAIAgent ? (data.icon || Bot) : 
                       isButtonNode ? (data.icon || MessageCircle) : 
                       CircleIcon;
  
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
    <div 
      className={cn(
        "p-4 rounded-lg border-2 bg-slate-800 flex flex-col min-w-[180px] transition-all duration-200 relative",
        isAIAgent 
          ? selected 
            ? "border-pink-500 shadow-[0_0_20px_-5px_rgba(236,72,153,0.7)]" 
            : "border-pink-600 shadow-[0_0_10px_-5px_rgba(236,72,153,0.3)]"
          : selected 
            ? "border-blue-500 shadow-[0_0_20px_-5px_rgba(59,130,246,0.7)]" 
            : "border-blue-600 shadow-[0_0_10px_-5px_rgba(59,130,246,0.3)]"
      )}
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
      
      {/* Child nodes connections for AI Agent */}
      {isAIAgent && data.childNodes && (
        <div className="relative z-10 mt-3 w-full flex justify-between px-6">
          {data.childNodes.map((childNode: any, index: number) => (
            <div key={index} className="flex flex-col items-center group">
              <div className="w-3 h-3 bg-pink-500 rotate-45 mb-1 group-hover:scale-110 transition-transform"></div>
              <div className="text-xs text-slate-300 group-hover:text-pink-300 transition-colors">{childNode.label}</div>
              <div className="mt-2 p-1 border border-slate-600 rounded-full bg-slate-700 hover:border-pink-400 hover:bg-slate-600 transition-colors group-hover:scale-110 group-hover:shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                <Plus size={14} className="text-pink-400 group-hover:text-pink-300" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Multiple input handles */}
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
      
      {/* Multiple output handles */}
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
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent); 