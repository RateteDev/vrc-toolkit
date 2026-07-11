// Date formatting helpers. Pure: uses only Date.

// Format an ISO-ish date string to YYYY/MM/DD; '' if falsy; first 10 chars if unparseable.
// Uses local-time getters intentionally: this is a UI display helper, and dates
// should read in the viewer's own timezone, not UTC.
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 10);
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

// Format an ISO-ish instant to YYYY/MM/DD HH:MM (local time); '' if falsy;
// first 10 chars if unparseable. Same contract as fmtDate, plus wall-clock time.
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 10);
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Japanese relative label for a recent instant: たった今 / N分前 / N時間前 /
// N日前 (up to 30 days). Returns null when the instant is older than 30 days,
// in the future (clock skew), falsy, or unparseable — the caller is expected
// to fall back to an absolute date.
export function fmtRelative(s: string | null | undefined, now: Date): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return null;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days}日前`;
  return null;
}
