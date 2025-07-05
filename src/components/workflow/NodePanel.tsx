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
  agentType?: string;
}

export function NodePanel({ onToggle, agentType }: NodePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const addNode = useWorkflowStore((state) => state.addNode);

  // Filter nodeCatalog to only include non-hidden nodes
  const availableNodes = nodeCatalog.filter(node => !node.hidden);

  // Define category mappings based on agent type
  const getCategoriesForAgentType = (agentType?: string): string[] => {
    switch (agentType) {
      case 'multi_agent':
        return ['Multi Agentic', 'Tools'];
      case 'prebuild_agents':
        return ['Pre-Built Agents','Triggers'];
      case 'single_agent':
      default:
        return ['LLM APIs', 'Triggers', 'AI', 'Webhook'];
    }
  };

  // Get allowed categories based on agent type
  const allowedCategories = getCategoriesForAgentType(agentType);

  // Get unique categories from available nodes, filtered by agent type
  const categories = [...new Set(availableNodes.map(node => node.category))]
    .filter(category => allowedCategories.includes(category));

  // Initialize all categories as collapsed on first render
  useEffect(() => {
    const initialCollapsedState = categories.reduce((acc, category) => {
      acc[category] = true; // Set all categories to be collapsed
      return acc;
    }, {} as Record<string, boolean>);
    
    setCollapsedCategories(initialCollapsedState);
  }, [categories.join(',')]); // Update when categories change

  // Filter nodes based on search query and agent type
  const filteredNodes = searchQuery.trim() 
    ? availableNodes.filter(node => // Search only available nodes (excluding hidden ones)
        (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
        allowedCategories.includes(node.category)
      )
    : availableNodes.filter(node => allowedCategories.includes(node.category)); // Filter by agent type

  // Determine categories based on whether we are searching or not
  const currentCategories = searchQuery.trim()
    ? [...new Set(filteredNodes.map(node => node.category))] // Categories from search results
    : categories; // Default categories (from available nodes)

  // Group nodes by category
  const nodesByCategory = currentCategories.reduce((acc, category) => {
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
    event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (nodeType: any) => {
    const id = `${nodeType.type}-${Date.now()}`;
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
          {searchQuery.trim() ? (
            // If searching, render a flat list of filtered nodes
            <div className="space-y-1">
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => (
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
                      {/* Ensure icon exists before rendering */}
                      {node.icon && <node.icon size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{node.label}</div>
                      <div className="text-xs text-muted-foreground">{node.description}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground p-4">No nodes found matching your search.</p>
              )}
            </div>
          ) : (
            // If not searching, render nodes grouped by category
            currentCategories.map(category => {
            const categoryNodes = nodesByCategory[category] || [];
            const isCollapsed = !!collapsedCategories[category];
            
              if (categoryNodes.length === 0) return null; // Hide empty categories when not searching
            
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
                            {/* Ensure icon exists before rendering */}
                            {node.icon && <node.icon size={16} />}
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
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 