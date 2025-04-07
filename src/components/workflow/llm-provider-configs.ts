/**
 * Configuration for different LLM providers
 */

type LlmProviderConfig = {
  displayName: string;
  defaultCredential: string;
  defaultModel: string;
  credentials: Array<{ label: string; value: string }>;
  models: Array<{ label: string; value: string }>;
  helpText: string;
  advancedSettings?: Array<{
    id: string;
    label: string;
    type: 'text' | 'number' | 'select';
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
  }>;
  documentation: {
    description: string;
    usagePoints: string[];
    url: string;
  };
};

export const llmProviderConfigs: Record<string, LlmProviderConfig> = {
  'openai': {
    displayName: 'OpenAI Chat Model',
    defaultCredential: 'openai-api-key',
    defaultModel: 'gpt-4o',
    credentials: [
      { label: 'OpenAI API Key', value: 'openai-api-key' },
      { label: 'OpenAI Organization Key', value: 'openai-org-key' }
    ],
    models: [
      { label: 'GPT-4o', value: 'gpt-4o' },
      { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
      { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
      { label: 'GPT-4', value: 'gpt-4' },
      { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
    ],
    helpText: 'OpenAI models are powerful language models that can be used for a variety of tasks including chat, text completion, and more.',
    advancedSettings: [
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0-1 (Default: 0.7)'
      },
      {
        id: 'max-tokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: 'Max response length'
      },
      {
        id: 'system-prompt',
        label: 'System Prompt',
        type: 'text',
        placeholder: 'Instructions for the AI assistant'
      }
    ],
    documentation: {
      description: 'OpenAI offers powerful language models through a simple API. You can use these models for chat completion, text generation, and more.',
      usagePoints: [
        'Configure your API credentials in the credentials section',
        'Select an appropriate model for your task',
        'Adjust parameters like temperature to control response randomness',
        'Use system prompts to set behavior and context'
      ],
      url: 'https://platform.openai.com/docs/api-reference'
    }
  },
  
  'gemini': {
    displayName: 'Google Gemini Chat Model',
    defaultCredential: 'gemini-api-key',
    defaultModel: 'models/gemini-1.5-pro',
    credentials: [
      { label: 'Google Gemini(PaLM) API account', value: 'gemini-api-key' }
    ],
    models: [
      { label: 'Gemini 1.5 Pro', value: 'models/gemini-1.5-pro' },
      { label: 'Gemini 1.5 Flash', value: 'models/gemini-1.5-flash' },
      { label: 'Gemini 1.0 Pro', value: 'models/gemini-1.0-pro' },
      { label: 'Gemini 1.0 Ultra', value: 'models/gemini-1.0-ultra' }
    ],
    helpText: 'Google Gemini models are multimodal models that can understand and process text, code, audio, image and video.',
    advancedSettings: [
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0-1 (Default: 0.7)'
      },
      {
        id: 'max-output-tokens',
        label: 'Max Output Tokens',
        type: 'number',
        placeholder: 'Max response length'
      }
    ],
    documentation: {
      description: 'Google Gemini is a family of multimodal AI models that can understand virtually any input, generate virtually any output, and follow instructions with remarkable capabilities.',
      usagePoints: [
        'Get your API key from Google AI Studio or Google Cloud',
        'Select a model based on your performance and capability needs',
        'Adjust temperature to control response randomness',
        'Gemini supports multimodal inputs including text, images, and more'
      ],
      url: 'https://ai.google.dev/gemini-api/docs'
    }
  },
  
  'anthropic': {
    displayName: 'Anthropic Claude Model',
    defaultCredential: 'anthropic-api-key',
    defaultModel: 'claude-3-opus-20240229',
    credentials: [
      { label: 'Anthropic API Key', value: 'anthropic-api-key' }
    ],
    models: [
      { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
      { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
      { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
      { label: 'Claude 2', value: 'claude-2' },
      { label: 'Claude Instant', value: 'claude-instant-1' }
    ],
    helpText: 'Anthropic Claude models are designed to be helpful, harmless, and honest AI assistants.',
    advancedSettings: [
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0-1 (Default: 0.7)'
      },
      {
        id: 'max-tokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: 'Max response length'
      },
      {
        id: 'system-prompt',
        label: 'System Prompt',
        type: 'text',
        placeholder: 'Instructions for Claude'
      }
    ],
    documentation: {
      description: 'Claude is a family of AI assistants created by Anthropic designed to be helpful, harmless, and honest.',
      usagePoints: [
        'Obtain your API key from Anthropic',
        'Claude 3 models support text and image inputs',
        'Use system prompts to guide Claude\'s behavior',
        'Consider Claude Opus for complex tasks and Claude Haiku for speed'
      ],
      url: 'https://docs.anthropic.com/claude/reference'
    }
  },
  
  'deepseek': {
    displayName: 'Deepseek Chat Model',
    defaultCredential: 'deepseek-api-key',
    defaultModel: 'deepseek-coder',
    credentials: [
      { label: 'Deepseek API Key', value: 'deepseek-api-key' }
    ],
    models: [
      { label: 'Deepseek Coder', value: 'deepseek-coder' },
      { label: 'Deepseek Chat', value: 'deepseek-chat' },
      { label: 'Deepseek LLM 67B', value: 'deepseek-llm-67b' }
    ],
    helpText: 'Deepseek models excel at coding tasks and complex problem-solving.',
    advancedSettings: [
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0-1 (Default: 0.7)'
      },
      {
        id: 'max-length',
        label: 'Max Length',
        type: 'number',
        placeholder: 'Max response length'
      }
    ],
    documentation: {
      description: 'Deepseek models are specialized in coding and development tasks, offering high performance for technical applications.',
      usagePoints: [
        'Configure your Deepseek API credentials',
        'Use Deepseek Coder for programming-related tasks',
        'Adjust parameters to control response style and length',
        'Provide clear instructions for best results'
      ],
      url: 'https://platform.deepseek.com/api-reference'
    }
  }
}; 