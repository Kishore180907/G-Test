export type ProviderId = 'openrouter' | 'nvidia' | 'generic-chat-completion-api' | 'gemini' | 'offline';

export interface Provider {
  id: ProviderId;
  name: string;
  isConfigured: boolean;
  baseUrl: string;
}

export interface Model {
  id: string;
  name: string;
  provider: ProviderId;
  description?: string;
  contextLength?: number;
  isFree?: boolean;
  customModel?: {
    model_display_name: string;
    model: string;
    base_url: string;
    api_key: string;
    provider: string;
    max_tokens: number;
  };
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
  providerUsed?: ProviderId;
  error?: boolean;
  wasAutoRouted?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  providerId: ProviderId;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ServerConfigStatus {
  openrouterConfigured: boolean;
  nvidiaConfigured: boolean;
  groqConfigured?: boolean;
  geminiConfigured?: boolean;
}
