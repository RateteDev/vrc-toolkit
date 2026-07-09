import { fmtDate, type PrintSummary } from "@vrc-toolkit/core/domain";
import { cssUrl } from "../cssUrl";
import { TrashIcon } from "./icons";

interface Props {
  print: PrintSummary;
  // Delete is user-initiated only: omitting onDelete renders a plain,
  // non-deletable card (used for the retention preview grid).
  onDelete?: () => void;
  deleting?: boolean;
}

export function PrintCard({ print, onDelete, deleting }: Props) {
  return (
    <div className={deleting ? "pcard removing" : "pcard"}>
      <div
        className="pthumb"
        style={print.imageUrl ? { backgroundImage: cssUrl(print.imageUrl) } : undefined}
      />
      <div className="pover">
        {print.worldName ? <div className="pworld">{print.worldName}</div> : null}
        <div className="pnote">{print.note || "（ノートなし）"}</div>
        <div className="pdate">{fmtDate(print.createdAt)}</div>
      </div>
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
