'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';
import { SquareIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function OutputNodeComponent({ data, selected }: NodeProps<NodeData>) {
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border shadow-sm bg-background flex flex-col min-w-[200px]",
        selected ? "border-primary" : "border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 p-1 rounded-md bg-green-100 text-green-600">
          <SquareIcon className="h-4 w-4" />
        </div>
        <div className="font-medium truncate flex-1">{data.label}</div>
      </div>
      
      {data.description && (
        <div className="text-xs text-muted-foreground mt-1">{data.description}</div>
      )}
      
      {/* Only input handle for output node */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-muted !border-muted-foreground !w-3 !h-3"
      />
    </div>
  );
}

export const OutputNode = memo(OutputNodeComponent); 