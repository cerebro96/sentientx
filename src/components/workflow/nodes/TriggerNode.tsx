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
        "p-4 rounded-xl border-2 shadow-md bg-white flex flex-col items-center min-w-[180px]",
        selected ? "border-primary ring-2 ring-primary/30" : "border-gray-200"
      )}
    >
      <div className="w-full flex flex-col items-center mb-2">
        <div className={cn(
          "flex-shrink-0 p-3 rounded-full mb-2",
          isChatTrigger ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-600"
        )}>
          <IconComponent className="h-6 w-6" />
        </div>
        <div className="font-medium text-center">{data.label}</div>
      </div>
      
      {data.description && (
        <div className="text-xs text-muted-foreground text-center mt-1 mb-1">{data.description}</div>
      )}
      
      {/* Multiple output handles */}
      <Handle 
        id="output-right"
        type="source" 
        position={Position.Right} 
        className="!bg-primary !border-primary/30 !w-3 !h-3"
      />
      <Handle 
        id="output-bottom"
        type="source" 
        position={Position.Bottom} 
        className="!bg-primary !border-primary/30 !w-3 !h-3"
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent); 