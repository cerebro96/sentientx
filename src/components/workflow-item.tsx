import { MoreVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface WorkflowItemProps {
  title: string;
  lastUpdated: string;
  created: string;
  isPersonal: boolean;
  isActive: boolean;
}

export function WorkflowItem({ title, lastUpdated, created, isPersonal, isActive }: WorkflowItemProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <h3 className="text-lg font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">
              Last updated {lastUpdated} | Created {created}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isPersonal && (
              <div className="flex items-center rounded-full bg-muted px-2 py-1 text-xs">
                <User className="mr-1 h-3 w-3" />
                <span>Personal</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="text-xs mr-2">Inactive</span>
              <div className={`h-4 w-8 rounded-full ${isActive ? "bg-green-500" : "bg-gray-300"} relative`}>
                <div className={`absolute h-3 w-3 rounded-full bg-white top-0.5 transition-all ${isActive ? "left-4" : "left-1"}`}></div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 