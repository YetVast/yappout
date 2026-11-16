// src/utils/logger.ts
// Diagnostic logging instrumentation for YappOut speech playback, lifecycle, and recovery events.
// Active only in development/test environments; produces zero console noise and zero telemetry in production.

export function safeTruncate(text: string, maxLength = 30): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength)}... (${clean.length} chars)`;
}

export type DiagnosticCategory =
  | 'Speech'
  | 'Session'
  | 'Lifecycle'
  | 'MediaSession'
  | 'Recovery'
  | 'Playback';

export function logDiagnostic(
  category: DiagnosticCategory,
  message: string,
  details?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'production') return;

  const prefix = `[YappOut:${category}]`;
  if (details && Object.keys(details).length > 0) {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(details)) {
      if (
        typeof v === 'string' &&
        (k.toLowerCase().includes('text') || k.toLowerCase().includes('content'))
      ) {
        sanitized[k] = safeTruncate(v);
      } else {
        sanitized[k] = v;
      }
    }
    console.debug(`${prefix} ${message}`, sanitized);
  } else {
    console.debug(`${prefix} ${message}`);
  }
}
