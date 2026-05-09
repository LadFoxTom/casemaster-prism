import { describe, it, expect } from 'vitest';
import { compareCells } from '../../src/lib/dom.js';

describe('compareCells', () => {
  it('numeric ascending', () => {
    expect(compareCells('10', '2') > 0).toBe(true);
    expect(compareCells('2', '10') < 0).toBe(true);
  });

  it('handles thousands separators', () => {
    expect(compareCells('1,000', '500') > 0).toBe(true);
  });

  it('handles dates', () => {
    expect(compareCells('2024-01-01', '2024-06-01') < 0).toBe(true);
  });

  it('falls back to locale string compare', () => {
    expect(compareCells('apple', 'banana') < 0).toBe(true);
  });

  it('treats currency-like as numeric', () => {
    expect(compareCells('$100', '$50') > 0).toBe(true);
  });

  it('mixed columns sort by string when not all numeric', () => {
    expect(compareCells('A1', 'A10') < 0).toBe(true); // numeric-aware locale compare
  });
});
