import { VrcError } from "@vrc-toolkit/core";
import { type AvatarSummary, fmtAvatar, fmtDate } from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { LastUpdated } from "../../components/LastUpdated";
import { type ViewMode, ViewToggle } from "../../components/ViewToggle";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";

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

export function AvatarsGrid() {
  const client = useVrc();
  const [avatars, setAvatars] = useState<AvatarSummary[]>([]);
  const [message, setMessage] = useState("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

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
        setLastUpdate(new Date());
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
          <LastUpdated at={lastUpdate} />
          <ViewToggle mode={viewMode} onChange={setViewMode} />
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
                    ? { backgroundImage: cssUrl(avatar.thumbnailImageUrl) }
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
