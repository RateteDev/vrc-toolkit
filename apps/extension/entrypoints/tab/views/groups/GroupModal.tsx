import type { VRChatUserGroup } from "@vrc-toolkit/core";
import { fmtUserGroup, type GroupInstanceView } from "@vrc-toolkit/core/domain";
import { Modal } from "../../components/Modal";
import { cssUrl } from "../cssUrl";
import { GroupInstanceRow } from "./GroupInstanceRow";
import { GroupPosts } from "./GroupPosts";

// Group detail: banner + icon/name/description header, the group's ongoing
// instances (each with a self-invite JOIN button), and its post feed. A null
// group closes the modal (mirrors the other detail modals' contract).
export function GroupModal({
  group,
  instances,
  onClose,
}: {
  group: VRChatUserGroup | null;
  instances: GroupInstanceView[];
  onClose: () => void;
}) {
  if (!group) return null;

  const summary = fmtUserGroup(group);
  const banner = group.bannerUrl || null;
  const description = group.description || "";

  return (
    <Modal ariaLabel="グループ詳細" sheetClass="group-sheet" onRequestClose={onClose}>
      <div
        className="group-hero"
        style={banner ? { backgroundImage: cssUrl(banner) } : undefined}
      />

      <div className="group-headrow">
        <div
          className="group-icon"
          style={summary.iconUrl ? { backgroundImage: cssUrl(summary.iconUrl) } : undefined}
        />
        <div className="group-headtext">
          <h2 className="group-name">{summary.name || "（名前なし）"}</h2>
          <p className="group-sub">
            {summary.tag ? <span>{summary.tag}</span> : null}
            {summary.memberCount !== null ? <span>{summary.memberCount}人</span> : null}
          </p>
        </div>
      </div>

      {description ? <p className="group-desc">{description}</p> : null}

      {instances.length > 0 ? (
        <>
          <h3 className="group-sectiontitle">開催中インスタンス</h3>
          <ul className="instrows">
            {instances.map((inst) => (
              <GroupInstanceRow key={inst.location} instance={inst} />
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="group-sectiontitle">投稿</h3>
      <GroupPosts groupId={summary.id} />
    </Modal>
  );
}
