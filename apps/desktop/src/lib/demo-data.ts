import type { DashboardSnapshot, ToolState } from '../types';
import { appConfig } from './config';

export const demoSnapshot: DashboardSnapshot = {
  account: {
    id: 1048,
    email: 'member@wboke.com',
    displayName: 'WBoke Member',
    group: '默认用户组',
    balanceCny: 32.68,
    apiKeyMasked: 'sk-wbk-••••••••••••4F2A',
    baseUrl: appConfig.apiBaseUrl,
  },
  syncedAt: '刚刚',
};

export const baseTools: ToolState[] = [
  { id: 'codex-cli', name: 'Codex CLI', description: 'OpenAI Responses 接口', command: 'codex', installed: false, configPath: '~/.codex/config.toml', adapterStatus: 'available', restoreAvailable: false },
  { id: 'claude-code', name: 'Claude Code', description: 'Anthropic Messages 接口', command: 'claude', installed: false, configPath: '~/.claude/settings.json', adapterStatus: 'available', restoreAvailable: false },
  { id: 'gemini-cli', name: 'Gemini CLI', description: 'Google Gemini 接口', command: 'gemini', installed: false, configPath: '~/.gemini/.env', adapterStatus: 'available', restoreAvailable: false },
  { id: 'cc-switch', name: 'CC Switch', description: '添加 Codex、Claude 与 Gemini 供应商', command: 'cc-switch', installed: false, configPath: '~/.cc-switch/cc-switch.db', adapterStatus: 'available', restoreAvailable: false },
];
