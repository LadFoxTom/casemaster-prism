import { describe, it, expect } from 'vitest';
import { _internals } from '../../src/enhancers/tables.js';

const { csvField } = _internals;

describe('csvField', () => {
  it('passes simple values through', () => {
    expect(csvField('hello')).toBe('hello');
  });

  it('quotes commas', () => {
    expect(csvField('a,b')).toBe('"a,b"');
  });

  it('collapses newlines to a space', () => {
    // Multi-line content inside HTML <td> is almost always unintended
    // whitespace, not a literal value. We collapse rather than quote.
    expect(csvField('a\nb')).toBe('a b');
  });

  it('escapes embedded quotes by doubling them', () => {
    expect(csvField('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('collapses whitespace', () => {
    expect(csvField('  a  b  ')).toBe('a b');
  });
});
