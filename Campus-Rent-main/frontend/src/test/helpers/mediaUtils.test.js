import { describe, it, expect } from 'vitest';
import { isExternalImage, resolveMediaDisplay } from '../../utils/mediaUtils';

describe('isExternalImage', () => {
  it('returns true for https urls', () => {
    expect(isExternalImage('https://example.com/image.jpg')).toBe(true);
  });

  it('returns true for http urls', () => {
    expect(isExternalImage('http://example.com/image.png')).toBe(true);
  });

  it('returns false for gradient class names', () => {
    expect(isExternalImage('purple')).toBe(false);
    expect(isExternalImage('blue')).toBe(false);
    expect(isExternalImage('teal')).toBe(false);
    expect(isExternalImage('coral')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isExternalImage('')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isExternalImage(null)).toBe(false);
    expect(isExternalImage(undefined)).toBe(false);
    expect(isExternalImage(123)).toBe(false);
  });
});

describe('resolveMediaDisplay', () => {
  it('returns background-image style for external URLs', () => {
    const result = resolveMediaDisplay('https://example.com/img.jpg');
    expect(result.className).toBe('marketplace-card-media');
    expect(result.style.backgroundImage).toContain('example.com');
    expect(result.style.backgroundSize).toBe('cover');
  });

  it('uses the gradient class for known color names', () => {
    const result = resolveMediaDisplay('teal');
    expect(result.className).toBe('marketplace-card-media teal');
    expect(result.style).toEqual({});
  });

  it('falls back to default gradient for unknown values', () => {
    const result = resolveMediaDisplay('unknown-color');
    expect(result.className).toBe('marketplace-card-media purple');
    expect(result.style).toEqual({});
  });

  it('uses custom fallback when provided', () => {
    const result = resolveMediaDisplay(null, 'coral');
    expect(result.className).toBe('marketplace-card-media coral');
  });

  it('falls back to purple by default for null', () => {
    const result = resolveMediaDisplay(null);
    expect(result.className).toBe('marketplace-card-media purple');
  });
});
