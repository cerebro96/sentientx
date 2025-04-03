import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Clock, Activity, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';

interface WorkflowItemProps {
  id: string;
  title: string;
  description?: string;
  lastUpdated: string;
  created: string;
  isPersonal: boolean;
  isActive: boolean;
  tags?: string[];
  onEdit: () => void;
}

export function WorkflowItem({
  id,
  title,
  description,
  lastUpdated,
  created,
  isPersonal,
  isActive,
  tags = [],
  onEdit
}: WorkflowItemProps) {
  // Convert dates to display format
  const formattedDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (error) {
      return dateStr;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow" onClick={onEdit}>
      <CardContent className="p-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Title */}
            <h3 className="font-medium text-sm truncate">{title}</h3>
            
            {/* Tags count */}
            {tags.length > 0 && (
              <div className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 whitespace-nowrap">
                <Tag className="h-2.5 w-2.5" />
                <span>{tags.length}</span>
              </div>
            )}
            
            {/* Status indicators */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formattedDate(lastUpdated)}
              </span>
              
              <Activity className={`h-3 w-3 ${isActive ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
} 