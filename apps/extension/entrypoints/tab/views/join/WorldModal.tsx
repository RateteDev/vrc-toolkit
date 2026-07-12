import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, XIcon } from "../../components/icons";
import { Modal } from "../../components/Modal";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import type { Person } from "../friends/people";
import { InstanceRowCard } from "./InstanceRowCard";
import { groupMembersByInstance } from "./instances";

type Phase = "idle" | "loading" | "loaded" | "error";
type CopyState = "idle" | "copied" | "failed";

interface WorldDetail {
  name: string;
  description: string;
  authorName: string;
  capacity: number | null;
  favorites: number | null;
}

// Ported from the Worker UI's world detail lookup, narrowed to the fields this
// modal displays. A missing field renders as an empty string / null rather
// than a hardcoded fallback, since the raw API is undocumented and may omit it.
function toWorldDetail(w: {
  name?: string;
  description?: string;
  authorName?: string;
  capacity?: number;
  favorites?: number;
}): WorldDetail {
  return {
    name: w.name ?? "",
    description: w.description ?? "",
    authorName: w.authorName ?? "",
    capacity: typeof w.capacity === "number" ? w.capacity : null,
    favorites: typeof w.favorites === "number" ? w.favorites : null,
  };
}

export function WorldModal({
  worldId,
  worldName,
  thumbnailUrl,
  members,
  onClose,
}: {
  // Null closes the modal (mirrors CardModal's userId contract).
  worldId: string | null;
  // Cached name/thumbnail, shown immediately while the detail fetch is in flight.
  worldName: string | null;
  thumbnailUrl: string | null;
  members: Person[];
  onClose: () => void;
}) {
  const client = useVrc();
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<WorldDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Guards a stale GET /worlds/{id} response from landing after the modal
  // switched to a different world (same rationale as CardModal's loadSeqRef).
  const loadSeqRef = useRef(0);
  // Resets the copy icon back to idle a moment after a copy/failure, so the
  // feedback reads as transient rather than a permanent state change.
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (worldId === null) return;
    const seq = ++loadSeqRef.current;
    setPhase("loading");
    setErrorMessage("");
    setDetail(null);
    setCopyState("idle");
    client.worlds
      .get(worldId)
      .then((w) => {
        if (seq !== loadSeqRef.current) return;
        if (!w) {
          setPhase("error");
          setErrorMessage("ワールド情報の取得に失敗しました");
          return;
        }
        setDetail(toWorldDetail(w));
        setPhase("loaded");
      })
      .catch((e: unknown) => {
        if (seq !== loadSeqRef.current) return;
        setPhase("error");
        setErrorMessage(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
      });
  }, [client, worldId]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const copyWorldId = useCallback(() => {
    if (worldId === null) return;
    // Clipboard access can be denied in the extension context; surface that on
    // the button instead of leaving an unhandled rejection.
    navigator.clipboard.writeText(worldId).then(
      () => setCopyState("copied"),
      () => setCopyState("failed"),
    );
  }, [worldId]);

  useEffect(() => {
    if (copyState === "idle") return;
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopyState("idle"), 1800);
  }, [copyState]);

  if (worldId === null) return null;

  const displayName = detail?.name || worldName || "読み込み中…";
  const instanceRows = groupMembersByInstance(members);

  return (
    <Modal ariaLabel="ワールド詳細" sheetClass="world-sheet" onRequestClose={onClose}>
      <div
        className="world-hero"
        style={thumbnailUrl ? { backgroundImage: cssUrl(thumbnailUrl) } : undefined}
      />

      <div className="world-titlerow">
        <h2 className="world-name">{displayName}</h2>
        <button
          type="button"
          className="world-copy"
          onClick={copyWorldId}
          aria-label="ワールドIDをコピー"
        >
          {copyState === "copied" ? (
            <CheckIcon />
          ) : copyState === "failed" ? (
            <XIcon />
          ) : (
            <CopyIcon />
          )}
        </button>
      </div>
      <p className="world-id">{worldId}</p>

      {detail ? (
        <div className="world-meta">
          {detail.authorName ? <span>作者: {detail.authorName}</span> : null}
          {detail.capacity !== null ? <span>定員: {detail.capacity}</span> : null}
          {detail.favorites !== null ? <span>★{detail.favorites}</span> : null}
        </div>
      ) : null}

      {phase === "error" ? <p className="mstatus">{errorMessage}</p> : null}
      {detail?.description ? <p className="world-desc">{detail.description}</p> : null}

      {instanceRows.length > 0 ? (
        <>
          <h3 className="world-instances-title">インスタンス</h3>
          <ul className="instrows">
            {instanceRows.map((row) => (
              // No onOpenMember here: the modal has no CardModal of its own,
              // so InstanceRowCard renders its chips as non-interactive.
              <InstanceRowCard key={row.location} row={row} />
            ))}
          </ul>
        </>
      ) : null}

      <a
        className="world-officiallink"
        href={`https://vrchat.com/home/world/${encodeURIComponent(worldId)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        公式サイトで開く ↗
      </a>
    </Modal>
  );
}
