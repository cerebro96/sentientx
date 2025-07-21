'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Sparkles, MessageSquare, X, Search, History, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { 
  createChatSession, 
  saveChatMessage, 
  loadChatHistory, 
  getOrCreateWorkflowSession,
  loadWorkflowChatHistory,
  ChatMessage 
} from '@/lib/ai-chat-sessions';
import { supabase } from '@/lib/supabase';
import { nodeCatalog } from './nodeTypes';
import { createWorkflow, updateWorkflow } from '@/lib/workflows';
import { v4 as uuidv4 } from 'uuid';

interface AIBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowGenerated?: (data: { workflowId: string; workflowData: any }) => void; // Updated interface
  workflowId?: string;
  sessionId?: string;
}

// Component to format message content with proper styling inspired by Google ADK Web
const MessageContent = ({ content }: { content: string }) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const parseContent = (text: string) => {
    const elements: Array<{ type: string; content: string; language?: string; level?: number }> = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code block start
      if (line.trim().startsWith('```') && !inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = line.trim().substring(3) || 'text';
        codeBlockContent = '';
        continue;
      }
      
      // Handle code block end
      if (line.trim() === '```' && inCodeBlock) {
        inCodeBlock = false;
        // Process the code block content
        let processedContent = codeBlockContent.trim();
        
        // Special handling for JSON - ensure it's properly formatted
        if (codeBlockLanguage.toLowerCase() === 'json') {
          try {
            const parsed = JSON.parse(processedContent);
            processedContent = JSON.stringify(parsed, null, 2);
          } catch (e) {
            // If it's not valid JSON, try to detect if it looks like JSON and format it
            if (processedContent.includes('{') || processedContent.includes('[')) {
              // Try to add line breaks and indentation for better readability
              processedContent = processedContent
                .replace(/,/g, ',\n')
                .replace(/{/g, '{\n')
                .replace(/}/g, '\n}')
                .replace(/\[/g, '[\n')
                .replace(/\]/g, '\n]')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n');
            }
          }
        }
        
        elements.push({
          type: 'code',
          content: processedContent,
          language: codeBlockLanguage
        });
        continue;
      }
      
      // Add to code block
      if (inCodeBlock) {
        codeBlockContent += (codeBlockContent ? '\n' : '') + line;
        continue;
      }
      
      // Handle headers
      if (line.startsWith('####')) {
        elements.push({ type: 'header', content: line.substring(4).trim(), level: 4 });
      } else if (line.startsWith('###')) {
        elements.push({ type: 'header', content: line.substring(3).trim(), level: 3 });
      } else if (line.startsWith('##')) {
        elements.push({ type: 'header', content: line.substring(2).trim(), level: 2 });
      } else if (line.startsWith('#')) {
        elements.push({ type: 'header', content: line.substring(1).trim(), level: 1 });
      }
      // Handle lists
      else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const indent = line.search(/[*-]/);
        elements.push({ 
          type: 'list-item', 
          content: line.trim().substring(2).trim(),
          level: Math.floor(indent / 2)
        });
      }
      // Handle numbered lists
      else if (/^\s*\d+\.\s/.test(line)) {
        const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
        if (match) {
          elements.push({
            type: 'numbered-item',
            content: match[3],
            level: Math.floor(match[1].length / 2)
          });
        }
      }
      // Handle empty lines
      else if (line.trim() === '') {
        elements.push({ type: 'spacer', content: '' });
      }
      // Handle regular text
      else {
        // For very long lines (like URLs or technical content), ensure they break properly
        if (line.length > 80 && !line.includes(' ')) {
          // This is likely a long URL or technical string, add word-break hints
          const processedLine = line.replace(/(https?:\/\/[^\s]+)/g, '$1').replace(/([a-zA-Z0-9_-]{20,})/g, '$1');
          elements.push({ type: 'text', content: processedLine });
        } else {
          elements.push({ type: 'text', content: line });
        }
      }
    }
    
    return elements;
  };

  const formatTextContent = (text: string) => {
    // Handle inline formatting
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-primary break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono border break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return (
          <em key={index} className="italic break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {part.slice(1, -1)}
          </em>
        );
      }
      return (
        <span key={index} className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {part}
        </span>
      );
    });
  };

  const CodeBlock = ({ content, language }: { content: string; language: string }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const formatJson = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        const formatted = JSON.stringify(parsed, null, 2);
        return formatted;
      } catch {
        return jsonString; // Return original if not valid JSON
      }
    };

    const renderJsonWithHighlighting = (jsonString: string) => {
      if (language !== 'json') return jsonString;
      
      try {
        // First ensure the JSON is properly formatted
        const parsed = JSON.parse(jsonString);
        const formatted = JSON.stringify(parsed, null, 2);
        const lines = formatted.split('\n');
        
        return (
          <div className="space-y-0">
            {lines.map((line, index) => {
              const trimmedLine = line.trim();
              let className = 'text-gray-700 dark:text-gray-300';
              
              // Syntax highlighting classes
              if (trimmedLine.match(/^"[^"]+"\s*:/)) {
                // Property names (keys)
                className = 'text-blue-600 dark:text-blue-400 font-medium';
              } else if (trimmedLine.match(/:\s*"[^"]*"[,]?$/)) {
                // String values
                className = 'text-green-600 dark:text-green-400';
              } else if (trimmedLine.match(/:\s*(true|false|null)[,]?$/)) {
                // Boolean/null values
                className = 'text-purple-600 dark:text-purple-400 font-medium';
              } else if (trimmedLine.match(/:\s*\d+(\.\d+)?[,]?$/)) {
                // Number values
                className = 'text-orange-600 dark:text-orange-400';
              } else if (trimmedLine.match(/^[{}\[\],]/)) {
                // Brackets and commas
                className = 'text-gray-600 dark:text-gray-400 font-bold';
              }
              
              // Calculate indentation
              const leadingSpaces = line.length - line.trimStart().length;
              
              return (
                <div 
                  key={index} 
                  className={`${className} font-mono text-sm leading-6`}
                  style={{ 
                    paddingLeft: `${leadingSpaces * 0.5}em`,
                    minHeight: '1.5rem'
                  }}
                >
                  {line.trim() || '\u00A0'} {/* Non-breaking space for empty lines */}
                </div>
              );
            })}
          </div>
        );
      } catch (error) {
        // If JSON parsing fails, just return the original string with line breaks preserved
        return (
          <div className="space-y-0">
            {jsonString.split('\n').map((line, index) => (
              <div key={index} className="font-mono text-sm leading-6 text-gray-700 dark:text-gray-300">
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        );
      }
    };

    const displayContent = language === 'json' ? formatJson(content) : content;
    const isLargeContent = displayContent.split('\n').length > 20;

    return (
      <div className="my-4 rounded-lg border bg-muted/50 overflow-hidden max-w-full w-full">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {language || 'CODE'}
            </span>
            {language === 'json' && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {displayContent.split('\n').length} lines
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isLargeContent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => copyToClipboard(displayContent)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
        </div>
        <div className={`transition-all duration-200 ${isCollapsed ? 'max-h-32 overflow-hidden' : 'max-h-[40vh] overflow-auto'}`}>
          <div className="p-4 overflow-x-auto overflow-y-auto bg-slate-50 dark:bg-slate-900/50 max-w-full w-full">
            {language === 'json' ? (
              <div className="text-sm font-mono whitespace-pre overflow-x-auto w-full">
                {renderJsonWithHighlighting(content)}
              </div>
            ) : (
              <pre className="text-sm font-mono whitespace-pre overflow-x-auto max-w-full w-full">
                <code className="break-words">{displayContent}</code>
              </pre>
            )}
          </div>
          {isCollapsed && (
            <div className="bg-gradient-to-t from-muted/80 to-transparent h-8 -mt-8 relative z-10 flex items-end justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setIsCollapsed(false)}
              >
                Show more...
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const HeaderComponent = ({ content, level }: { content: string; level: number }) => {
    const baseClasses = "font-semibold text-primary mt-6 mb-3 first:mt-0 w-full max-w-full break-words overflow-wrap-anywhere";
    const wordBreakStyle = { wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const };
    
    switch (level) {
      case 1:
        return <h1 className={`${baseClasses} text-xl border-b border-border pb-2`} style={wordBreakStyle}>{content}</h1>;
      case 2:
        return <h2 className={`${baseClasses} text-lg border-b border-border pb-1`} style={wordBreakStyle}>{content}</h2>;
      case 3:
        return <h3 className={`${baseClasses} text-base`} style={wordBreakStyle}>{content}</h3>;
      case 4:
        return <h4 className={`${baseClasses} text-sm`} style={wordBreakStyle}>{content}</h4>;
      default:
        return <h2 className={`${baseClasses} text-lg`} style={wordBreakStyle}>{content}</h2>;
    }
  };

  const ListItem = ({ content, level }: { content: string; level: number }) => (
    <div className={`flex items-start gap-2 mb-1 ${level > 0 ? `ml-${level * 4}` : 'ml-4'} w-full max-w-full`}>
      <span className="text-primary mt-1.5 text-xs flex-shrink-0">•</span>
      <span className="flex-1 leading-relaxed break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{formatTextContent(content)}</span>
    </div>
  );

  const NumberedItem = ({ content, level }: { content: string; level: number }) => (
    <div className={`flex items-start gap-2 mb-1 ${level > 0 ? `ml-${level * 4}` : 'ml-4'} w-full max-w-full`}>
      <span className="text-primary font-medium mt-0.5 text-sm min-w-[1.5rem] flex-shrink-0">1.</span>
      <span className="flex-1 leading-relaxed break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{formatTextContent(content)}</span>
    </div>
  );

  const elements = parseContent(content);

  return (
    <div className="space-y-1 text-sm leading-relaxed w-full max-w-full overflow-hidden" style={{ 
      wordBreak: 'break-word', 
      overflowWrap: 'anywhere',
      hyphens: 'auto',
      lineBreak: 'anywhere'
    }}>
      {elements.map((element, index) => {
        switch (element.type) {
          case 'code':
            return (
              <CodeBlock 
                key={index} 
                content={element.content} 
                language={element.language || 'text'} 
              />
            );
          case 'header':
            return (
              <HeaderComponent 
                key={index} 
                content={element.content} 
                level={element.level || 2} 
              />
            );
          case 'list-item':
            return (
              <ListItem 
                key={index} 
                content={element.content} 
                level={element.level || 0} 
              />
            );
          case 'numbered-item':
            return (
              <NumberedItem 
                key={index} 
                content={element.content} 
                level={element.level || 0} 
              />
            );
          case 'spacer':
            return <div key={index} className="h-3" />;
          case 'text':
            return (
              <div key={index} className="leading-relaxed break-words overflow-wrap-anywhere w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {formatTextContent(element.content)}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};

export function AIBuilderModal({ isOpen, onClose, onWorkflowGenerated, workflowId, sessionId }: AIBuilderModalProps) {
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);
  const [workflowJsonConfig, setWorkflowJsonConfig] = useState<any>(null); // Store the JSON workflow configuration
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Debug: Log workflow ID when component mounts or workflowId changes
  useEffect(() => {
    console.log('AIBuilderModal received workflowId:', workflowId);
  }, [workflowId]);

  // Load chat history when modal opens or sessionId/workflowId changes
  useEffect(() => {
    if (isOpen) {
      loadChatSession();
    }
  }, [isOpen, sessionId, workflowId]);

  const loadChatSession = async () => {
    setIsLoadingHistory(true);
    try {
      if (sessionId) {
        // Load existing session
        console.log('Loading existing session:', sessionId);
        const history = await loadChatHistory(sessionId);
        setChatHistory(history);
        setCurrentSessionId(sessionId);
      } else if (workflowId) {
        // Load or create workflow-specific session
        console.log('Loading workflow session for workflow:', workflowId);
        const sessionId = await getOrCreateWorkflowSession(workflowId);
        const history = await loadChatHistory(sessionId);
        setChatHistory(history);
        setCurrentSessionId(sessionId);
      } else if (currentSessionId) {
        // Load current session history
        console.log('Loading current session history:', currentSessionId);
        const history = await loadChatHistory(currentSessionId);
        setChatHistory(history);
      } else {
        // Start with empty history for new session
        console.log('Starting with empty history for new session');
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Failed to load chat session:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const ensureSession = async (): Promise<string> => {
    if (currentSessionId) {
      console.log('Using existing session:', currentSessionId);
      return currentSessionId;
    }

    try {
      let newSessionId: string;
      
      if (workflowId) {
        // Create or get workflow-specific session
        console.log('Creating/getting workflow session for:', workflowId);
        newSessionId = await getOrCreateWorkflowSession(workflowId);
      } else {
        // Create general session
        console.log('Creating general session');
        newSessionId = await createChatSession();
      }
      
      console.log('Session established:', newSessionId);
      setCurrentSessionId(newSessionId);
      return newSessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create chat session');
      throw error;
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    };

    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [chatHistory]);

  const saveMessage = async (sessionId: string, message: ChatMessage) => {
    try {
      console.log('Saving message to session:', sessionId, 'Message:', message.role, message.content.substring(0, 50));
      await saveChatMessage(sessionId, message);
    } catch (error) {
      console.error('Failed to save message:', error);
      // Don't show error toast for save failures as it might be disruptive
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isLoading) return;

    const message = userMessage.trim();
    setUserMessage('');
    setIsLoading(true);

    try {
      // Ensure we have a session ID before proceeding
      const sessionId = await ensureSession();

      // Create user message
      const userChatMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
      };

      // Add user message to chat and save it
      setChatHistory(prev => [...prev, userChatMessage]);
      await saveMessage(sessionId, userChatMessage);

      try {
        // Get current user for API call
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Call the workflow builder API
        // const apiUrl = process.env.NODE_ENV === 'production' 
        //   ? '/api/workflowbuilder' 
        //   : 'http://localhost:8001/api/workflowbuilder';
          
        const response = await fetch("/api/workflowbuilder", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            session_id: sessionId,
            message: message
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Process the response content to detect JSON and replace with user-friendly message
        let responseContent = data.message || 'I received your message but couldn\'t generate a proper response.';
        
        // Check if the response is JSON or contains JSON workflow configuration
        const isJsonResponse = (content: string) => {
          const trimmed = content.trim();
          
          // Debug logging
          console.log('Checking if response is JSON:');
          console.log('Original content length:', content.length);
          console.log('Trimmed content length:', trimmed.length);
          console.log('Starts with {:', trimmed.startsWith('{'));
          console.log('Ends with }:', trimmed.endsWith('}'));
          console.log('First 50 chars:', trimmed.substring(0, 50));
          console.log('Last 50 chars:', trimmed.substring(trimmed.length - 50));
          
          // Check if response starts with { and ends with }
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              // Clean the JSON content by removing bad control characters
              const cleanedJson = trimmed
                .replace(/\n/g, '\\n')     // Escape newlines
                .replace(/\r/g, '\\r')     // Escape carriage returns
                .replace(/\t/g, '\\t')     // Escape tabs
                .replace(/[\x00-\x1F\x7F]/g, ''); // Remove other control characters
              
              console.log('Attempting to parse cleaned JSON...');
              const parsed = JSON.parse(cleanedJson);
              console.log('JSON parsing successful:', parsed);
              return true;
            } catch (error) {
              console.log('JSON parsing failed even after cleaning:', error);
              
              // Try alternative approach - replace problematic characters in strings
              try {
                // More aggressive cleaning for multi-line strings in JSON
                const alternativeClean = trimmed
                  .replace(/("instructions":\s*"[^"]*)"(\s*)/g, (_match: string, p1: string) => {
                    // Clean the instructions field specifically
                    return p1.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ') + '"';
                  })
                  .replace(/\n/g, ' ')      // Replace all newlines with spaces
                  .replace(/\r/g, ' ')      // Replace carriage returns with spaces
                  .replace(/\t/g, ' ')      // Replace tabs with spaces
                  .replace(/\s+/g, ' ');    // Collapse multiple spaces
                
                console.log('Attempting alternative cleaning approach...');
                const parsed = JSON.parse(alternativeClean);
                console.log('Alternative JSON parsing successful:', parsed);
                return true;
              } catch (alternativeError) {
                console.log('Alternative JSON parsing also failed:', alternativeError);
                return false;
              }
            }
          }
          
          console.log('Not a JSON response (doesn\'t start with { and end with })');
          return false;
        };
        
        // If JSON response detected, store the config and replace with user-friendly message
        if (isJsonResponse(responseContent)) {
          // Extract and store the JSON configuration
          let jsonConfig = null;
          try {
            const trimmed = responseContent.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}'))) {
              // Clean the JSON content the same way as detection
              let cleanedJson = trimmed
                .replace(/\n/g, '\\n')     // Escape newlines
                .replace(/\r/g, '\\r')     // Escape carriage returns
                .replace(/\t/g, '\\t')     // Escape tabs
                .replace(/[\x00-\x1F\x7F]/g, ''); // Remove other control characters
              
              try {
                jsonConfig = JSON.parse(cleanedJson);
              } catch {
                // Try alternative cleaning approach
                cleanedJson = trimmed
                  .replace(/("instructions":\s*"[^"]*)"(\s*)/g, (_match: string, p1: string) => {
                    return p1.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ') + '"';
                  })
                  .replace(/\n/g, ' ')      // Replace all newlines with spaces
                  .replace(/\r/g, ' ')      // Replace carriage returns with spaces
                  .replace(/\t/g, ' ')      // Replace tabs with spaces
                  .replace(/\s+/g, ' ');    // Collapse multiple spaces
                
                jsonConfig = JSON.parse(cleanedJson);
              }
            }
            
            // Save the JSON configuration to state
            if (jsonConfig) {
              setWorkflowJsonConfig(jsonConfig);
              console.log('Workflow JSON configuration stored:', jsonConfig);
            }
          } catch (error) {
            console.error('Error parsing JSON configuration:', error);
          }
          
          // \`\`\`json
          // ${responseContent}
          // \`\`\`
          responseContent = `## Workflow Configuration Generated

🎉 **Agent Setup Received!**

Your workflow configuration has been successfully generated and is ready to be created.

**What's Next:**
• Click "Generate Workflow" below to create your workflow
• **Configure API Keys**: Add API keys to your Multi Agent (BaseAgent) node and tool nodes
• **Set LLM Models**: Configure the required language models for each agent
• **Test Configuration**: Ensure all agents and tools have proper credentials

**Important Configuration Steps:**
• **Multi Agent Node**: Click to configure API key and model settings
• **LLM Agent Nodes**: Set up provider, model, and API keys for each agent
• **Tool Nodes**: Add required API keys (e.g., search tools, web scrapers)
• **Test Workflow**: Start the workflow to verify all configurations work

*The AI has designed a complete workflow based on your requirements. Configure the credentials and you're ready to go!*`;
        }
        
        // Create assistant response from API
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: responseContent,
          timestamp: new Date()
        };

        // Add assistant response to chat and save it using the same session ID
        setChatHistory(prev => [...prev, assistantMessage]);
        await saveMessage(sessionId, assistantMessage);

      } catch (apiError) {
        console.error('Error calling workflow builder API:', apiError);
        
        // Create error response message
        const errorMessage: ChatMessage = {
        role: 'assistant',
          content: `I apologize, but I'm having trouble connecting to the workflow builder service. Please try again later. Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
        timestamp: new Date()
        };

        // Add error message to chat and save it
        setChatHistory(prev => [...prev, errorMessage]);
        await saveMessage(sessionId, errorMessage);
        
        toast.error('Failed to get response from AI Builder');
      }
    } catch (error) {
      console.error('Failed to ensure session:', error);
      toast.error('Failed to create chat session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWorkflow = async () => {
    if (chatHistory.length === 0) {
      toast.error('Please describe your workflow first');
      return;
    }

    if (!workflowJsonConfig) {
      toast.error('No workflow configuration available. Please continue the conversation until the AI provides a complete workflow setup.');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Generating workflow with config:', workflowJsonConfig);
      
      // Transform JSON nodes to ReactFlow nodes using dynamic mapping
      const transformJsonToReactFlowNodes = (jsonNodes: any[]) => {
        const allNodes: any[] = [];
        let nodeCounter = 0;
        
        // Separate nodes by type for hierarchical positioning
        const multiAgents: any[] = [];
        const otherAgents: any[] = [];
        
        // First pass: categorize nodes
        jsonNodes.forEach((jsonNode) => {
          const normalizedType = jsonNode.type.toLowerCase().trim();
          if (normalizedType.includes('multi') && normalizedType.includes('agent')) {
            multiAgents.push(jsonNode);
          } else {
            otherAgents.push(jsonNode);
          }
        });
        
        // Process nodes in hierarchical order
        const orderedNodes = [...multiAgents, ...otherAgents];
        
        orderedNodes.forEach((jsonNode, index) => {
          // Generate unique ID for the main node
          const nodeId = `action-${Date.now()}-${nodeCounter++}`;
          
          // Find matching node type in catalog
          const findMatchingCatalogNode = (nodeType: string) => {
            const normalizedType = nodeType.toLowerCase().trim();
            
            // Direct label matches
            let match = nodeCatalog.find(catalogNode => 
              catalogNode.label.toLowerCase() === normalizedType
            );
            
            if (match) return match;
            
            // Partial matches for common agent types
            const partialMatches = [
              { pattern: /multi.*agent.*baseagent|baseagent.*multi.*agent/i, catalog: 'Multi Agent (BaseAgent)' },
              { pattern: /llm.*agent|agent.*llm/i, catalog: 'LLM Agent' },
              { pattern: /sequential.*agent/i, catalog: 'Sequential agent' },
              { pattern: /parallel.*agent/i, catalog: 'Parallel agent' },
              { pattern: /supabase.*agent/i, catalog: 'Supabase AI Agent' },
              { pattern: /chat.*trigger/i, catalog: 'Chat Trigger' },
              { pattern: /webhook/i, catalog: 'Webhook' },
            ];
            
            for (const { pattern, catalog } of partialMatches) {
              if (pattern.test(normalizedType)) {
                match = nodeCatalog.find(node => node.label === catalog);
                if (match) return match;
              }
            }
            
            // Default fallback - use a generic action node
            return nodeCatalog.find(node => node.label === 'LLM Agent') || {
              type: 'action',
              label: nodeType,
              description: 'Custom AI Agent',
              category: 'AI',
            };
          };
          
          const catalogNode = findMatchingCatalogNode(jsonNode.type);
          
          // Transform tools array to the expected format
          const transformedTools = (jsonNode.tools || []).map((tool: any) => {
            if (typeof tool === 'string') {
              return { name: tool, apiKeyId: '' };
            } else if (tool.tool_name) {
              return { name: tool.tool_name, apiKeyId: tool.apiKeyId || '' };
            } else {
              return { name: tool.name || 'unknown_tool', apiKeyId: tool.apiKeyId || '' };
            }
          });

          // Create node data based on agent type
          let nodeData: any = {
            icon: {},
            type: 'action',
            label: catalogNode.label,
            description: catalogNode.description,
          };

          // Configure based on agent type
          if (catalogNode.label === 'Multi Agent (BaseAgent)') {
            nodeData.multiAgentConfig = {
              name: jsonNode.id,
              model: 'gemini-2.0-flash', // Default model
              // description: jsonNode.instructions?.split('\n')[0] || 'AI Multi Agent',
              description:'',
              instructions: jsonNode.instructions || '',
              provider: 'gemini',
              apiKeyId: '', // Will need to be configured later
              connectedNodes: [] // Will be populated when edges are created
            };
          } else if (catalogNode.label === 'LLM Agent') {
            nodeData.llmAgentConfig = {
              name: jsonNode.id,
              model: 'gemini-2.0-flash', // Default model
              // description: jsonNode.instructions?.split('\n')[0] || 'AI LLM Agent',
              description:'',
              instructions: jsonNode.instructions || '',
              provider: 'gemini',
              apiKeyId: '', // Will need to be configured later
              tools: transformedTools
            };
          } else if (catalogNode.label === 'Sequential agent') {
            nodeData.sequentialParallelConfig = {
              name: jsonNode.id,
              description: jsonNode.instructions?.split('\n')[0] || 'Sequential Agent',
              connectedNodes: []
            };
          } else if (catalogNode.label === 'Parallel agent') {
            nodeData.sequentialParallelConfig = {
              name: jsonNode.id,
              description: jsonNode.instructions?.split('\n')[0] || 'Parallel Agent',
              connectedNodes: []
            };
          }
          
          // Calculate hierarchical position
          const isMultiAgent = catalogNode.label === 'Multi Agent (BaseAgent)';
          const multiAgentCount = multiAgents.length;
          const otherAgentCount = otherAgents.length;
          
          let x, y;
          
          if (isMultiAgent) {
            // Multi agents in top row
            const multiIndex = multiAgents.findIndex(node => node.id === jsonNode.id);
            x = (multiIndex * 350) + 100;
            y = 50;
          } else {
            // Other agents in second row
            const otherIndex = otherAgents.findIndex(node => node.id === jsonNode.id);
            x = (otherIndex * 350) + 100;
            y = 300;
          }
          
          // Create main agent node
          const mainNode: any = {
            id: nodeId,
            type: 'action',
            position: { x, y },
            data: nodeData,
            width: 215,
            height: 156,
            dragging: false,
            selected: false,
            // Store mapping for edge creation
            originalId: jsonNode.id,
            toolNodes: [] as string[] // Store tool node IDs for edge creation
          };
          
          allNodes.push(mainNode);
          
          // Create tool nodes if tools exist - position them in the bottom row
          if (jsonNode.tools && jsonNode.tools.length > 0) {
            jsonNode.tools.forEach((tool: any, toolIndex: number) => {
              const toolName = typeof tool === 'string' ? tool : tool.tool_name;
              
              // Find matching tool in catalog
              const toolCatalogNode = nodeCatalog.find(catalogNode => 
                catalogNode.label.toLowerCase() === toolName.toLowerCase() ||
                catalogNode.label.toLowerCase().includes(toolName.toLowerCase().replace('_', ''))
              );
              
              if (toolCatalogNode) {
                const toolNodeId = `action-${Date.now()}-${nodeCounter++}`;
                
                const toolNode = {
                  id: toolNodeId,
                  type: 'action',
                  position: {
                    x: mainNode.position.x + (toolIndex * 200),
                    y: 550 // Tools in bottom row
                  },
                  data: {
                    icon: {},
                    type: 'action',
                    label: toolCatalogNode.label,
                    description: toolCatalogNode.description,
                    toolConfig: {
                      apiKeyId: typeof tool === 'object' ? tool.apiKeyId : ''
                    }
                  },
                  width: toolCatalogNode.label.length > 15 ? 180 : 120,
                  height: 120,
                  dragging: false,
                  selected: false,
                  originalId: `${jsonNode.id}_tool_${toolIndex}`,
                  parentNodeId: nodeId // Reference to parent agent node
                };
                
                allNodes.push(toolNode);
                mainNode.toolNodes.push(toolNodeId);
              }
            });
          }
        });
        
        return allNodes;
      };
      
      // Transform JSON edges to ReactFlow edges
      const transformJsonToReactFlowEdges = (jsonEdges: any[], transformedNodes: any[]) => {
        const allEdges: any[] = [];
        
        // Create edges for JSON-defined connections
        jsonEdges.forEach((jsonEdge, index) => {
          // Find the transformed nodes by their original IDs
          const sourceNode = transformedNodes.find(node => node.originalId === jsonEdge.source);
          const targetNode = transformedNodes.find(node => node.originalId === jsonEdge.target);
          
          if (!sourceNode || !targetNode) {
            console.warn(`Could not find nodes for edge: ${jsonEdge.source} -> ${jsonEdge.target}`);
            return;
          }

          allEdges.push({
            id: `reactflow__edge-${sourceNode.id}output-bottom-${targetNode.id}input-top`,
            type: 'bezier',
            style: {
              stroke: 'url(#edge-gradient)',
              opacity: 0.9,
              strokeWidth: 2
            },
            source: sourceNode.id,
            target: targetNode.id,
            animated: true,
            markerEnd: {
              type: 'arrowclosed',
              color: '#3b82f6',
              width: 20,
              height: 20
            },
            sourceHandle: 'output-bottom',
            targetHandle: 'input-top'
          });
        });
        
        // Create edges from agents to their tools
        transformedNodes.forEach(node => {
          if (node.toolNodes && node.toolNodes.length > 0) {
            node.toolNodes.forEach((toolNodeId: string) => {
              allEdges.push({
                id: `reactflow__edge-${node.id}output-bottom-${toolNodeId}input-top`,
                type: 'bezier',
                style: {
                  stroke: 'url(#edge-gradient)',
                  opacity: 0.9,
                  strokeWidth: 2
                },
                source: node.id,
                target: toolNodeId,
                animated: true,
                markerEnd: {
                  type: 'arrowclosed',
                  color: '#3b82f6',
                  width: 20,
                  height: 20
                },
                sourceHandle: 'output-bottom',
                targetHandle: 'input-top'
              });
            });
          }
        });
        
        return allEdges;
      };
      
      // Process the JSON configuration to ReactFlow format
      const transformedNodes = transformJsonToReactFlowNodes(workflowJsonConfig.nodes || []);
      const transformedEdges = transformJsonToReactFlowEdges(workflowJsonConfig.edges || [], transformedNodes);
      
      // Clean up extra properties from nodes before saving
      const finalNodes = transformedNodes.map(node => {
        const { originalId, toolNodes, parentNodeId, ...cleanNode } = node;
        return cleanNode;
      });

      // Generate workflow name from AI description
      // const workflowName = `AI Generated - ${workflowJsonConfig.nodes?.[0]?.name || 'Multi Agent Workflow'}`;
      // const workflowDescription = `Generated by AI Builder: ${workflowJsonConfig.nodes?.map((n: any) => n.name).join(', ') || 'Multi-agent workflow'}`;
      
      // Save or update workflow in Supabase
      let savedWorkflow;
      
      if (workflowId) {
        // Update existing workflow
        savedWorkflow = await updateWorkflow(workflowId, {
          // name: workflowName,
          // description: workflowDescription,
          // agent_type: 'multi_agent',
          // is_active: true,
          // tags: ['ai-generated', 'multi-agent'],
          nodes: finalNodes,
          edges: transformedEdges
        });
        
        toast.success('Workflow updated successfully!', {
          // description: `${workflowName} has been updated with AI configuration`,
          duration: 5000
        });
      } 
      // else {
      //   // Create new workflow
      //   savedWorkflow = await createWorkflow({
      //     name: workflowName,
      //     description: workflowDescription,
      //     agent_type: 'multi_agent',
      //     is_active: true,
      //     tags: ['ai-generated', 'multi-agent'],
      //     nodes: finalNodes,
      //     edges: transformedEdges
      //   });
        
      //   toast.success('Workflow created and saved!', {
      //     description: `${workflowName} has been added to your dashboard`,
      //     duration: 5000
      //   });
      // }

      console.log('Workflow saved to Supabase:', savedWorkflow);

      // Pass the generated workflow to parent component to open in canvas
      if (onWorkflowGenerated && savedWorkflow) {
        onWorkflowGenerated({
          workflowId: savedWorkflow.id,
          workflowData: savedWorkflow
        });
      }

      // Close the modal
      onClose();
      
    } catch (error) {
      console.error('Error generating workflow:', error);
      toast.error('Failed to create workflow', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    // Don't clear chat history when closing - it's now persisted
    setUserMessage('');
    onClose();
  };

  const handleExampleClick = (exampleText: string) => {
    setUserMessage(exampleText);
    setTimeout(() => handleSendMessage(), 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl h-[75vh] max-h-[75vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">WorkflowBot - your expert AI workflow builder</DialogTitle>
              {/* <div className="text-xs text-muted-foreground mt-1 space-y-1">
                {workflowId && (
                  <p>Workflow: {workflowId.slice(0, 8)}...</p>
                )}
                {currentSessionId && (
                  <p>Session: {currentSessionId.slice(-8)}</p>
                )}
              </div> */}
            </div>
            {isLoadingHistory && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col px-4 pb-4 min-h-0 overflow-hidden">
          {/* Chat Area */}
          <div className="border rounded-lg mb-4 flex flex-col bg-muted/20 flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4 min-h-0 max-h-full" ref={scrollAreaRef}>
              {chatHistory.length === 0 && !isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full">
                    <Sparkles className="h-8 w-8 text-blue-500" />
                  </div>
                                      <div className="text-center">
                      <h3 className="font-semibold mb-3">Welcome to WorkflowBot!</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Describe what kind of workflow you want to create.
                      </p>
                      {/* <p className="text-muted-foreground text-xs mb-4">
                        Click on an example to get started:
                      </p> */}
                      <div className="space-y-3">
                        {/* Top row - two buttons left and right */}
                        {/* <div className="flex justify-center items-center gap-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-left justify-start h-8 px-3 hover:bg-blue-50"
                          onClick={() => handleExampleClick("Create a customer support chatbot")}
                          >
                            <Bot className="h-3 w-3 mr-2 text-blue-500" />
                            <span className="text-sm">Customer support chatbot</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-left justify-start h-8 px-3 hover:bg-green-50"
                          onClick={() => handleExampleClick("Build a content research workflow")}
                          >
                            <Search className="h-3 w-3 mr-2 text-green-500" />
                            <span className="text-sm">Content research workflow</span>
                          </Button>
                      </div> */}
                      </div>
                    </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg break-words overflow-wrap-anywhere word-wrap-break-word ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary text-secondary-foreground'
                      }`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <div className="w-full overflow-hidden">
                          <MessageContent content={message.content} />
                        </div>
                        <p className="text-xs opacity-70 mt-2 flex-shrink-0">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-secondary text-secondary-foreground p-3 rounded-lg max-w-[80%]">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Input Area */}
          <div className="space-y-4 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your workflow idea here..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading || isLoadingHistory}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!userMessage.trim() || isLoading || isLoadingHistory}
                size="icon"
                className="h-[60px] w-[60px] flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleGenerateWorkflow}
                disabled={chatHistory.length === 0 || isGenerating || isLoadingHistory}
                className={`${workflowJsonConfig 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Workflow...
                  </>
                ) : workflowJsonConfig ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Workflow
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Workflow
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 