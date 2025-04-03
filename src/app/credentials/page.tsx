'use client';

import { useState, useMemo } from 'react';
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { Eye, EyeOff, MoreVertical, Plus, Copy, Key, Trash2, Edit2, Search, ArrowUpDown, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Sample API key data structure
type ApiKey = {
  id: string;
  name: string;
  key: string;
  type: string;
  created: string;
  lastUsed: string | null;
};

// Mock API keys for demonstration
const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'OpenAI API Key',
    key: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    type: 'OpenAI',
    created: '2023-06-15T10:30:00Z',
    lastUsed: '2023-07-20T14:45:00Z',
  },
  {
    id: '2',
    name: 'Anthropic API Key',
    key: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    type: 'Anthropic',
    created: '2023-08-05T09:15:00Z',
    lastUsed: null,
  },
];

export default function CredentialsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyType, setNewKeyType] = useState('OpenAI');
  const [visibleKeys, setVisibleKeys] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ApiKey | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

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

  // Clear all type filters
  const clearTypeFilters = () => {
    setTypeFilters([]);
  };

  // Handle sorting
  const requestSort = (key: keyof ApiKey) => {
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
      
      // Type filter
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
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const handleAddKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim() || !newKeyType.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: newKeyValue,
      type: newKeyType,
      created: new Date().toISOString(),
      lastUsed: null,
    };

    setApiKeys([...apiKeys, newKey]);
    resetForm();
    setIsAddKeyDialogOpen(false);
    toast.success('API key added successfully');
  };

  const handleDeleteKey = (keyId: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== keyId));
    toast.success('API key deleted successfully');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const resetForm = () => {
    setNewKeyName('');
    setNewKeyValue('');
    setNewKeyType('OpenAI');
  };

  const maskApiKey = (key: string) => {
    const firstFour = key.substring(0, 7);
    const lastFour = key.substring(key.length - 4);
    return `${firstFour}...${lastFour}`;
  };

  const getSortIcon = (key: keyof ApiKey) => {
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
                        <DropdownMenuItem onClick={clearTypeFilters}>
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
            {filteredAndSortedApiKeys.length === 0 ? (
              <div className="text-center py-8">
                {searchQuery || typeFilters.length > 0 ? (
                  <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                ) : (
                  <Key className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                )}
                <h3 className="text-lg font-medium mb-2">
                  {apiKeys.length === 0 && !searchQuery && typeFilters.length === 0 
                    ? "No API keys found" 
                    : "No results found"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `No API keys match your search for "${searchQuery}"` 
                    : typeFilters.length > 0 
                      ? 'No API keys match the selected filters' 
                      : 'You haven\'t added any API keys yet. Add your first API key to get started.'}
                </p>
                <div className="flex justify-center gap-2">
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  )}
                  {typeFilters.length > 0 && (
                    <Button variant="outline" onClick={clearTypeFilters}>
                      Clear Filters
                    </Button>
                  )}
                  {(!searchQuery && typeFilters.length === 0) || (apiKeys.length === 0 && !searchQuery && typeFilters.length === 0) ? (
                    <Button onClick={() => setIsAddKeyDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add API Key
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer">
                      <div className="flex items-center">
                        Name
                        <span className="ml-1">{getSortIcon('name')}</span>
                      </div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('type')} className="cursor-pointer">
                      <div className="flex items-center">
                        Type
                        <span className="ml-1">{getSortIcon('type')}</span>
                      </div>
                    </TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead onClick={() => requestSort('created')} className="cursor-pointer">
                      <div className="flex items-center">
                        Created
                        <span className="ml-1">{getSortIcon('created')}</span>
                      </div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('lastUsed')} className="cursor-pointer">
                      <div className="flex items-center">
                        Last Used
                        <span className="ml-1">{getSortIcon('lastUsed')}</span>
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedApiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>{apiKey.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {visibleKeys[apiKey.id] ? apiKey.key : maskApiKey(apiKey.key)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys[apiKey.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyKey(apiKey.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(apiKey.created)}</TableCell>
                      <TableCell>{formatDate(apiKey.lastUsed)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyKey(apiKey.key)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteKey(apiKey.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Key</DialogTitle>
              <DialogDescription>
                Enter your key details below. Keep your keys secure and never share them publicly.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="keyName">Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. OpenAI Production Key"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keyType">API Type</Label>
                <select
                  id="keyType"
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                  <option value="Cohere">Cohere</option>
                  <option value="Hugging Face">Hugging Face</option>
                  <option value="Stability AI">Stability AI</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keyValue">API Key</Label>
                <Input
                  id="keyValue"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="sk-..."
                  type="password"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddKey}>Add API Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CredentialLayout>
    </ProtectedRoute>
  );
} 