export type ViewId = 'overview' | 'tools' | 'account';

export interface Account {
  id: number;
  email: string;
  displayName: string;
  group: string;
  balanceCny: number;
  apiKeyMasked: string;
  baseUrl: string;
}

export type ToolId = 'codex-cli' | 'claude-code' | 'gemini-cli' | 'cc-switch';

export interface ToolState {
  id: ToolId;
  name: string;
  description: string;
  command: string;
  installed: boolean;
  version?: string;
  configPath: string;
  adapterStatus: 'available' | 'unsupported';
  restoreAvailable: boolean;
}

export interface DashboardSnapshot {
  account: Account;
  syncedAt: string;
}
