'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { CredentialLayout } from "@/components/layout/credential-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, MoreVertical, Plus, Copy, Key, Trash2, Edit2, Search, ArrowUpDown, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { createApiKey, getApiKeys, getApiKeyWithValue, deleteApiKey } from "@/lib/api-keys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Define UI-specific API key type
type UIApiKey = {
  id: string;
  name: string;
  key: string;
  type: string;
  created: string;
  lastUsed: string | null;
};

// Helper functions used across components
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const maskApiKey = () => {
  return "••••••••••••••••••••••••";
};

// Define the ApiKeysTable component
interface ApiKeysTableProps {
  apiKeys: UIApiKey[];
  sortConfig: {
    key: keyof UIApiKey | null;
    direction: 'asc' | 'desc';
  };
  onSort: (key: keyof UIApiKey) => void;
  visibleKeys: Set<string>;
  onToggleKeyVisibility: (keyId: string) => void;
  onViewKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
  searchQuery?: string;
  typeFilters: string[];
  onClearFilters: () => void;
}

function ApiKeysTable({
  apiKeys,
  sortConfig,
  onSort,
  visibleKeys,
  onToggleKeyVisibility,
  onViewKey,
  onDeleteKey,
  searchQuery,
  typeFilters,
  onClearFilters
}: ApiKeysTableProps) {
  const getSortIcon = (key: keyof UIApiKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className="rounded-md border">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center">
                  Name
                  <span className="ml-1">{getSortIcon('name')}</span>
                </div>
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('type')}
              >
                <div className="flex items-center">
                  Type
                  <span className="ml-1">{getSortIcon('type')}</span>
                </div>
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                API Key
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('created')}
              >
                <div className="flex items-center">
                  Created
                  <span className="ml-1">{getSortIcon('created')}</span>
                </div>
              </th>
              <th 
                className="h-10 px-4 text-left font-medium text-muted-foreground cursor-pointer"
                onClick={() => onSort('lastUsed')}
              >
                <div className="flex items-center">
                  Last Used
                  <span className="ml-1">{getSortIcon('lastUsed')}</span>
                </div>
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.length > 0 ? (
              apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{apiKey.name}</td>
                  <td className="p-4">
                    <Badge variant="outline">{apiKey.type}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">
                        {visibleKeys.has(apiKey.id) ? apiKey.key : maskApiKey()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (!visibleKeys.has(apiKey.id)) {
                            onViewKey(apiKey.id);
                          } else {
                            onToggleKeyVisibility(apiKey.id);
                          }
                        }}
                      >
                        {visibleKeys.has(apiKey.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey.key);
                          toast.success('API key copied to clipboard');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-4">{formatDate(apiKey.created)}</td>
                  <td className="p-4">{formatDate(apiKey.lastUsed)}</td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(apiKey.key);
                            toast.success('API key copied to clipboard');
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          <span>Copy Key</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteKey(apiKey.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                      <Key className="h-10 w-10 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xl font-medium">
                        {apiKeys.length === 0 && !searchQuery && typeFilters.length === 0 
                          ? "No API keys found" 
                          : "No results found"}
                      </p>
                      <p className="text-muted-foreground">
                        {searchQuery || typeFilters.length > 0 ? (
                          <>
                            No API keys match your search criteria.{" "}
                            <button 
                              onClick={onClearFilters}
                              className="text-primary underline"
                            >
                              Clear filters
                            </button>
                          </>
                        ) : (
                          "You haven't added any API keys yet. Add your first API key to get started."
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
  );
}

export default function CredentialsPage() {
  const [apiKeys, setApiKeys] = useState<UIApiKey[]>([]);
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyService, setNewKeyService] = useState('OpenAI');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof UIApiKey | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [isCustomService, setIsCustomService] = useState(false);

  // Get unique key types from apiKeys
  const availableTypes = useMemo(() => {
    const types = new Set(apiKeys.map(key => key.type));
    return Array.from(types);
  }, [apiKeys]);

  // Toggle type filter
  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Function to handle sorting
  const requestSort = (key: keyof UIApiKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort API keys
  const filteredAndSortedApiKeys = apiKeys
    .filter(key => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          key.name.toLowerCase().includes(query) ||
          key.type.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }
      
      // Type filter - only apply if filters are actually selected
      if (typeFilters.length > 0 && !typeFilters.includes(key.type)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const updated = new Set(prev);
      if (updated.has(keyId)) {
        updated.delete(keyId);
      } else {
        updated.add(keyId);
      }
      return updated;
    });
  };

  const refreshApiKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    try {
      const backendKeys = await getApiKeys();
      // Map from backend format to UI format
      const uiKeys: UIApiKey[] = backendKeys.map(key => ({
        id: key.id,
        name: key.name,
        type: key.service,
        key: maskApiKey(), // Placeholder until viewed
        created: key.created_at,
        lastUsed: key.updated_at
      }));
      setApiKeys(uiKeys);
    } catch (error: any) {
      toast.error(error.message || "Failed to load API keys");
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    refreshApiKeys();
  }, [refreshApiKeys]);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setNewKeyService(value);
    setIsCustomService(value === 'Custom');
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine the actual service name to use
    const serviceToUse = isCustomService ? customServiceName : newKeyService;
    
    if (!newKeyName.trim() || !serviceToUse.trim() || !newKeyValue.trim()) {
      toast.error("All fields are required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await createApiKey(
        newKeyName.trim(),
        serviceToUse.trim(),
        newKeyValue.trim()
      );
      
      toast.success("API key added successfully");
      
      // Reset form
      setNewKeyName('');
      setNewKeyService('OpenAI');
      setCustomServiceName('');
      setIsCustomService(false);
      setNewKeyValue('');
      setShowKey(false);
      setIsAddKeyDialogOpen(false);
      
      // Refresh the API keys list
      refreshApiKeys();
    } catch (error: any) {
      toast.error(error.message || "Failed to add API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewKey = async (id: string) => {
    setIsDecrypting(true);
    try {
      const keyWithValue = await getApiKeyWithValue(id);
      
      if (keyWithValue && keyWithValue.decrypted_key) {
        // Update the key in the state with the decrypted value
        setApiKeys(prevKeys => 
          prevKeys.map(key => 
            key.id === id 
              ? { ...key, key: keyWithValue.decrypted_key } 
              : key
          )
        );
        
        // Make the key visible
        setVisibleKeys(prev => {
          const updated = new Set(prev);
          updated.add(id);
          return updated;
        });
        
        setSelectedKeyId(id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to decrypt API key");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await deleteApiKey(id);
      toast.success("API key deleted successfully");
      refreshApiKeys();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete API key");
    }
  };

  // Function to clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilters([]);
  };

  return (
    <ProtectedRoute>
      <CredentialLayout>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold visually-hidden">API Credentials</h1>
          </div>
          <Button onClick={() => setIsAddKeyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Key
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Your Keys</CardTitle>
                <CardDescription>
                  These keys are used to authenticate your requests to external APIs
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search API keys..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto h-8 gap-1">
                      <Filter className="h-4 w-4" />
                      Filter
                      {typeFilters.length > 0 && (
                        <span className="ml-1 rounded-full bg-primary w-5 h-5 text-primary-foreground flex items-center justify-center text-xs">
                          {typeFilters.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableTypes.map(type => (
                      <DropdownMenuCheckboxItem
                        key={type}
                        checked={typeFilters.includes(type)}
                        onCheckedChange={() => toggleTypeFilter(type)}
                      >
                        {type}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {typeFilters.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={clearFilters}>
                          Clear Filters
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingKeys ? (
              <div className="flex justify-center items-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">Loading API keys...</p>
                </div>
              </div>
            ) : (
              <ApiKeysTable 
                apiKeys={filteredAndSortedApiKeys}
                sortConfig={sortConfig}
                onSort={requestSort}
                visibleKeys={visibleKeys}
                onToggleKeyVisibility={toggleKeyVisibility}
                onViewKey={handleViewKey}
                onDeleteKey={handleDeleteKey}
                searchQuery={searchQuery}
                typeFilters={typeFilters}
                onClearFilters={clearFilters}
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Key</DialogTitle>
              <DialogDescription>
                Add a new API key to be securely stored. Only you will be able to view this key.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddKey}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="col-span-3"
                    placeholder="My API Key"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="service" className="text-right">
                    Service
                  </Label>
                  <div className="col-span-3">
                    <select
                      id="service"
                      value={newKeyService}
                      onChange={handleServiceChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      required
                    >
                      <option value="OpenAI">OpenAI</option>
                      <option value="Google Gemini">Google Gemini</option>
                      <option value="Anthropic">Anthropic</option>
                      <option value="Deepseek">Deepseek</option>
                      <option value="GitHub">GitHub</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>
                {isCustomService && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customServiceName" className="text-right">
                      Custom Service Name
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="customServiceName"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        className="col-span-3"
                        placeholder="Enter custom service name"
                        required={isCustomService}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="key" className="text-right">
                    API Key
                  </Label>
                  <div className="col-span-3 relative">
                    <Input
                      id="key"
                      type={showKey ? "text" : "password"}
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      className="pr-9"
                      placeholder="Enter your API key"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddKeyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Key"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CredentialLayout>
    </ProtectedRoute>
  );
} 