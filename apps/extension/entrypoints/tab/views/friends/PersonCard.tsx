import { isJoinable, parseLocation } from "@vrc-toolkit/core/domain";
import { statusDotClass } from "../../status";
import { cssUrl } from "../cssUrl";
import type { Person } from "./people";

export function PersonCard({
  person,
  worldName,
  onOpen,
}: {
  person: Person;
  // Resolved world name for an instance location, or undefined while unresolved.
  worldName?: string;
  onOpen: (userId: string) => void;
}) {
  const parsed = parseLocation(person.location);
  const joinable = person.isOnline && isJoinable(parsed);

  // World line. Per design, an unresolved instance world shows NOTHING rather
  // than a placeholder — only definite states get text.
  let worldText = "";
  if (!person.isOnline) {
    worldText = "オフライン";
  } else if (parsed.kind === "instance") {
    worldText = worldName ?? "";
  } else if (parsed.kind === "private") {
    worldText = "プライベート";
  } else if (parsed.kind === "traveling") {
    worldText = "移動中";
  }

  const statusText = person.isOnline ? person.statusDescription : "";

  return (
    // A native button, not a div+role: .fcard supplies border/background/layout,
    // so only the browser's default button chrome needs neutralizing inline.
    <button
      type="button"
      className="fcard"
      style={{ padding: 0, font: "inherit", textAlign: "left" }}
      onClick={() => onOpen(person.userId)}
    >
      <div
        className="favatar"
        style={person.imageUrl ? { backgroundImage: cssUrl(person.imageUrl) } : undefined}
      />
      <div className="fbody">
        <div className="fname">
          <span className={`fdot ${person.isOnline ? statusDotClass(person.status) : "offline"}`} />
          <span>{person.displayName || "（名前なし）"}</span>
        </div>
        {statusText ? <div className="fstatus">{statusText}</div> : null}
        {worldText ? <div className="fworld">{worldText}</div> : null}
        {joinable ? <div className="fjoin">参加可能</div> : null}
        {person.note ? <div className="fnote">{person.note}</div> : null}
      </div>
    </button>
  );
}
