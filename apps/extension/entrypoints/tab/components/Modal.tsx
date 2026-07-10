import type { ReactNode } from "react";
import { useEffect } from "react";

interface Props {
  title?: string;
  hint?: string;
  // Invoked by Esc, the close button, and a backdrop click. The caller owns the
  // guard (e.g. confirm before discarding staged files), so this is a *request*
  // to close, not an unconditional close.
  onRequestClose: () => void;
  wide?: boolean;
  children: ReactNode;
}

export function Modal({ title, hint, onRequestClose, wide, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "ダイアログ"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onRequestClose();
      }}
    >
      <div className={wide ? "sheet upload-sheet" : "sheet"}>
        <button type="button" className="close" onClick={onRequestClose} aria-label="閉じる">
          ×
        </button>
        {title ? (
          <div className="shead">
            <h2>{title}</h2>
          </div>
        ) : null}
        {hint ? <p className="hint">{hint}</p> : null}
        {children}
      </div>
    </div>
  );
}
