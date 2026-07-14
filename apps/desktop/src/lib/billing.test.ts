import { describe, expect, it } from 'vitest';
import { cnyToQuota, grossMargin, quotaToCny } from './billing';

describe('billing conversion', () => {
  it.each([
    [1, 68_493],
    [5, 342_466],
    [10, 684_932],
    [20, 1_369_863],
    [50, 3_424_658],
    [100, 6_849_315],
  ])('converts CNY %s to quota %s', (cny, expectedQuota) => {
    expect(cnyToQuota(cny)).toBe(expectedQuota);
  });

  it('round-trips display currency within one quota unit', () => {
    const quota = cnyToQuota(20);
    expect(quotaToCny(quota)).toBeCloseTo(20, 4);
  });

  it('distinguishes markup from gross margin', () => {
    expect(grossMargin(120, 100)).toBeCloseTo(1 / 6, 6);
  });
});
