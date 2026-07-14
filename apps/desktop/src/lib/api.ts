import { invoke } from '@tauri-apps/api/core';
import type { DashboardSnapshot } from '../types';
import { appConfig } from './config';
import { demoSnapshot } from './demo-data';

export interface LoginResult {
  requiresTwoFactor: boolean;
  snapshot?: DashboardSnapshot;
}

export interface NewApiClient {
  login(email: string, password: string): Promise<LoginResult>;
  verifyTwoFactor(code: string): Promise<DashboardSnapshot>;
  sync(): Promise<DashboardSnapshot>;
  logout(): Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

class DemoClient implements NewApiClient {
  async login(email: string, password: string): Promise<LoginResult> {
    await delay(450);
    if (!email.includes('@') || password.length < 8) {
      throw new Error('请输入有效邮箱和至少 8 位密码');
    }
    return {
      requiresTwoFactor: false,
      snapshot: { ...demoSnapshot, account: { ...demoSnapshot.account, email } },
    };
  }

  async verifyTwoFactor(): Promise<DashboardSnapshot> {
    await delay(300);
    return demoSnapshot;
  }

  async sync(): Promise<DashboardSnapshot> {
    await delay(600);
    return { ...demoSnapshot, syncedAt: '刚刚' };
  }

  async logout(): Promise<void> {
    await delay(100);
  }
}

class TauriClient implements NewApiClient {
  login(email: string, password: string): Promise<LoginResult> {
    return invoke<LoginResult>('desktop_login', {
      username: email,
      password,
      turnstileToken: null,
    });
  }

  verifyTwoFactor(code: string): Promise<DashboardSnapshot> {
    return invoke<DashboardSnapshot>('desktop_verify_two_factor', { code });
  }

  sync(): Promise<DashboardSnapshot> {
    return invoke<DashboardSnapshot>('desktop_sync');
  }

  logout(): Promise<void> {
    return invoke<void>('desktop_logout');
  }
}

export const newApiClient: NewApiClient = appConfig.demoMode ? new DemoClient() : new TauriClient();
