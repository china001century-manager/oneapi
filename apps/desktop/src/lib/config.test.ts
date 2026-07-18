import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl } from './config';

describe('external URL allowlist', () => {
  it('allows only the production site and the approved store', () => {
    expect(isAllowedExternalUrl('https://www.wboke.com/wallet')).toBe(true);
    expect(isAllowedExternalUrl('https://api.wboke.com/v1')).toBe(true);
    expect(isAllowedExternalUrl('https://pay.ldxp.cn/shop/36YZL53G')).toBe(true);
  });

  it('rejects lookalike hosts and insecure URLs', () => {
    expect(isAllowedExternalUrl('http://www.wboke.com')).toBe(false);
    expect(isAllowedExternalUrl('https://wboke.com.example.test')).toBe(false);
    expect(isAllowedExternalUrl('https://pay.ldxp.cn.example.test/shop')).toBe(false);
  });
});
