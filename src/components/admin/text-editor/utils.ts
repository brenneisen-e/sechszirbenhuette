import type { FontSizeResponsive } from './types';

// Helper to parse font_size (can be plain number or JSON with mobile/desktop)
export function parseFontSize(fontSizeStr: string | null): FontSizeResponsive | null {
  if (!fontSizeStr) return null;
  try {
    const parsed = JSON.parse(fontSizeStr);
    if (parsed.mobile && parsed.desktop) {
      return parsed as FontSizeResponsive;
    }
  } catch {
    // Not JSON, treat as single value for both
    return { mobile: fontSizeStr, desktop: fontSizeStr };
  }
  return { mobile: fontSizeStr, desktop: fontSizeStr };
}

// Helper to serialize font_size
export function serializeFontSize(sizes: FontSizeResponsive): string {
  return JSON.stringify(sizes);
}
