import type { FavoriteAvatarSummary } from "@vrc-toolkit/core/domain";
import { cssUrl } from "../cssUrl";
import { ReleaseBadge, WornBadge } from "./avatarBadges";

// The thumbnail-forward card grid for one favorite-avatar-group section.
// Reuses AvatarsGrid's .agrid/.acard classes so owned and favorite avatars
// read as one system (mirrors WorldCards for the worlds tab).
export function FavoriteAvatarCards({
  avatars,
  currentAvatarId,
  busyId,
  onSwitch,
}: {
  avatars: FavoriteAvatarSummary[];
  currentAvatarId: string | null;
  busyId: string | null;
  onSwitch: (avatar: FavoriteAvatarSummary) => void;
}) {
  if (avatars.length === 0) {
    return <p className="mstatus">このグループにお気に入りアバターはありません。</p>;
  }
  return (
    <div className="agrid">
      {avatars.map((avatar) => {
        const worn = currentAvatarId === avatar.id;
        const busy = busyId === avatar.id;
        return (
          <div className="acard" key={avatar.favoriteId || avatar.id}>
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
              {avatar.authorName && <div className="adesc">{avatar.authorName}</div>}
              <div className="aactions">
                <button
                  type="button"
                  className="aactbtn"
                  disabled={busy || worn}
                  onClick={() => onSwitch(avatar)}
                >
                  {busy ? "着替え中…" : worn ? "着用中" : "着替える"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
