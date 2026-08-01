// Lightweight server-side logging for API call auditing.
// Logs to console (visible in Vercel function logs). For persistent
// logs, this could later write to a Supabase table.

interface LogEntry {
  api: 'geocode' | 'route' | 'segment';
  userId?: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export function logApiCall(entry: LogEntry) {
  const ts = new Date().toISOString();
  if (entry.success) {
    console.log(`[API:${entry.api}] ${ts} user=${entry.userId ?? 'anon'} ok (${entry.durationMs}ms)`);
  } else {
    console.warn(`[API:${entry.api}] ${ts} user=${entry.userId ?? 'anon'} FAILED (${entry.durationMs}ms) — ${entry.error}`);
  }
}
