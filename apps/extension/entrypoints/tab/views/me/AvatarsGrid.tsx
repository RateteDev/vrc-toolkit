import type { VRChatAvatar } from "@vrc-toolkit/core";
import { VrcError } from "@vrc-toolkit/core";
import {
  type AvatarFavoriteGroup,
  type AvatarSummary,
  avatarFavoriteGroups,
  fmtAvatar,
  fmtDate,
} from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { LastUpdated } from "../../components/LastUpdated";
import { type ViewMode, ViewToggle } from "../../components/ViewToggle";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import { AvatarImageModal } from "./AvatarImageModal";
import { ReleaseBadge, WornBadge } from "./avatarBadges";
import { FavoriteAvatarSection } from "./FavoriteAvatarSection";
import { groupAvatarFavorites } from "./groupAvatarFavorites";

function describeError(err: unknown): string {
  if (err instanceof VrcError) {
    return err.message || `読み込みに失敗しました（HTTP ${err.status}）`;
  }
  return `ネットワークエラー: ${err instanceof Error ? err.message : String(err)}`;
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
  const [favoriteAvatars, setFavoriteAvatars] = useState<VRChatAvatar[]>([]);
  const [favoriteGroups, setFavoriteGroups] = useState<AvatarFavoriteGroup[]>([]);
  const [currentAvatarId, setCurrentAvatarId] = useState<string | null>(null);
  const [message, setMessage] = useState("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [imageModalAvatarId, setImageModalAvatarId] = useState<string | null>(null);

  // One request per load: listAll/favorites each page their endpoint to
  // exhaustion internally, but the four calls together are still a single
  // user-initiated action (mount or manual 更新), matching WorldsView's model.
  const load = useCallback(() => {
    setMessage("読み込み中…");
    Promise.all([
      client.avatars.listAll({ user: "me", releaseStatus: "all" }),
      client.avatars.favorites(),
      client.worlds.favoriteGroups(),
      client.auth.currentUser(),
    ])
      .then(([raw, favRaw, groups, user]) => {
        const list = raw.map(fmtAvatar);
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setAvatars(list);
        setFavoriteAvatars(favRaw);
        setFavoriteGroups(avatarFavoriteGroups(groups));
        setCurrentAvatarId(user?.currentAvatar ?? null);
        setMessage(list.length === 0 ? "アバターがありません。" : "");
        setLastUpdate(new Date());
      })
      .catch((err) => setMessage(describeError(err)));
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(avatar: AvatarSummary) {
    const warning = currentAvatarId === avatar.id ? "着用中のアバターです。\n" : "";
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

  // Switching is a single explicit-click write (confirm -> busy guard -> PUT
  // .../select), per the unofficial-API policy against automated/high-frequency
  // writes. The worn indicator updates from the response instead of a reload.
  async function handleSwitch(avatarId: string, name: string) {
    if (busyId || currentAvatarId === avatarId) return;
    if (!window.confirm(`「${name || avatarId}」に着替えますか？`)) return;
    setBusyId(avatarId);
    try {
      const user = await client.avatars.select(avatarId);
      setCurrentAvatarId(user?.currentAvatar ?? avatarId);
    } catch (err) {
      window.alert(describeError(err));
    } finally {
      setBusyId(null);
    }
  }

  const favoriteSections = groupAvatarFavorites(favoriteAvatars, favoriteGroups);

  return (
    <section id="view-avatars">
      <section className="card">
        <div className="mhead">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <LastUpdated at={lastUpdate} />
          <button type="button" className="refresh" aria-label="更新" title="更新" onClick={load}>
            <Icon name="refresh" size={16} />
          </button>
        </div>
        {message && <p className="mstatus">{message}</p>}

        <section className="wsec">
          <h3 className="wsec-title">自分のアバター ({avatars.length})</h3>
          <div className={`agrid view-${viewMode}`}>
            {avatars.map((avatar) => {
              const worn = currentAvatarId === avatar.id;
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
                    {worn ? <WornBadge /> : null}
                    <ReleaseBadge releaseStatus={avatar.releaseStatus} />
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
                        disabled={busy || worn}
                        onClick={() => handleSwitch(avatar.id, avatar.name)}
                      >
                        {busy ? "着替え中…" : worn ? "着用中" : "着替える"}
                      </button>
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

        <section className="wsec">
          <h3 className="wsec-title">お気に入り ({favoriteAvatars.length})</h3>
          {favoriteSections.length === 0 ? (
            <p className="mstatus">お気に入りアバターはありません。</p>
          ) : (
            favoriteSections.map((section) => (
              <FavoriteAvatarSection
                key={section.key}
                displayName={section.displayName}
                avatars={section.avatars}
                currentAvatarId={currentAvatarId}
                busyId={busyId}
                onSwitch={(avatar) => handleSwitch(avatar.id, avatar.name)}
              />
            ))
          )}
        </section>
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
