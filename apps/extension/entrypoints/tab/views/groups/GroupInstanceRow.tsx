import { type GroupInstanceView, parseInstanceAccess } from "@vrc-toolkit/core/domain";
import { useCallback, useState } from "react";
import { useVrc } from "../../vrc";
import { errorMessage } from "../errorMessage";

type InviteStatus = "idle" | "busy" | "success" | "error";

// One ongoing group instance: access badge, region, occupancy, world name, and
// exactly one self-invite JOIN button — the same self-invite flow the JOIN先
// tab uses (POST /invite/myself/to/{location}).
export function GroupInstanceRow({ instance }: { instance: GroupInstanceView }) {
  const client = useVrc();
  const [invite, setInvite] = useState<{ status: InviteStatus; message: string }>({
    status: "idle",
    message: "",
  });

  const access = parseInstanceAccess(instance.location);
  const occupancy =
    instance.userCount !== null
      ? `${instance.userCount}${instance.capacity !== null ? `/${instance.capacity}` : ""}人`
      : null;

  const sendInvite = useCallback(() => {
    setInvite({ status: "busy", message: "" });
    client.invite
      .myselfTo(instance.location)
      .then(() => setInvite({ status: "success", message: "招待を送りました（ゲーム内で受信）" }))
      .catch((e: unknown) =>
        setInvite({ status: "error", message: `送信に失敗しました: ${errorMessage(e)}` }),
      );
  }, [client, instance.location]);

  return (
    <li className="instrow">
      <div className="instrow-info">
        <div className="instrow-tags">
          {access ? (
            <span className={`instrow-badge instrow-badge--${access.kind}`}>{access.label}</span>
          ) : null}
          {access ? <span className="instrow-region">{access.regionLabel}</span> : null}
          {occupancy ? <span className="instrow-occ">{occupancy}</span> : null}
        </div>
        {instance.worldName ? <div className="ginst-world">{instance.worldName}</div> : null}
      </div>
      <div className="instrow-invite">
        <button
          type="button"
          className="aactbtn instrow-join"
          disabled={invite.status === "busy"}
          onClick={sendInvite}
        >
          {invite.status === "busy" ? "送信中…" : "JOIN"}
        </button>
        {invite.message ? (
          <span className={invite.status === "error" ? "world-invite-err" : "world-invite-ok"}>
            {invite.message}
          </span>
        ) : null}
      </div>
    </li>
  );
}
