// Date formatting helpers. Pure: uses only Date.

// Format an ISO-ish date string to YYYY/MM/DD; '' if falsy; first 10 chars if unparseable.
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 10);
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}
