export const DEFAULT_QUOTA_PER_USD = 500_000;
export const DEFAULT_USD_TO_CNY = 7.3;

export function cnyToQuota(
  amountCny: number,
  quotaPerUsd = DEFAULT_QUOTA_PER_USD,
  usdToCny = DEFAULT_USD_TO_CNY,
): number {
  if (!Number.isFinite(amountCny) || amountCny < 0) {
    throw new RangeError('amountCny must be a non-negative finite number');
  }
  if (quotaPerUsd <= 0 || usdToCny <= 0) {
    throw new RangeError('quota and exchange rate must be positive');
  }
  return Math.round((amountCny / usdToCny) * quotaPerUsd);
}

export function quotaToCny(
  quota: number,
  quotaPerUsd = DEFAULT_QUOTA_PER_USD,
  usdToCny = DEFAULT_USD_TO_CNY,
): number {
  if (!Number.isFinite(quota)) {
    throw new RangeError('quota must be finite');
  }
  if (quotaPerUsd <= 0 || usdToCny <= 0) {
    throw new RangeError('quota and exchange rate must be positive');
  }
  return (quota / quotaPerUsd) * usdToCny;
}

export function grossMargin(salePrice: number, upstreamCost: number): number {
  if (salePrice <= 0) return 0;
  return (salePrice - upstreamCost) / salePrice;
}
