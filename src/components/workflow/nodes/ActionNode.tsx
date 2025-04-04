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
        className="py-3 px-5 rounded-md min-w-[120px] bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-md"
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
        "p-4 rounded-xl border-2 shadow-md bg-white flex flex-col min-w-[180px]",
        isAIAgent ? "border-red-500" : selected ? "border-primary ring-2 ring-primary/30" : "border-gray-200"
      )}
    >
      <div className="w-full flex flex-col items-center mb-2">
        <div className={cn(
          "flex-shrink-0 p-3 rounded-full mb-2",
          isAIAgent ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-600"
        )}>
          <IconComponent className="h-6 w-6" />
        </div>
        <div className="font-medium text-center">{data.label}</div>
        {isAIAgent && (
          <div className="text-xs text-gray-500 text-center mt-1">{data.description}</div>
        )}
        {data.hasError && (
          <div className="absolute top-2 right-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      
      {!isAIAgent && data.description && (
        <div className="text-xs text-muted-foreground text-center mt-1 mb-1">{data.description}</div>
      )}
      
      {/* Child nodes connections for AI Agent */}
      {isAIAgent && data.childNodes && (
        <div className="mt-3 w-full flex justify-between px-6">
          {data.childNodes.map((childNode: any, index: number) => (
            <div key={index} className="flex flex-col items-center">
              <div className="w-3 h-3 bg-blue-500 rotate-45 mb-1"></div>
              <div className="text-xs text-gray-600">{childNode.label}</div>
              <div className="mt-2 p-1 border border-gray-300 rounded-full bg-white">
                <Plus size={14} className="text-gray-500" />
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
        className="!bg-gray-400 !border-gray-300 !w-3 !h-3"
      />
      <Handle 
        id="input-top"
        type="target" 
        position={Position.Top} 
        className="!bg-gray-400 !border-gray-300 !w-3 !h-3"
      />
      
      {/* Multiple output handles */}
      <Handle 
        id="output-right"
        type="source" 
        position={Position.Right} 
        className="!bg-gray-400 !border-gray-300 !w-3 !h-3"
      />
      <Handle 
        id="output-bottom"
        type="source" 
        position={Position.Bottom} 
        className="!bg-gray-400 !border-gray-300 !w-3 !h-3"
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent); 