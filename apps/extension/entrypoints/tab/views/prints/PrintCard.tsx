import { fmtDate, type PrintSummary } from "@vrc-toolkit/core/domain";
import { cssUrl } from "../cssUrl";
import { TrashIcon } from "./icons";

interface Props {
  print: PrintSummary;
  // Single-delete affordance (hidden in select mode). Omitting it renders a
  // plain, non-deletable card.
  onDelete?: () => void;
  deleting?: boolean;
  // Select mode: the whole card toggles selection instead of showing a delete
  // button, and a check overlay marks the chosen ones.
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

export function PrintCard({ print, onDelete, deleting, selectable, selected, onToggle }: Props) {
  const className = `pcard${deleting ? " removing" : ""}${selected ? " selected" : ""}`;
  const thumb = (
    <>
      <div
        className="pthumb"
        style={print.imageUrl ? { backgroundImage: cssUrl(print.imageUrl) } : undefined}
      />
      <div className="pover">
        {print.worldName ? <div className="pworld">{print.worldName}</div> : null}
        <div className="pnote">{print.note || "（ノートなし）"}</div>
        <div className="pdate">{fmtDate(print.createdAt)}</div>
      </div>
      {deleting ? (
        <span className="pcard-spin" aria-hidden="true">
          <span className="spinner" />
        </span>
      ) : null}
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={selected}
        style={{ padding: 0, font: "inherit", textAlign: "left", cursor: "pointer" }}
        onClick={onToggle}
      >
        {thumb}
        <span className={selected ? "pcheck on" : "pcheck"} aria-hidden="true">
          ✓
        </span>
      </button>
    );
  }

  return (
    <div className={className}>
      {thumb}
      {onDelete ? (
        <button
          type="button"
          className="del"
          aria-label="削除"
          disabled={deleting}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      ) : null}
    </div>
  );
}
