export type ViewId = 'overview' | 'tools' | 'models' | 'account';

export interface Account {
  id: number;
  email: string;
  displayName: string;
  group: string;
  balanceCny: number;
  apiKeyMasked: string;
  apiKey?: string;
  baseUrl: string;
  groupMultiplier: number;
}

export interface ModelPrice {
  id: string;
  name: string;
  family: 'OpenAI' | 'Anthropic' | 'Gemini' | 'DeepSeek' | 'GLM';
  inputCnyPerMillion: number;
  outputCnyPerMillion: number;
  latencyMs: number;
  status: 'available' | 'degraded' | 'paused';
}

export interface UsageItem {
  id: string;
  model: string;
  time: string;
  tokens: number;
  costCny: number;
}

export type ToolId = 'codex-cli' | 'claude-code' | 'gemini-cli';

export interface ToolState {
  id: ToolId;
  name: string;
  description: string;
  command: string;
  installed: boolean;
  configPath: string;
  adapterStatus: 'preview' | 'available';
}

export interface DashboardSnapshot {
  account: Account;
  models: ModelPrice[];
  usage: UsageItem[];
  syncedAt: string;
}
