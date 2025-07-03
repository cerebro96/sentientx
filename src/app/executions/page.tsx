"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Filter, MoreVertical, Plus, RefreshCw, Search, Check, X, ArrowDown, ArrowUp, Activity, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { ExecutionLayout } from "@/components/layout/execution-layout"
import { useExecutions } from "@/hooks/use-executions"
import type { Execution } from "@/lib/data-fetching"
import Loading from "./loading"
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas"
import { formatToUserTimezone} from "@/lib/utils"

interface SortConfig {
  key: keyof Execution | null
  direction: 'ascending' | 'descending'
}

interface ExecutionsTableProps {
  executions: Execution[]
  onExecutionSelect: (id: string, checked: boolean) => void
  selectedExecutions: string[]
  sortConfig: SortConfig
  onSort: (key: keyof Execution) => void
  searchQuery?: string
  statusFilter: string[]
  onClearFilters: () => void
  onViewWorkflow: (workflowId: string) => void
  totalCount: number
  use24Hour: boolean
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
}

function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange 
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const delta = 2
    const pages = []
    const rangeStart = Math.max(2, currentPage - delta)
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta)

    if (totalPages <= 1) return []

    // Always show first page
    pages.push(1)

    if (rangeStart > 2) {
      pages.push('...')
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }

    if (rangeEnd < totalPages - 1) {
      pages.push('...')
    }

    // Always show last page (if not already included)
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t">
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} results
        </p>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Rows per page:</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ExecutionsTable({ 
  executions, 
  onExecutionSelect, 
  selectedExecutions, 
  sortConfig, 
  onSort,
  searchQuery,
  statusFilter,
  onClearFilters,
  onViewWorkflow,
  totalCount,
  use24Hour
}: ExecutionsTableProps) {
  return (
    <div className="rounded-md border">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[30px]">
                <Checkbox
                  checked={selectedExecutions.length > 0 && selectedExecutions.length === executions.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onExecutionSelect(executions.map(e => e.id).join(','), true)
                    } else {
                      onExecutionSelect('', false)
                    }
                  }}
                  aria-label="Select all"
                />
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('workflow_name')}
              >
                <div className="flex items-center">
                  Workflow
                  {sortConfig.key === 'workflow_name' && (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {sortConfig.key === 'status' && (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('started_at')}
              >
                <div className="flex items-center">
                  Started
                  {sortConfig.key === 'started_at' && (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('run_time')}
              >
                <div className="flex items-center">
                  Stopped
                  {sortConfig.key === 'run_time' && (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('id')}
              >
                <div className="flex items-center">
                  Exec. ID
                  {sortConfig.key === 'id' && (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('triggered_by')}
              >
                <div className="flex items-center">
                  Triggered By
                  {sortConfig.key === 'triggered_by' && (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {executions.length > 0 ? (
              executions.map((execution) => (
                <tr key={execution.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedExecutions.includes(execution.id)}
                      onCheckedChange={(checked) => onExecutionSelect(execution.id, !!checked)}
                      aria-label={`Select execution ${execution.id}`}
                    />
                  </td>
                  <td className="p-4 font-medium">{execution.workflow_name}</td>
                  <td className="p-4">
                    <div className="flex items-center">
                      {execution.status === 'success' && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800">
                          <Check className="mr-1 h-3 w-3" />
                          Success
                        </Badge>
                      )}
                      {execution.status === 'failed' && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800">
                          <X className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                      {execution.status === 'running' && (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800">
                          <div className="mr-1 h-2 w-2 rounded-full bg-blue-500" />
                          Running
                        </Badge>
                      )}
                      {execution.status === 'pending' && (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800">
                          <div className="mr-1 h-2 w-2 rounded-full bg-yellow-500" />
                          Pending
                        </Badge>
                      )}
                      {execution.status === 'stopped' && (
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800">
                          <div className="mr-1 h-2 w-2 rounded-full bg-gray-500" />
                          Stopped
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">{formatToUserTimezone(execution.started_at, undefined, use24Hour)}</td>
                  <td className="p-4">{execution.run_time ? formatToUserTimezone(execution.run_time, undefined, use24Hour) : ''}</td>
                  <td className="p-4">
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                      {execution.id.substring(0, 8)}
                    </code>
                  </td>
                  <td className="p-4">{execution.triggered_by}</td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewWorkflow(execution.workflow_id)}>
                          View Workflow
                        </DropdownMenuItem>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        {/* <DropdownMenuItem>Rerun Execution</DropdownMenuItem> */}  
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                      <Activity className="h-10 w-10 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xl font-medium">No executions</p>
                      <p className="text-muted-foreground">
                        {searchQuery || statusFilter.length > 0 ? (
                          <>
                            No results found.{" "}
                            <button 
                              onClick={onClearFilters}
                              className="text-primary underline"
                            >
                              Clear filters
                            </button>
                          </>
                        ) : (
                          "Execute a workflow to see results here."
                        )}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExecutionFilters({ searchQuery, onSearchChange, statusFilter, onStatusFilterChange, autoRefresh, onAutoRefreshChange, use24Hour, onTimeFormatChange }: {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string[]
  onStatusFilterChange: (status: string) => void
  autoRefresh: boolean
  onAutoRefreshChange: (enabled: boolean) => void
  use24Hour: boolean
  onTimeFormatChange: (use24Hour: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="relative w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search executions..."
          className="w-full bg-background pl-8"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {statusFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-sm px-1">
                  {statusFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <div className="font-medium mb-2">Status</div>
              <div className="space-y-2">
                {['success', 'failed', 'running', 'pending', 'stopped'].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={() => onStatusFilterChange(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="flex items-center">
                      {status === 'success' && <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />}
                      {status === 'failed' && <X className="mr-1.5 h-3.5 w-3.5 text-red-500" />}
                      {status === 'running' && <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />}
                      {status === 'pending' && <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-yellow-500" />}
                      {status === 'stopped' && <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-gray-500" />}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="time-format"
            checked={use24Hour}
            onCheckedChange={onTimeFormatChange}
          />
          <Label htmlFor="time-format" className="font-medium">
            {use24Hour ? '24h' : '12h'}
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={onAutoRefreshChange}
          />
          <Label htmlFor="auto-refresh" className="font-medium">
            Auto refresh
          </Label>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0"
          onClick={() => {
            // Implement refresh logic
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function ExecutionsPage() {
  const { executions, isLoading, isError, refresh } = useExecutions()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [selectedExecutions, setSelectedExecutions] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'descending'
  })
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [use24Hour, setUse24Hour] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    if (autoRefresh) {
      intervalId = setInterval(() => {
        refresh()
      }, 5000)
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoRefresh, refresh])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const handleSort = (key: keyof Execution) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }))
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status)
      }
      return [...prev, status]
    })
  }

  const handleExecutionSelect = (id: string, checked: boolean) => {
    if (id.includes(',')) {
      // Handle bulk selection
      const ids = id.split(',')
      if (checked) {
        setSelectedExecutions(ids)
      } else {
        setSelectedExecutions([])
      }
    } else {
      // Handle single selection
      if (checked) {
        setSelectedExecutions([...selectedExecutions, id])
      } else {
        setSelectedExecutions(selectedExecutions.filter(execId => execId !== id))
      }
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter([])
  }

  const handleViewWorkflow = (workflowId: string) => {
    if (!workflowId) {
      console.error("Cannot view workflow: workflowId is missing from execution data.");
      return;
    }
    console.log("Opening editor for workflow:", workflowId);
    setEditingWorkflowId(workflowId);
    setIsEditorOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const { filteredExecutions, paginatedExecutions, totalPages } = useMemo(() => {
    let result = [...executions]

    // Apply search filter
    if (searchQuery) {
      result = result.filter(execution => 
        execution.workflow_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        execution.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        execution.triggered_by.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      result = result.filter(execution => statusFilter.includes(execution.status))
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    // Calculate pagination
    const totalFilteredItems = result.length
    const totalPages = Math.ceil(totalFilteredItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedResults = result.slice(startIndex, endIndex)

    return {
      filteredExecutions: result,
      paginatedExecutions: paginatedResults,
      totalPages
    }
  }, [executions, searchQuery, statusFilter, sortConfig, currentPage, itemsPerPage])

  if (isEditorOpen && editingWorkflowId) {
    return (
      <div className="h-screen w-full">
        <WorkflowCanvas 
          isActive={true}
          onClose={() => {
             setIsEditorOpen(false);
             setEditingWorkflowId(null);
             refresh(); 
          }} 
          workflowId={editingWorkflowId}
        />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <ExecutionLayout>
        <Suspense fallback={<Loading />}>
          <div className="p-6 space-y-6">
            {isLoading ? (
              <Loading />
            ) : isError ? (
              <div className="text-center py-10">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Error loading executions</h2>
                <p className="text-muted-foreground mb-6">
                  Failed to load execution data. Please try again.
                </p>
                <Button onClick={() => refresh()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search executions..."
                      className="w-full bg-background pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                          <Filter className="mr-2 h-4 w-4" />
                          Filters
                          {statusFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 rounded-sm px-1">
                              {statusFilter.length}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="p-2">
                          <div className="font-medium mb-2">Status</div>
                          <div className="space-y-2">
                            {['success', 'failed', 'running', 'pending', 'stopped'].map((status) => (
                              <div key={status} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`status-${status}`}
                                  checked={statusFilter.includes(status)}
                                  onCheckedChange={() => handleStatusFilterChange(status)}
                                />
                                <Label htmlFor={`status-${status}`} className="flex items-center">
                                  {status === 'success' && <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />}
                                  {status === 'failed' && <X className="mr-1.5 h-3.5 w-3.5 text-red-500" />}
                                  {status === 'running' && <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />}
                                  {status === 'pending' && <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-yellow-500" />}
                                  {status === 'stopped' && <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-gray-500" />}
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="time-format"
                        checked={use24Hour}
                        onCheckedChange={setUse24Hour}
                      />
                      <Label htmlFor="time-format" className="font-medium">
                        {use24Hour ? '24h' : '12h'}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-refresh"
                        checked={autoRefresh}
                        onCheckedChange={setAutoRefresh}
                      />
                      <Label htmlFor="auto-refresh" className="font-medium">
                        Auto refresh
                      </Label>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0"
                      onClick={() => refresh()}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                <ExecutionsTable 
                    executions={paginatedExecutions}
                  onExecutionSelect={handleExecutionSelect}
                  selectedExecutions={selectedExecutions}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                  onClearFilters={clearFilters}
                  onViewWorkflow={handleViewWorkflow}
                    totalCount={filteredExecutions.length}
                  use24Hour={use24Hour}
                  />
                  
                  {filteredExecutions.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredExecutions.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </Suspense>
      </ExecutionLayout>
    </ProtectedRoute>
  )
} 