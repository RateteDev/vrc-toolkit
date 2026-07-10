import { useEffect, useState } from "react";

// Relative-time label for a manual-refresh model: the whole app only reloads on
// first mount and explicit refresh, so the freshness of the shown data must be
// visible at all times. Seconds tick live; the absolute time is on hover.
function formatRelative(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 5) return "たった今";
  if (s < 60) return `${s}秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatAbsolute(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function LastUpdated({ at }: { at: Date | null }) {
  // A local tick isolated to this node: bumping it re-renders only the label,
  // never the surrounding list. One interval, one text node.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!at) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [at]);

  if (!at) return null;
  return (
    <span className="flast-update" title={formatAbsolute(at)}>
      更新: {formatRelative(Date.now() - at.getTime())}
    </span>
  );
}
