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

// Common advanced settings shared across providers
const commonAdvancedSettings = {
  temperature: {
    id: 'temperature',
    label: 'Temperature',
    type: 'number' as const,
    placeholder: '0-1 (Default: 0.7)'
  },
  systemPrompt: {
    id: 'system-prompt',
    label: 'System Prompt',
    type: 'text' as const,
    placeholder: 'Instructions for the AI Agent'
  }
};

// Token length settings with provider-specific naming
const getTokenSettings = (id: string) => ({
  id,
  label: id === 'max-output-tokens' ? 'Max Output Tokens' : 'Max Tokens',
  type: 'number' as const,
  placeholder: 'Max response length'
});

export const llmProviderConfigs: Record<string, LlmProviderConfig> = {
  'openai': {
    displayName: 'OpenAI Chat Model',
    defaultCredential: 'openai-api-key',
    defaultModel: 'gpt-4o-2024-08-06',
    credentials: [
      { label: 'OpenAI API Key', value: 'openai-api-key' },
      { label: 'OpenAI Organization Key', value: 'openai-org-key' }
    ],
    models: [
      { label: 'GPT-4o', value: 'gpt-4o-2024-08-06' },
      { label: 'o1', value: 'o1-2024-12-17' },
      { label: 'o1-pro', value: 'o1-pro-2025-03-19' },
      { label: 'o3-mini', value: 'o3-mini-2025-01-31' },
      { label: 'o1-mini', value: 'o1-mini-2024-09-12' },
      { label: 'gpt-4o-mini-search-preview', value: 'gpt-4o-mini-search-preview-2025-03-11' },
      { label: 'gpt-4o-search-preview', value: 'gpt-4o-search-preview-2025-03-11' },
      { label: 'computer-use-preview', value: 'computer-use-preview-2025-03-11' },
      { label: 'gpt-4.5-preview', value: 'gpt-4.5-preview-2025-02-27' },
      { label: 'gpt-4o-audio-preview', value: 'gpt-4o-audio-preview-2024-12-17' },
      { label: 'gpt-4o-realtime-preview', value: 'gpt-4o-realtime-preview-2024-12-17' },
      { label: 'gpt-4o-mini', value: 'gpt-4o-mini-2024-07-18' },
      { label: 'gpt-4o-mini-audio-preview', value: 'gpt-4o-mini-audio-preview-2024-12-17' },
      { label: 'gpt-4o-mini-realtime-preview', value: 'gpt-4o-mini-realtime-preview-2024-12-17' }
    ],
    helpText: 'OpenAI models are powerful language models that can be used for a variety of tasks including chat, text completion, and more.',
    advancedSettings: [
      commonAdvancedSettings.temperature,
      getTokenSettings('max-tokens'),
      commonAdvancedSettings.systemPrompt
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
    defaultModel: 'gemini-2.0-flash',
    credentials: [
      { label: 'Google Gemini(PaLM) API account', value: 'gemini-api-key' }
    ],
    models: [
      { label: 'Gemini 2.5 Pro Preview', value: 'gemini-2.5-pro-preview-03-25' },
      { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
      { label: 'Gemini 2.0 Flash-Lite', value: 'gemini-2.0-flash-lite' },
      { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
      { label: 'Gemini 1.5 Flash-8B', value: 'gemini-1.5-flash-8b' },
      { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
      { label: 'Gemini Embedding', value: 'gemini-embedding-exp' },
      { label: 'Imagen 3', value: 'imagen-3.0-generate-002' },
      { label: 'Veo 2', value: 'veo-2.0-generate-001' },
      { label: 'Gemini 2.0 Flash Live', value: 'gemini-2.0-flash-live-001' }
    ],
    helpText: 'Google Gemini models are multimodal models that can understand and process text, code, audio, image and video.',
    advancedSettings: [
      commonAdvancedSettings.temperature,
      getTokenSettings('max-output-tokens'),
      commonAdvancedSettings.systemPrompt
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
    defaultModel: 'claude-3-7-sonnet-20250219',
    credentials: [
      { label: 'Anthropic API Key', value: 'anthropic-api-key' }
    ],
    models: [
      { label: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-20250219' },
      { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
      { label: 'Claude 3.5 Sonnet v2', value: 'claude-3-5-sonnet-20241022' },
      { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
      { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
      { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
      { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
    ],
    helpText: 'Anthropic Claude models are designed to be helpful, harmless, and honest AI assistants.',
    advancedSettings: [
      commonAdvancedSettings.temperature,
      getTokenSettings('max-tokens'),
      commonAdvancedSettings.systemPrompt
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
    defaultModel: 'deepseek-chat',
    credentials: [
      { label: 'Deepseek API Key', value: 'deepseek-api-key' }
    ],
    models: [
      { label: 'Deepseek Reasoner (R1)', value: 'deepseek-reasoner' },
      { label: 'Deepseek Chat (V3)', value: 'deepseek-chat' },
    ],
    helpText: 'Deepseek models excel at coding tasks and complex problem-solving.',
    advancedSettings: [
      commonAdvancedSettings.temperature,
      getTokenSettings('max-length'),
      commonAdvancedSettings.systemPrompt
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