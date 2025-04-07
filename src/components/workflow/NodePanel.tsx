'use client';

import { useState, useEffect } from 'react';
import { nodeCatalog } from './nodeTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkflowStore } from '@/lib/store/workflow';
import { Search, ChevronDown, ChevronUp, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NodePanelProps {
  onToggle?: () => void;
}

export function NodePanel({ onToggle }: NodePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const addNode = useWorkflowStore((state) => state.addNode);

  // Filter nodeCatalog to only include AI nodes
  const aiNodes = nodeCatalog.filter(node => 
    node.category === 'AI' || 
    node.category === 'Basic' || 
    node.category === 'Triggers' ||
    node.category === 'Actions' ||
    node.category === 'LLM APIs' ||
    node.category === 'Webhook' 
  );
  
  // Get unique categories
  const categories = [...new Set(aiNodes.map(node => node.category))];
  
  // Initialize all categories as collapsed on first render
  useEffect(() => {
    const initialCollapsedState = categories.reduce((acc, category) => {
      acc[category] = true; // Set all categories to be collapsed
      return acc;
    }, {} as Record<string, boolean>);
    
    setCollapsedCategories(initialCollapsedState);
  }, []);

  // Filter nodes based on search query
  const filteredNodes = searchQuery.trim() 
    ? aiNodes.filter(node => 
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : aiNodes;

  // Group nodes by category
  const nodesByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredNodes.filter(node => node.category === category);
    return acc;
  }, {} as Record<string, typeof nodeCatalog>);

  const toggleCategory = (category: string) => {
    setCollapsedCategories({
      ...collapsedCategories,
      [category]: !collapsedCategories[category]
    });
  };

  const onDragStart = (event: React.DragEvent, node: any) => {
    // Set the drag data
    event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (nodeType: any) => {
    // Generate a unique ID
    const id = `${nodeType.type}-${Date.now()}`;
    
    // Create the node
    const newNode = {
      id,
      type: nodeType.type,
      position: { x: 100, y: 100 },
      data: {
        label: nodeType.label,
        description: nodeType.description,
        type: nodeType.type,
        icon: nodeType.icon,
        hasError: nodeType.hasError,
        childNodes: nodeType.childNodes
      }
    };
    
    // Add the node to the store
    addNode(newNode);
  };

  return (
    <div className="w-full h-full flex flex-col border-r border-border">
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {categories.map(category => {
            const categoryNodes = nodesByCategory[category] || [];
            const isCollapsed = !!collapsedCategories[category];
            
            if (categoryNodes.length === 0) return null;
            
            return (
              <div key={category} className="mb-4">
                <button
                  className="w-full flex items-center justify-between p-2 text-sm font-medium hover:bg-secondary rounded-md mb-1"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                
                {!isCollapsed && (
                  <div className="space-y-1 pl-2">
                    {categoryNodes.map((node) => (
                      <div
                        key={`${node.type}-${node.label}`}
                        className="flex items-center p-2 rounded-md border border-border hover:bg-accent cursor-grab bg-card"
                        draggable
                        onDragStart={(event) => onDragStart(event, node)}
                        onClick={() => handleAddNode(node)}
                      >
                        <div className={cn(
                          "mr-2 p-1 rounded-full",
                          node.type === 'trigger' ? "bg-blue-500" :
                          node.type === 'output' ? "bg-green-500" : "bg-amber-500"
                        )}>
                          <node.icon size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{node.label}</div>
                          <div className="text-xs text-muted-foreground">{node.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 