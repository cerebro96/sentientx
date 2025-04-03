'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '@/lib/store/workflow';
import { cn } from "@/lib/utils";

export const BaseNode = memo(({
  data,
  selected,
  isConnectable = true,
}: NodeProps<NodeData>) => {
  const hasInputHandle = data.type !== 'trigger';
  const hasOutputHandle = data.type !== 'output';

  return (
    <div
      className={cn(
        "px-4 py-2 shadow-md rounded-md border border-border bg-card text-card-foreground",
        "w-[200px] min-h-[60px]",
        selected ? "ring-2 ring-primary" : ""
      )}
    >
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary border-2 border-background"
        />
      )}
      
      <div className="flex flex-col gap-1">
        <div className="font-semibold truncate">{data.label}</div>
        {data.description && (
          <div className="text-xs text-muted-foreground truncate">{data.description}</div>
        )}
      </div>
      
      {hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary border-2 border-background"
        />
      )}
    </div>
  );
}); 