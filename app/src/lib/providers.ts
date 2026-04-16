export type ProviderId = 'groq' | 'deepseek' | 'openrouter'

export type ProviderDefinition = {
  id: ProviderId
  label: string
  modelsEndpoint: string
  chatEndpoint: string
  keyPlaceholder: string
  keyPrefixes: string[]
  defaultModel: string
  featuredModels: string[]
}

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  groq: {
    id: 'groq',
    label: 'Groq',
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    chatEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyPlaceholder: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxx',
    keyPrefixes: ['gsk_'],
    defaultModel: 'moonshotai/kimi-k2-instruct-0905',
    featuredModels: [
      'moonshotai/kimi-k2-instruct-0905',
      'llama-3.3-70b-versatile',
      'deepseek-r1-distill-llama-70b',
      'qwen/qwen3-32b',
    ],
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    modelsEndpoint: 'https://api.deepseek.com/models',
    chatEndpoint: 'https://api.deepseek.com/chat/completions',
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
    keyPrefixes: ['sk-'],
    defaultModel: 'deepseek-chat',
    featuredModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyPlaceholder: 'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx',
    keyPrefixes: ['sk-or-v1-', 'sk-or-'],
    defaultModel: 'openai/gpt-4o-mini',
    featuredModels: [
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.5-pro',
      'meta-llama/llama-3.3-70b-instruct',
    ],
  },
}

export const PROVIDER_LIST = Object.values(PROVIDERS)
