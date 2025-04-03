'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Share2, MoreHorizontal, ChevronLeft, Tag, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateWorkflow } from '@/lib/workflows';
import { toast } from 'sonner';

interface WorkflowHeaderProps {
  name: string;
  onNameChange: (name: string) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
  onBack?: () => void;
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  workflowId?: string;
}

export function WorkflowHeader({ 
  name, 
  onNameChange, 
  isActive, 
  onActiveChange,
  onBack,
  tags = [],
  onTagsChange,
  workflowId
}: WorkflowHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isTagInputOpen, setIsTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [workflowTags, setWorkflowTags] = useState<string[]>(tags);

  // Update local tags when props change
  useEffect(() => {
    setWorkflowTags(tags);
  }, [tags]);

  const handleNameSubmit = () => {
    if (editedName.trim()) {
      onNameChange(editedName);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedName(name);
      setIsEditing(false);
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    } else if (e.key === 'Escape') {
      setIsTagInputOpen(false);
      setTagInput('');
    }
  };

  const addTag = async (tag: string) => {
    if (!tag.trim() || workflowTags.includes(tag.trim())) {
      return;
    }

    const newTags = [...workflowTags, tag.trim()];
    setWorkflowTags(newTags);
    setTagInput('');
    setIsTagInputOpen(false);

    // Notify parent component of tag changes
    if (onTagsChange) {
      onTagsChange(newTags);
    }
    
    // Update in database if we have a workflow ID
    if (workflowId) {
      try {
        await updateWorkflow(workflowId, { tags: newTags });
      } catch (error) {
        console.error('Error updating workflow tags:', error);
      }
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const newTags = workflowTags.filter(tag => tag !== tagToRemove);
    setWorkflowTags(newTags);

    // Notify parent component of tag changes
    if (onTagsChange) {
      onTagsChange(newTags);
    }
    
    // Update in database if we have a workflow ID
    if (workflowId) {
      try {
        await updateWorkflow(workflowId, { tags: newTags });
      } catch (error) {
        console.error('Error updating workflow tags:', error);
      }
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 mr-2" 
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {isEditing ? (
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="h-7 text-lg font-medium w-[200px]"
            autoFocus
          />
        ) : (
          <h1 
            className="text-lg font-medium cursor-pointer hover:text-primary"
            onClick={() => setIsEditing(true)}
          >
            {name}
          </h1>
        )}
        
        {/* Tags section */}
        <div className="flex items-center space-x-2">
          {workflowTags.map(tag => (
            <div 
              key={tag} 
              className="bg-secondary text-secondary-foreground flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            >
              <Tag className="h-3 w-3" />
              <span>{tag}</span>
              <button 
                onClick={() => removeTag(tag)} 
                className="text-muted-foreground hover:text-destructive ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {isTagInputOpen ? (
            <div className="relative">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) {
                    addTag(tagInput.trim());
                  } else {
                    setIsTagInputOpen(false);
                  }
                }}
                className="h-6 w-32 text-xs p-1"
                placeholder="Add tag..."
                autoFocus
              />
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => setIsTagInputOpen(true)}
            >
              + Add tag
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={onActiveChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          {/* <Button size="sm" className="h-7">
            Save
          </Button> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Export</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
} 