'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';
import { Zap, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function TriggerNodeComponent({ data, selected }: NodeProps<NodeData>) {
  const isChatTrigger = data.label === 'When chat message received';
  
  // Use the node's icon if available, otherwise use appropriate default
  const IconComponent = data.icon || (isChatTrigger ? MessageCircle : Zap);
  
  return (
    <div 
      className={cn(
        "p-4 rounded-lg border-2 bg-slate-800 flex flex-col items-center min-w-[180px]",
        "transition-all duration-200 relative group",
        selected 
          ? "border-blue-500 shadow-[0_0_20px_-5px_rgba(59,130,246,0.7)]" 
          : "border-blue-600 shadow-[0_0_10px_-5px_rgba(59,130,246,0.3)]"
      )}
    >
      {/* Gradient glow effect */}
      <div className="absolute inset-0 rounded-lg opacity-50 blur-sm bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse-slow" />
      
      <div className="relative w-full flex flex-col items-center mb-2 z-10">
        <div className={cn(
          "flex-shrink-0 p-3 rounded-full mb-2 transition-all",
          isChatTrigger 
            ? "bg-slate-700 text-blue-400" 
            : "bg-slate-700 text-indigo-400"
        )}>
          <IconComponent className="h-6 w-6" />
        </div>
        <div className="font-medium text-center text-white">{data.label}</div>
      </div>
      
      {data.description && (
        <div className="relative z-10 text-xs text-slate-300 text-center mt-1 mb-1">{data.description}</div>
      )}
      
      {/* Multiple output handles */}
      <Handle 
        id="output-right"
        type="source" 
        position={Position.Right} 
        className="!bg-blue-500 !border-blue-400 !w-3 !h-3 !transition-all hover:!w-4 hover:!h-4 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
      />
      <Handle 
        id="output-bottom"
        type="source" 
        position={Position.Bottom} 
        className="!bg-blue-500 !border-blue-400 !w-3 !h-3 !transition-all hover:!w-4 hover:!h-4 hover:!bg-blue-400 hover:!shadow-[0_0_10px_rgba(59,130,246,0.8)]"
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent); 