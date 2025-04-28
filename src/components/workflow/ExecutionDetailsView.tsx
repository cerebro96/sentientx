'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchWebhookInteractions, WebhookInteraction } from '@/lib/data-fetching'; // Adjust path if needed
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RefreshCw, AlertCircle, Info, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ExecutionDetailsViewProps {
  workflowId: string;
}

// Helper to format timestamp
const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const relativeTime = formatDistanceToNow(date, { addSuffix: true });
    const absoluteTime = format(date, "MMM d, yyyy 'at' h:mm a"); // e.g., Jan 5, 2024 at 3:15 PM
    return (
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground font-medium" title={absoluteTime}>{relativeTime}</span>
        <span className="text-xs text-muted-foreground/80">{absoluteTime}</span>
      </div>
    );
  } catch {
    return timestamp; // Fallback
  }
};

// Helper to render JSON nicely
const JsonViewer = ({ data }: { data: any }) => {
  try {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return <pre className="text-xs whitespace-pre-wrap break-all bg-muted/50 p-2 rounded-md"><code>{jsonString}</code></pre>;
  } catch {
    return <span className="text-xs text-destructive">Invalid JSON data</span>;
  }
};

export function ExecutionDetailsView({ workflowId }: ExecutionDetailsViewProps) {
  const [interactions, setInteractions] = useState<WebhookInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== debouncedSearchTerm) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debouncedSearchTerm]);

  const loadInteractions = async (
    pageToLoad: number = currentPage,
    search: string = debouncedSearchTerm,
    isManualRefresh = false
  ) => {
    if (isLoading && isAutoRefreshEnabled && !isManualRefresh) return;

    setIsLoading(true);
    if (!isAutoRefreshEnabled || isManualRefresh) {
      setError(null);
    }

    try {
      const { data, count } = await fetchWebhookInteractions(workflowId, pageToLoad, pageSize, search);
      setInteractions(data);
      setTotalCount(count || 0);
      if (pageToLoad !== currentPage) {
        setCurrentPage(pageToLoad);
      }
      setError(null);
    } catch (err) {
      console.error("Failed to load webhook interactions:", err);
      if (!error) {
        setError("Failed to load execution details. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workflowId) {
      setIsAutoRefreshEnabled(false);
      if (currentPage !== 1) setCurrentPage(1);
      setInteractions([]);
      setTotalCount(0);
      loadInteractions(1, debouncedSearchTerm, true);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [workflowId, debouncedSearchTerm]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isAutoRefreshEnabled && !isLoading) {
      intervalRef.current = setInterval(() => {
        loadInteractions(currentPage, debouncedSearchTerm, false);
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAutoRefreshEnabled, currentPage, isLoading, workflowId, debouncedSearchTerm]);

  const handleRefresh = () => {
    loadInteractions(currentPage, debouncedSearchTerm, true);
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      loadInteractions(newPage, debouncedSearchTerm, true);
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  }

  if (isLoading && interactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading execution details...</span>
      </div>
    );
  }

  if (error && !isLoading && interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-semibold mb-2">Error Loading Data</p>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={handleRefresh} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (interactions.length === 0 && !isLoading) {
    const isEmptyBecauseOfSearch = debouncedSearchTerm !== '';
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        {isEmptyBecauseOfSearch ? (
          <Search className="h-8 w-8 mb-2" />
        ) : (
          <Info className="h-8 w-8 mb-2" />
        )}
        <p className="font-semibold mb-2">
          {isEmptyBecauseOfSearch ? 'No Matching Interactions' : 'No Interactions Found'}
        </p>
        <p className="text-sm">
          {isEmptyBecauseOfSearch
            ? `Your search for "${debouncedSearchTerm}" did not match any interactions.`
            : 'There are no webhook interactions recorded for this workflow yet.'}
        </p>
        {isEmptyBecauseOfSearch && (
          <Button onClick={handleClearSearch} variant="link" size="sm" className="mt-2">
            Clear Search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
        <h2 className="text-xl font-semibold whitespace-nowrap">Webhook Interactions</h2>
        <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search interactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8 w-full"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh-switch"
              checked={isAutoRefreshEnabled}
              onCheckedChange={setIsAutoRefreshEnabled}
              disabled={isLoading && isAutoRefreshEnabled}
            />
            <Label htmlFor="auto-refresh-switch" className="text-sm text-muted-foreground whitespace-nowrap">
              Auto-Refresh (5s)
            </Label>
          </div>
          <Button onClick={handleRefresh} size="sm" variant="outline" disabled={isLoading && !isAutoRefreshEnabled}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      {error && interactions.length > 0 && (
        <div className="mb-2 p-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
      <ScrollArea className="flex-1 mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[100px]">Event Type</TableHead>
              <TableHead className="w-[100px]">Session ID</TableHead>
              <TableHead className="w-[100px]">Webhook ID</TableHead>
              <TableHead>Request Body</TableHead>
              <TableHead>Response Body</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interactions.map((interaction) => (
              <TableRow key={interaction.id}>
                <TableCell>
                  {formatTimestamp(interaction.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{interaction.event_type || 'N/A'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" title={interaction.session_id}>{interaction.session_id.substring(0,8)}...</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" title={interaction.webhook_id}>{interaction.webhook_id}</Badge>
                </TableCell>
                <TableCell>
                  <JsonViewer data={interaction.request_body} />
                </TableCell>
                <TableCell>
                  <JsonViewer data={interaction.response_body} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
} 