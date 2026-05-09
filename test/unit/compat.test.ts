import { describe, it, expect, beforeEach } from 'vitest';
import { isSelect2Wrapped, isAlreadyEnhanced, markEnhanced, shouldSkip, isOptedOut, isFeatureOn } from '../../src/lib/compat.js';

describe('compat helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('detects Select2-wrapped selects', () => {
    const sel = document.createElement('select');
    sel.classList.add('select2-hidden-accessible');
    expect(isSelect2Wrapped(sel)).toBe(true);

    const plain = document.createElement('select');
    expect(isSelect2Wrapped(plain)).toBe(false);
  });

  it('marks and detects enhancement', () => {
    const t = document.createElement('table') as HTMLElement;
    expect(isAlreadyEnhanced(t)).toBe(false);
    markEnhanced(t);
    expect(isAlreadyEnhanced(t)).toBe(true);
  });

  it('honours data-cms-no-enhance', () => {
    const t = document.createElement('table');
    t.setAttribute('data-cms-no-enhance', '');
    expect(isOptedOut(t)).toBe(true);
    expect(shouldSkip(t)).toBe(true);
  });

  it('feature flag defaults to on when missing', () => {
    expect(isFeatureOn({}, 'tables')).toBe(true);
    expect(isFeatureOn({ tables: false }, 'tables')).toBe(false);
    expect(isFeatureOn({ tables: true }, 'tables')).toBe(true);
    expect(isFeatureOn({ tables: { search: false } }, 'tables')).toBe(true);
  });
});
