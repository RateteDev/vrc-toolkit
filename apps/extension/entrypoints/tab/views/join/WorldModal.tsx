import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import type { Person } from "../friends/people";
import { groupMembersByInstance } from "./instances";

type Phase = "idle" | "loading" | "loaded" | "error";
type InviteStatus = "idle" | "busy" | "success" | "error";

interface WorldDetail {
  name: string;
  description: string;
  authorName: string;
  capacity: number | null;
}

// Ported from the Worker UI's world detail lookup, narrowed to the fields this
// modal displays. A missing field renders as an empty string / null rather
// than a hardcoded fallback, since the raw API is undocumented and may omit it.
function toWorldDetail(w: {
  name?: string;
  description?: string;
  authorName?: string;
  capacity?: number;
}): WorldDetail {
  return {
    name: w.name ?? "",
    description: w.description ?? "",
    authorName: w.authorName ?? "",
    capacity: typeof w.capacity === "number" ? w.capacity : null,
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
  const [idCopied, setIdCopied] = useState(false);
  const [inviteState, setInviteState] = useState<
    Record<string, { status: InviteStatus; message: string }>
  >({});

  // Guards a stale GET /worlds/{id} response from landing after the modal
  // switched to a different world (same rationale as CardModal's loadSeqRef).
  const loadSeqRef = useRef(0);

  useEffect(() => {
    if (worldId === null) return;
    const seq = ++loadSeqRef.current;
    setPhase("loading");
    setErrorMessage("");
    setDetail(null);
    setIdCopied(false);
    setInviteState({});
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

  const copyWorldId = useCallback(() => {
    if (worldId === null) return;
    void navigator.clipboard.writeText(worldId).then(() => setIdCopied(true));
  }, [worldId]);

  const sendInvite = useCallback(
    (location: string) => {
      setInviteState((s) => ({ ...s, [location]: { status: "busy", message: "" } }));
      client.invite
        .myselfTo(location)
        .then(() => {
          setInviteState((s) => ({
            ...s,
            [location]: { status: "success", message: "招待を送りました（ゲーム内で受信）" },
          }));
        })
        .catch((e: unknown) => {
          setInviteState((s) => ({
            ...s,
            [location]: {
              status: "error",
              message: `送信に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
            },
          }));
        });
    },
    [client],
  );

  if (worldId === null) return null;

  const displayName = detail?.name || worldName || "読み込み中…";
  const instanceRows = groupMembersByInstance(members);

  return (
    <Modal ariaLabel="ワールド詳細" sheetClass="world-sheet" onRequestClose={onClose}>
      <div className="world-head">
        <div
          className="world-thumb"
          style={thumbnailUrl ? { backgroundImage: cssUrl(thumbnailUrl) } : undefined}
        />
        <div className="world-headtext">
          <h2 className="world-name">{displayName}</h2>
          {detail ? (
            <div className="world-meta">
              {detail.authorName ? <span>作者: {detail.authorName}</span> : null}
              {detail.capacity !== null ? <span>定員: {detail.capacity}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {phase === "error" ? <p className="mstatus">{errorMessage}</p> : null}
      {detail?.description ? <p className="world-desc">{detail.description}</p> : null}

      <div className="world-actions">
        <a
          className="aactbtn"
          href={`https://vrchat.com/home/world/${encodeURIComponent(worldId)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          公式サイトで開く
        </a>
        <button type="button" className="aactbtn" onClick={copyWorldId}>
          {idCopied ? "コピーしました" : "ワールドIDをコピー"}
        </button>
      </div>

      <h3 className="world-instances-title">インスタンス</h3>
      <ul className="world-instances">
        {instanceRows.map((row) => {
          const state = inviteState[row.location] ?? { status: "idle" as const, message: "" };
          const names = row.members.map((m) => m.displayName || "（名前なし）").join("、");
          return (
            <li key={row.location} className="world-instance">
              <div className="world-instance-body">
                <span className="world-instance-count">{row.members.length}人</span>
                <span className="world-instance-names">{names}</span>
              </div>
              <div className="world-instance-invite">
                <button
                  type="button"
                  className="aactbtn"
                  disabled={state.status === "busy"}
                  onClick={() => sendInvite(row.location)}
                >
                  自分に招待を送る
                </button>
                {state.message ? (
                  <span
                    className={state.status === "error" ? "world-invite-err" : "world-invite-ok"}
                  >
                    {state.message}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
