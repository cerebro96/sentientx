'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Key, HelpCircle, FileText, Users, MessageSquare, BookOpen, Bug, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  
  return (
    <div className="h-screen w-64 border-r bg-background p-4 flex flex-col">
      <div className="flex items-center mb-8">
        <Link href="/" className="flex items-center">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.5 12H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.5 7.5L7.5 12L10.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="ml-2 text-xl font-bold">SentientX</span>
        </Link>
      </div>
      
      <nav className="space-y-1 flex-1">
        <Link 
          href="/" 
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md",
            pathname === "/" || pathname === "/dashboard"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          <LayoutDashboard className="mr-3 h-5 w-5" />
          Overview
        </Link>
        {/* <Link href="/templates" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground">
          <Layers className="mr-3 h-5 w-5" />
          Templates
        </Link> */}
        <Link 
          href="/executions" 
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md",
            pathname === "/executions"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          <Activity className="mr-3 h-5 w-5" />
          Executions
        </Link>
        <Link 
          href="/credentials" 
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md",
            pathname === "/credentials"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          <Key className="mr-3 h-5 w-5" />
          Credentials
        </Link>
      </nav>
      
      <div className="pt-4 border-t space-y-1">
        <Link 
          href="/help" 
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md",
            pathname === "/help"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          <HelpCircle className="mr-3 h-5 w-5" />
          Help
        </Link>
        {/* <Link href="/quickstart" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground">
          <FileText className="mr-3 h-5 w-5" />
          Quickstart
        </Link> */}
        <Link 
          href="/documentation" 
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md",
            pathname === "/documentation"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          <BookOpen className="mr-3 h-5 w-5" />
          Documentation
        </Link>
        {/* <Link href="/forum" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground">
          <MessageSquare className="mr-3 h-5 w-5" />
          Forum
        </Link> */}
        {/* <Link href="/course" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground">
          <Users className="mr-3 h-5 w-5" />
          Course
        </Link> */}
        <Link 
          href="/report-bug" 
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md",
            pathname === "/report-bug"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          <Bug className="mr-3 h-5 w-5" />
          Report a bug
        </Link>
      </div>
    </div>
  );
} 