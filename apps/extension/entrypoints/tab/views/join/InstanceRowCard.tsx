import { useCallback, useEffect, useState } from "react";
import { instanceStore, useInstanceEntries } from "../../instanceStore";
import { statusDotClass } from "../../status";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import { errorMessage } from "../errorMessage";
import type { InstanceRow } from "./instances";
import { toInstanceRowViewModel } from "./instances";

type InviteStatus = "idle" | "busy" | "success" | "error";

// One instance's judgment row: access-type badge, region, live occupancy,
// friend chips, and exactly one self-invite JOIN button for this instance.
// Shared by WorldCard (JOIN先 list) and WorldModal (world detail) so the
// self-invite affordance is instance-scoped everywhere it appears, never
// per-user.
export function InstanceRowCard({
  row,
  onOpenMember,
}: {
  row: InstanceRow;
  // Omitted in contexts with no CardModal to open (e.g. WorldModal's own
  // instance section): chips render as plain (non-interactive) labels then,
  // instead of a button that would do nothing on click.
  onOpenMember?: (userId: string) => void;
}) {
  const client = useVrc();
  const instanceOf = useInstanceEntries();
  const [invite, setInvite] = useState<{ status: InviteStatus; message: string }>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    instanceStore.request(client, row.location);
  }, [client, row.location]);

  const vm = toInstanceRowViewModel(row, instanceOf(row.location));

  const sendInvite = useCallback(() => {
    setInvite({ status: "busy", message: "" });
    client.invite
      .myselfTo(row.location)
      .then(() => {
        setInvite({ status: "success", message: "招待を送りました（ゲーム内で受信）" });
      })
      .catch((e: unknown) => {
        setInvite({ status: "error", message: `送信に失敗しました: ${errorMessage(e)}` });
      });
  }, [client, row.location]);

  const disabledReason = vm.joinDisabledReason;
  const joinDisabled = invite.status === "busy" || disabledReason !== null;

  return (
    <li className="instrow">
      <div className="instrow-info">
        <div className="instrow-tags">
          {vm.access ? (
            <span className={`instrow-badge instrow-badge--${vm.access.kind}`}>
              {vm.access.label}
            </span>
          ) : null}
          {vm.access ? <span className="instrow-region">{vm.access.regionLabel}</span> : null}
          <span className="instrow-occ">{vm.occupancyLabel ?? `${row.members.length}人以上`}</span>
        </div>
        <div className="instrow-chips">
          {row.members.map((p) =>
            onOpenMember ? (
              <button
                key={p.userId}
                type="button"
                className="jchip"
                onClick={() => onOpenMember(p.userId)}
              >
                <span
                  className="jchip-avatar"
                  style={p.imageUrl ? { backgroundImage: cssUrl(p.imageUrl) } : undefined}
                >
                  <span className={`fdot jchip-dot ${statusDotClass(p.status)}`} />
                </span>
                <span>{p.displayName || "（名前なし）"}</span>
              </button>
            ) : (
              <span key={p.userId} className="jchip jchip-static">
                <span
                  className="jchip-avatar"
                  style={p.imageUrl ? { backgroundImage: cssUrl(p.imageUrl) } : undefined}
                >
                  <span className={`fdot jchip-dot ${statusDotClass(p.status)}`} />
                </span>
                <span>{p.displayName || "（名前なし）"}</span>
              </span>
            ),
          )}
        </div>
      </div>
      <div className="instrow-invite">
        <button
          type="button"
          className="aactbtn instrow-join"
          disabled={joinDisabled}
          title={disabledReason ?? undefined}
          onClick={sendInvite}
        >
          {invite.status === "busy" ? "送信中…" : "JOIN"}
        </button>
        {disabledReason && invite.status === "idle" ? (
          <span className="instrow-reason">{disabledReason}</span>
        ) : null}
        {invite.message ? (
          <span className={invite.status === "error" ? "world-invite-err" : "world-invite-ok"}>
            {invite.message}
          </span>
        ) : null}
      </div>
    </li>
  );
}
