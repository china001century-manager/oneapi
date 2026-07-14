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
    apiKey: 'sk-wbk-demo-key-not-for-production',
    baseUrl: appConfig.apiBaseUrl,
    groupMultiplier: 1.18,
  },
  models: [
    { id: 'gpt-5-codex', name: 'GPT Codex', family: 'OpenAI', inputCnyPerMillion: 11.42, outputCnyPerMillion: 91.36, latencyMs: 684, status: 'available' },
    { id: 'claude-sonnet', name: 'Claude Sonnet', family: 'Anthropic', inputCnyPerMillion: 25.84, outputCnyPerMillion: 129.18, latencyMs: 812, status: 'available' },
    { id: 'gemini-pro', name: 'Gemini Pro', family: 'Gemini', inputCnyPerMillion: 9.76, outputCnyPerMillion: 78.12, latencyMs: 731, status: 'degraded' },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', family: 'DeepSeek', inputCnyPerMillion: 1.63, outputCnyPerMillion: 4.88, latencyMs: 492, status: 'available' },
    { id: 'glm-air', name: 'GLM Air', family: 'GLM', inputCnyPerMillion: 1.46, outputCnyPerMillion: 4.39, latencyMs: 566, status: 'available' },
  ],
  usage: [
    { id: 'use-7641', model: 'Claude Sonnet', time: '今天 14:32', tokens: 18_742, costCny: 0.84 },
    { id: 'use-7638', model: 'GPT Codex', time: '今天 13:08', tokens: 31_906, costCny: 1.27 },
    { id: 'use-7594', model: 'DeepSeek Chat', time: '昨天 22:41', tokens: 54_118, costCny: 0.19 },
  ],
  syncedAt: '刚刚',
};

export const baseTools: ToolState[] = [
  { id: 'codex-cli', name: 'Codex CLI', description: 'OpenAI Responses 接口', command: 'codex', installed: false, configPath: '~/.codex/config.toml', adapterStatus: 'available' },
  { id: 'claude-code', name: 'Claude Code', description: 'Anthropic Messages 接口', command: 'claude', installed: false, configPath: '~/.claude/settings.json', adapterStatus: 'available' },
  { id: 'gemini-cli', name: 'Gemini CLI', description: 'Google Gemini 接口', command: 'gemini', installed: false, configPath: '~/.gemini/.env', adapterStatus: 'available' },
];
