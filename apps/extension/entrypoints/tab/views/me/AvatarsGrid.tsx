import { VrcError } from "@vrc-toolkit/core";
import { type AvatarSummary, fmtAvatar, fmtDate } from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { useVrc } from "../../vrc";

type ViewMode = "list" | "sm" | "lg";

const VIEW_MODES: Array<{ mode: ViewMode; label: string }> = [
  { mode: "list", label: "リスト表示" },
  { mode: "sm", label: "小カード表示" },
  { mode: "lg", label: "大カード表示" },
];

function describeError(err: unknown): string {
  if (err instanceof VrcError) {
    return err.message || `読み込みに失敗しました（HTTP ${err.status}）`;
  }
  return `ネットワークエラー: ${err instanceof Error ? err.message : String(err)}`;
}

// releaseStatus badge modifier class; unrecognized values render the plain badge.
function relClass(status: string): string {
  if (status === "public" || status === "private" || status === "hidden") return status;
  return "";
}

function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

export function AvatarsGrid() {
  const client = useVrc();
  const [avatars, setAvatars] = useState<AvatarSummary[]>([]);
  const [message, setMessage] = useState("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("sm");

  // One request per load: listAll pages GET /avatars?user=me&releaseStatus=all to
  // exhaustion internally, still a single user-initiated action.
  const load = useCallback(() => {
    setMessage("読み込み中…");
    client.avatars
      .listAll({ user: "me", releaseStatus: "all" })
      .then((raw) => {
        const list = raw.map(fmtAvatar);
        if (list.length === 0) {
          setAvatars([]);
          setMessage("アバターがありません。");
          return;
        }
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setAvatars(list);
        setMessage("");
        const now = new Date();
        setLastUpdate(
          `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`,
        );
      })
      .catch((err) => setMessage(describeError(err)));
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section id="view-avatars">
      <section className="card">
        <div className="mhead">
          <h2>マイアバター</h2>
          {lastUpdate && <span className="flast-update">最終更新: {lastUpdate}</span>}
          <div className="view-toggle">
            {VIEW_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                className={mode === viewMode ? "vtog active" : "vtog"}
                aria-label={label}
                onClick={() => setViewMode(mode)}
              >
                <ViewModeIcon mode={mode} />
              </button>
            ))}
          </div>
          <button type="button" className="refresh" onClick={load}>
            更新
          </button>
        </div>
        <p className="hint">所有するアバターを更新日順に一覧します（private / hidden を含む）。</p>
        {message && <p className="mstatus">{message}</p>}
        <div className={`agrid view-${viewMode}`}>
          {avatars.map((avatar) => (
            <div className="acard" key={avatar.id}>
              <div
                className="athumb"
                style={
                  avatar.thumbnailImageUrl
                    ? { backgroundImage: `url("${avatar.thumbnailImageUrl}")` }
                    : undefined
                }
              >
                {avatar.releaseStatus && (
                  <span className={`arel ${relClass(avatar.releaseStatus)}`}>
                    {avatar.releaseStatus}
                  </span>
                )}
              </div>
              <div className="abody">
                <div className="aname">{avatar.name || "（名前なし）"}</div>
                <div className="adate">{fmtDate(avatar.updatedAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ViewModeIcon({ mode }: { mode: ViewMode }) {
  if (mode === "list") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M1 3h12M1 7h12M1 11h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  if (mode === "lg") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="1" y="1" width="12" height="5" rx="1" fill="currentColor" />
        <rect x="1" y="8" width="12" height="5" rx="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}
