'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

function TriggerNodeComponent({ data, selected }: NodeProps<NodeData>) {
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border shadow-sm bg-background flex flex-col min-w-[200px]",
        selected ? "border-primary" : "border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 p-1 rounded-md bg-amber-100 text-amber-600">
          <Zap className="h-4 w-4" />
        </div>
        <div className="font-medium truncate flex-1">{data.label}</div>
      </div>
      
      {data.description && (
        <div className="text-xs text-muted-foreground mt-1">{data.description}</div>
      )}
      
      {/* Only output handle for trigger node */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-primary !border-primary !w-3 !h-3"
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent); 