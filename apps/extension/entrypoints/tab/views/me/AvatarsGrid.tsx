import { VrcError } from "@vrc-toolkit/core";
import { type AvatarSummary, fmtAvatar, fmtDate } from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { LastUpdated } from "../../components/LastUpdated";
import { type ViewMode, ViewToggle } from "../../components/ViewToggle";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import { AvatarImageModal } from "./AvatarImageModal";

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

// Platform values as reported by unityPackages[].platform; unrecognized values
// render verbatim rather than being hidden, since VRChat may add new targets.
const PLATFORM_LABELS: Record<string, string> = {
  standalonewindows: "PC",
  android: "Android",
  ios: "iOS",
};

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function AvatarsGrid() {
  const client = useVrc();
  const [avatars, setAvatars] = useState<AvatarSummary[]>([]);
  const [message, setMessage] = useState("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [imageModalAvatarId, setImageModalAvatarId] = useState<string | null>(null);

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

  // Determine "worn" status just-in-time from GET /auth/user rather than
  // caching it, since the account context does not expose currentAvatar and a
  // stale cache could mislabel the confirm dialog. Best-effort: an unreadable
  // response must not block deletion, just skip the warning line.
  async function handleDelete(avatar: AvatarSummary) {
    let warning = "";
    try {
      const user = await client.auth.currentUser();
      if (user?.currentAvatar === avatar.id) warning = "着用中のアバターです。\n";
    } catch {
      // Best-effort only; see comment above.
    }
    const question = `${warning}このアバターを削除します。元に戻せません。よろしいですか？\n${avatar.name || avatar.id}`;
    if (!window.confirm(question)) return;
    setBusyId(avatar.id);
    try {
      await client.avatars.delete(avatar.id);
      setAvatars((prev) => prev.filter((a) => a.id !== avatar.id));
    } catch (err) {
      window.alert(describeError(err));
    } finally {
      setBusyId(null);
    }
  }

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
          {avatars.map((avatar) => {
            const busy = busyId === avatar.id;
            return (
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
                  {avatar.platforms.length > 0 && (
                    <div className="aplats">
                      {avatar.platforms.map((p) => (
                        <span className="aplat" key={p.platform}>
                          {platformLabel(p.platform)}
                          {p.performanceRating ? ` · ${p.performanceRating}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {avatar.description && <div className="adesc">{avatar.description}</div>}
                  <div className="ameta">
                    {avatar.version != null && <span className="aver">v{avatar.version}</span>}
                    <span className="adate">{fmtDate(avatar.updatedAt)}</span>
                  </div>
                  {/* Always visible (not hover-only) so touch devices can discover
                      these affordances, matching the print gallery's .meta convention. */}
                  <div className="aactions">
                    <button
                      type="button"
                      className="aactbtn"
                      disabled={busy}
                      onClick={() => setImageModalAvatarId(avatar.id)}
                    >
                      画像を変更
                    </button>
                    <button
                      type="button"
                      className="aactbtn danger"
                      disabled={busy}
                      onClick={() => handleDelete(avatar)}
                    >
                      {busy ? "削除中…" : "削除"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {imageModalAvatarId ? (
        <AvatarImageModal
          avatarId={imageModalAvatarId}
          onClose={() => setImageModalAvatarId(null)}
          onUpdated={() => {
            setImageModalAvatarId(null);
            load();
          }}
        />
      ) : null}
    </section>
  );
}
