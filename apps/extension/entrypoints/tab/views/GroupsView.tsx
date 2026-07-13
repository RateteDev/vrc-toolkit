import type { VRChatUserGroup } from "@vrc-toolkit/core";
import {
  fmtGroupInstance,
  fmtUserGroup,
  type GroupInstanceView,
  instancesForGroup,
  sortGroups,
} from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "../account";
import { Icon } from "../components/Icon";
import { LastUpdated } from "../components/LastUpdated";
import { useVrc } from "../vrc";
import { errorMessage } from "./errorMessage";
import { GroupCard } from "./groups/GroupCard";
import { GroupModal } from "./groups/GroupModal";

// The account owner's groups plus the group instances they are currently in.
// Fetched once on mount and on manual 更新 (no polling); a group's posts load
// on demand when its detail modal opens.
export function GroupsView() {
  const client = useVrc();
  const { account } = useAccount();
  const me = account?.id ?? "";
  const [raw, setRaw] = useState<VRChatUserGroup[]>([]);
  const [instances, setInstances] = useState<GroupInstanceView[]>([]);
  const [message, setMessage] = useState("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!me) {
      setMessage("アカウント情報を取得できません。");
      return;
    }
    setMessage("読み込み中…");
    Promise.all([client.groups.userGroups(me), client.groups.userGroupInstances(me)])
      .then(([groups, instResp]) => {
        setRaw(groups);
        setInstances((instResp?.instances ?? []).map(fmtGroupInstance));
        setMessage(groups.length === 0 ? "所属グループはありません。" : "");
        setLastUpdate(new Date());
      })
      .catch((err: unknown) => setMessage(`ネットワークエラー: ${errorMessage(err)}`));
  }, [client, me]);

  useEffect(() => {
    load();
  }, [load]);

  const summaries = useMemo(() => sortGroups(raw.map(fmtUserGroup)), [raw]);
  const openRaw = useMemo(
    () => (openId ? (raw.find((g) => (g.groupId || g.id) === openId) ?? null) : null),
    [openId, raw],
  );
  const openInstances = useMemo(
    () => (openId ? instancesForGroup(openId, instances) : []),
    [openId, instances],
  );

  return (
    <section id="view-groups">
      <section className="card">
        <div className="mhead">
          <LastUpdated at={lastUpdate} />
          <button type="button" className="refresh" aria-label="更新" title="更新" onClick={load}>
            <Icon name="refresh" size={16} />
          </button>
        </div>
        {message ? <p className="mstatus">{message}</p> : null}

        <div className="agrid">
          {summaries.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              openInstances={instancesForGroup(group.id, instances)}
              onOpen={() => setOpenId(group.id)}
            />
          ))}
        </div>
      </section>

      <GroupModal group={openRaw} instances={openInstances} onClose={() => setOpenId(null)} />
    </section>
  );
}
