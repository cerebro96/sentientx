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
  MessageCircle
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
    description: 'Generate content with AI',
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
  // {
  //   type: 'action',
  //   label: 'Send Email',
  //   description: 'Send an email notification',
  //   icon: Mail,
  //   category: 'Actions',
  // },
  {
    type: 'action',
    label: 'AI Agent',
    description: 'Tools Agent',
    icon: Bot,
    category: 'AI',
    hasError: true,
    childNodes: [
      { label: 'Chat Model*', type: 'connection' },
      { label: 'Memory', type: 'connection' },
      { label: 'Tool', type: 'connection' }
    ]
  }
]; 