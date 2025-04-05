import { TriggerNode } from "./nodes/TriggerNode";
import { ActionNode } from "./nodes/ActionNode";
import { OutputNode } from "./nodes/OutputNode";
import { 
  Zap, 
  Globe, 
  FileJson, 
  BrainCircuit, 
  Database, 
  Mail, 
  MessageSquare,
  CircleIcon,
  SquareIcon,
  Bot,
  AlertTriangle,
  MessageCircle,
  MemoryStickIcon,
  DatabaseZap
} from "lucide-react";

// Registry of node types mapped to their respective components
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  output: OutputNode,
};

// Catalog of available nodes for the NodePanel
export const nodeCatalog = [
 
  // {
  //   type: 'action',
  //   label: 'HTTP Request',
  //   description: 'Make an HTTP request',
  //   icon: Globe,
  //   category: 'Actions',
  // },
  // {
  //   type: 'action',
  //   label: 'Transform Data',
  //   description: 'Transform data using JavaScript',
  //   icon: FileJson,
  //   category: 'Actions',
  // },
  {
    type: 'action',
    label: 'OpenAI API',
    description: 'OpenAI Chat Model',
    icon: BrainCircuit,
    category: 'LLM APIs',
  },
  {
    type: 'action',
    label: 'Google Gemini API',
    description: 'Gemini Chat Model',
    icon: BrainCircuit,
    category: 'LLM APIs',
  },
  {
    type: 'action',
    label: 'Deepseek API',
    description: 'Deepseek Chat Model',
    icon: BrainCircuit,
    category: 'LLM APIs',
  },
  // {
  //   type: 'action',
  //   label: 'Database Query',
  //   description: 'Query a database',
  //   icon: Database,
  //   category: 'Actions',
  // },
  {
    type: 'action',
    label: 'Chat Trigger',
    description: 'Trigger the chat',
    icon: MessageCircle,
    category: 'Triggers',
  },
  {
    type: 'action',
    label: 'AI Agent',
    description: 'Tools Agent',
    icon: Bot,
    category: 'AI',
    // hasError: true,
    childNodes: [
      { label: 'LLM', type: 'connection' },
      { label: 'Memory', type: 'connection' },
      { label: 'Tool', type: 'connection' }
    ]
  },
  {
  type: 'action',
  label: 'Simple Memory',
  description: 'Stores a customizable length of chat history',
  icon: DatabaseZap,
  category: 'AI',
  }
]; 