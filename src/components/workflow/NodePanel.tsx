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

  // Filter nodeCatalog to only include non-hidden nodes
  const availableNodes = nodeCatalog.filter(node => !node.hidden);

  // Get unique categories from available nodes
  const categories = [...new Set(availableNodes.map(node => node.category))];
  
  // Initialize all categories as collapsed on first render
  useEffect(() => {
    const initialCollapsedState = categories.reduce((acc, category) => {
      acc[category] = true; // Set all categories to be collapsed
      return acc;
    }, {} as Record<string, boolean>);
    
    setCollapsedCategories(initialCollapsedState);
  }, []);

  // Filter nodes based on search query. Search *all* nodes if query exists.
  const filteredNodes = searchQuery.trim()
    ? nodeCatalog.filter(node => // Search the full catalog
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableNodes; // Default to non-hidden nodes

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