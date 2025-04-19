import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { 
  Edge, 
  Node, 
  NodeChange, 
  EdgeChange, 
  Connection, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge 
} from 'reactflow';

// Define node types
export type NodeData = {
  label: string;
  description?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  type?: string;
  icon?: any;
  hasError?: boolean;
  childNodes?: Array<{label: string; type: string}>;
  buttonStyle?: boolean;
  llmConfig?: {
    provider?: string;
    credential?: string;
    apiKeyId?: string;
    model?: string;
    options?: Array<{ key: string; value: string }>;
  };
  memoryConfig?: {
    sessionTTL?: string;
    contextWindowLength?: string;
  };
  chatConfig?: {
    isPublic?: boolean;
    initialMessage?: string;
    mode?: string;
    auth?: string;
    chatId?: string;
  };
  webhookConfig?: {
    webhookUrl?: string;
    isOneoff?: boolean;
    webhookId?: string;
    apiEnabled?: boolean;
    workflowId?: string | null;
  };
};

// Define initial nodes with proper types
export const initialNodes: Node<NodeData>[] = [];

// Define initial edges
export const initialEdges: Edge[] = [];

export type RFState = {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNode: Node<NodeData> | null;
  isReady: boolean;
  workflowId: string | null;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  selectNode: (node: Node<NodeData> | null) => void;
  setWorkflow: (nodes: Node<NodeData>[], edges: Edge[]) => void;
  resetWorkflow: () => void;
  setIsReady: (isReady: boolean) => void;
  setWorkflowId: (id: string | null) => void;
};

// Create the store with the immer middleware
export const useWorkflowStore = create<RFState>()(
  immer((set) => ({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNode: null,
    isReady: false,
    workflowId: null,

    onNodesChange: (changes) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes) as Node<NodeData>[];
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges);
      });
    },

    onConnect: (connection) => {
      set((state) => {
        state.edges = addEdge(connection, state.edges);
      });
    },

    addNode: (node) => {
      set((state) => {
        state.nodes.push(node);
      });
    },

    removeNode: (nodeId) => {
      set((state) => {
        state.nodes = state.nodes.filter((node) => node.id !== nodeId);
        state.edges = state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        );
        if (state.selectedNode && state.selectedNode.id === nodeId) {
          state.selectedNode = null;
        }
      });
    },

    updateNodeData: (nodeId, data) => {
      set((state) => {
        const nodeIndex = state.nodes.findIndex((node) => node.id === nodeId);
        if (nodeIndex !== -1) {
          const node = state.nodes[nodeIndex];
          state.nodes[nodeIndex] = {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
          
          if (state.selectedNode && state.selectedNode.id === nodeId) {
            state.selectedNode = state.nodes[nodeIndex];
          }
        }
      });
    },

    selectNode: (node) => {
      set((state) => {
        state.selectedNode = node;
      });
    },

    setWorkflow: (nodes, edges) => {
      set((state) => {
        state.nodes = nodes;
        state.edges = edges;
      });
    },

    resetWorkflow: () => {
      set((state) => {
        state.nodes = initialNodes;
        state.edges = initialEdges;
        state.selectedNode = null;
        state.workflowId = null;
      });
    },

    setIsReady: (isReady) => {
      set((state) => {
        state.isReady = isReady;
      });
    },
    
    setWorkflowId: (id) => {
      set((state) => {
        state.workflowId = id;
      });
    },
  }))
); 