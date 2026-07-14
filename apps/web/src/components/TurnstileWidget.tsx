import { useEffect, useRef } from 'react';

interface TurnstileApi {
  render(container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; theme: 'light' }): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('安全验证加载失败，请刷新页面重试'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileWidget({ siteKey, resetKey, onToken }: { siteKey: string; resetKey: number; onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let widgetId = '';
    void loadTurnstile().then(() => {
      if (disposed || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
        theme: 'light',
      });
    });
    return () => {
      disposed = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken, resetKey, siteKey]);

  return <div className="turnstile-slot" ref={containerRef} aria-label="安全验证" />;
}
