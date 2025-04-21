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
  DatabaseZap,
  Webhook
} from "lucide-react";

// Registry of node types mapped to their respective components
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  output: OutputNode,
};

// Catalog of available nodes for the NodePanel
export const nodeCatalog = [
 
  {
    type: 'action',
    label: 'HTTP Request',
    description: 'Make an HTTP request',
    icon: Globe,
    category: 'Actions',
    hidden: true,
  },
  {
    type: 'action',
    label: 'Transform Data',
    description: 'Transform data using JavaScript',
    icon: FileJson,
    category: 'Actions',
    hidden: true,
  },
  {
    type: 'action',
    label: 'OpenAI API',
    description: 'OpenAI Chat Model',
    icon: BrainCircuit,
    category: 'LLM APIs',
    hidden: true,
  },
  {
    type: 'action',
    label: 'Google Gemini API',
    description: 'Gemini Set of Model',
    icon: BrainCircuit,
    category: 'LLM APIs',
    hidden: false,
  },
  {
    type: 'action',
    label: 'Anthropic API',
    description: 'Claude Set Of Model',
    icon: BrainCircuit,
    category: 'LLM APIs',
    hidden: true,
  },
  {
    type: 'action',
    label: 'Deepseek API',
    description: 'Deepseek Set Of Model',
    icon: BrainCircuit,
    category: 'LLM APIs',
    hidden: true,
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
    hidden: false,
  },
  {
    type: 'action',
    label: 'AI Agent',
    description: 'AI-Powered Automation',
    icon: Bot,
    category: 'AI',
    childNodes: [
      { label: 'LLM', type: 'connection' },
      { label: 'Memory', type: 'connection' },
      { label: 'Tool', type: 'connection' },
      { label: 'Parser', type: 'connection' }
    ],
    hidden: false,
  },
  {
    type: 'action',
    label: 'Redis Memory',
    description: 'Stores a customizable length of chat history',
    icon: DatabaseZap,
    category: 'AI',
    hidden: true,
  },
  {
    type: 'action',
    label: 'Respond to Webhook',
    description: 'Works similar to API Server',
    icon: Webhook,
    category: 'Webhook',
    hidden: false,
  },
  {
    type: 'action',
    label: 'Webhook',
    description: 'Start the workflow when a webhook is called',
    icon: Webhook,
    category: 'Webhook',
    hidden: true,
  }
]; 