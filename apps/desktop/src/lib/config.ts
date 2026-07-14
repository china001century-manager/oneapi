export const appConfig = {
  portalOrigin: import.meta.env.VITE_PORTAL_ORIGIN ?? 'https://www.wboke.com',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://api.wboke.com/v1',
  storeUrl: import.meta.env.VITE_STORE_URL ?? 'https://www.wboke.com/recharge',
  demoMode: import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'false',
} as const;

export function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && (url.hostname === 'wboke.com' || url.hostname.endsWith('.wboke.com'));
  } catch {
    return false;
  }
}
