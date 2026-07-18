import { invoke } from '@tauri-apps/api/core';
import type { ToolState } from '../types';
import { appConfig, isAllowedExternalUrl } from './config';
import { baseTools } from './demo-data';

function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

export async function detectTools(): Promise<ToolState[]> {
  if (!isTauri()) {
    return baseTools.map((tool, index) => ({ ...tool, installed: index !== 2 }));
  }
  const detected = await invoke<Array<Pick<ToolState, 'id' | 'installed' | 'version' | 'configPath' | 'adapterStatus' | 'restoreAvailable'>>>('detect_tools');
  const byId = new Map(detected.map((tool) => [tool.id, tool]));
  return baseTools.map((tool) => ({ ...tool, ...byId.get(tool.id) }));
}

export async function openOfficialUrl(url: string): Promise<void> {
  if (!isAllowedExternalUrl(url)) {
    throw new Error('仅允许打开 WBoke 官方 HTTPS 地址');
  }
  if (isTauri()) {
    await invoke('open_official_url', { url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function openRecharge(): Promise<void> {
  await openOfficialUrl(appConfig.storeUrl);
}

export interface ConfigApplyResult {
  toolId: string;
  writtenFiles: string[];
  backupFiles: string[];
  restoreAvailable: boolean;
  message: string;
}

export async function applyToolConfig(toolId: ToolState['id']): Promise<ConfigApplyResult> {
  if (!isTauri()) {
    throw new Error('配置写入只在安装版客户端中可用');
  }
  return invoke<ConfigApplyResult>('apply_tool_config', { toolId });
}

export async function restoreToolConfig(toolId: ToolState['id']): Promise<string[]> {
  if (!isTauri()) {
    throw new Error('配置恢复只在安装版客户端中可用');
  }
  const result = await invoke<{ restoredFiles: string[] }>('restore_tool_config', { toolId });
  return result.restoredFiles;
}
