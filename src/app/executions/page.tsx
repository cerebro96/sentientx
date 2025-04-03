"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Filter, MoreVertical, Plus, RefreshCw, Search, Check, X, ArrowDown, ArrowUp, Activity } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { ExecutionLayout } from "@/components/layout/execution-layout"

interface Execution {
  id: string
  workflowId: string
  workflowName: string
  status: 'success' | 'failed' | 'running' | 'pending'
  startedAt: string
  runTime: string
  triggeredBy: string
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [selectedExecutions, setSelectedExecutions] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Execution | null;
    direction: 'ascending' | 'descending';
  }>({
    key: null,
    direction: 'descending'
  })

  // Load executions data
  useEffect(() => {
    fetchExecutions()
    
    // Set up auto-refresh if enabled
    let intervalId: NodeJS.Timeout | null = null
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchExecutions()
      }, 30000) // Refresh every 30 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoRefresh])

  const fetchExecutions = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockExecutions: Execution[] = []
      setExecutions(mockExecutions)
    } catch (error) {
      console.error("Failed to fetch executions:", error)
    }
  }

  const handleSort = (key: keyof Execution) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof Execution) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status)
      } else {
        return [...prev, status]
      }
    })
  }

  const handleExecutionSelect = (id: string, checked: boolean) => {
    setSelectedExecutions(prev => {
      if (checked) {
        return [...prev, id]
      } else {
        return prev.filter(execId => execId !== id)
      }
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredAndSortedExecutions.map(execution => execution.id)
      setSelectedExecutions(allIds)
    } else {
      setSelectedExecutions([])
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter([])
  }

  // Filter and sort executions
  const filteredAndSortedExecutions = [...executions]
    .filter(execution => {
      const matchesSearch = execution.workflowName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           execution.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           execution.triggeredBy.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(execution.status)
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0
      
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1
      }
      return 0
    })

  return (
    <ProtectedRoute>
      <ExecutionLayout>
        <div className="p-6 space-y-6">
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
                      {['success', 'failed', 'running', 'pending'].map((status) => (
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
                onClick={fetchExecutions}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[30px]">
                      <Checkbox
                        checked={
                          selectedExecutions.length > 0 &&
                          selectedExecutions.length === filteredAndSortedExecutions.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th 
                      className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                      onClick={() => handleSort('workflowName')}
                    >
                      <div className="flex items-center">
                        Workflow
                        {getSortIcon('workflowName')}
                      </div>
                    </th>
                    <th 
                      className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                      onClick={() => handleSort('startedAt')}
                    >
                      <div className="flex items-center">
                        Started
                        {getSortIcon('startedAt')}
                      </div>
                    </th>
                    <th 
                      className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                      onClick={() => handleSort('runTime')}
                    >
                      <div className="flex items-center">
                        Run Time
                        {getSortIcon('runTime')}
                      </div>
                    </th>
                    <th 
                      className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center">
                        Exec. ID
                        {getSortIcon('id')}
                      </div>
                    </th>
                    <th 
                      className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                      onClick={() => handleSort('triggeredBy')}
                    >
                      <div className="flex items-center">
                        Triggered By
                        {getSortIcon('triggeredBy')}
                      </div>
                    </th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedExecutions.length > 0 ? (
                    filteredAndSortedExecutions.map((execution) => (
                      <tr key={execution.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedExecutions.includes(execution.id)}
                            onCheckedChange={(checked) => handleExecutionSelect(execution.id, !!checked)}
                            aria-label={`Select execution ${execution.id}`}
                          />
                        </td>
                        <td className="p-4 font-medium">{execution.workflowName}</td>
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
                          </div>
                        </td>
                        <td className="p-4">{new Date(execution.startedAt).toLocaleString()}</td>
                        <td className="p-4">{execution.runTime}</td>
                        <td className="p-4">
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                            {execution.id.substring(0, 8)}
                          </code>
                        </td>
                        <td className="p-4">{execution.triggeredBy}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Rerun Execution</DropdownMenuItem>
                              <DropdownMenuItem>View Workflow</DropdownMenuItem>
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
                                    onClick={clearFilters}
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
        </div>
      </ExecutionLayout>
    </ProtectedRoute>
  )
} 