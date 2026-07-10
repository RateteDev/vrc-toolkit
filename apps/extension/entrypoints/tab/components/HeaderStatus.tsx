import type { VrcStatus } from "@vrc-toolkit/core/domain";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAccount } from "../account";
import { statusDotClass } from "../status";
import { cssUrl } from "../views/cssUrl";

const STATUS_CARDS: Array<{ value: VrcStatus; label: string }> = [
  { value: "join me", label: "join me" },
  { value: "active", label: "active" },
  { value: "ask me", label: "ask me" },
  { value: "busy", label: "busy" },
  { value: "offline", label: "offline" },
];

const STATUS_PRESETS = ["作業中", "まったり", "通話中", "寝落ち", "AFK"];

// Header widget: the account owner's avatar + a status dot, always visible so an
// externally-changed status reads as stale immediately. Click opens a popover
// that edits status (applied on select) and the status text (applied on Enter /
// button). No separate GET: it rides the shared account context.
export function HeaderStatus() {
  const { account } = useAccount();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!account) return null;

  return (
    <div className="hstatus" ref={wrapRef}>
      <button
        type="button"
        className="hstatus-btn"
        aria-label="ステータスを変更"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="hstatus-avatar"
          style={account.imageUrl ? { backgroundImage: cssUrl(account.imageUrl) } : undefined}
        >
          <span className={`hstatus-dot ${statusDotClass(account.status)}`} />
        </span>
        <span className="hstatus-text">
          <span className="hstatus-name">{account.displayName || "自分"}</span>
          <span className="hstatus-desc">{account.statusDescription || account.status || "—"}</span>
        </span>
      </button>
      {open ? <StatusPopover /> : null}
    </div>
  );
}

function StatusPopover() {
  const { account, updateStatus } = useAccount();
  const [text, setText] = useState(account?.statusDescription ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (patch: { status?: VrcStatus; statusDescription?: string }) => {
    setBusy(true);
    setError(null);
    updateStatus(patch)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  const applyText = () => {
    if (text.trim() === (account?.statusDescription ?? "")) return;
    apply({ statusDescription: text.trim() });
  };

  const onTextKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyText();
    }
  };

  return (
    <div className="hpop" role="dialog" aria-label="ステータス変更">
      <div className="hpop-cards">
        {STATUS_CARDS.map((card) => (
          <button
            key={card.value}
            type="button"
            className={card.value === account?.status ? "hpop-card selected" : "hpop-card"}
            disabled={busy}
            onClick={() => apply({ status: card.value })}
          >
            <span className={`sdot ${statusDotClass(card.value)}`} />
            {card.label}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="hpopText">ステータス文</label>
        <div className="hpop-textrow">
          <input
            id="hpopText"
            type="text"
            placeholder="表示するひとこと"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onTextKeyDown}
          />
          <button type="button" className="hpop-apply" disabled={busy} onClick={applyText}>
            確定
          </button>
        </div>
        <div className="spresets">
          {STATUS_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="preset"
              disabled={busy}
              onClick={() => {
                setText(preset);
                apply({ statusDescription: preset });
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="mstatus err">{error}</p> : null}
    </div>
  );
}
