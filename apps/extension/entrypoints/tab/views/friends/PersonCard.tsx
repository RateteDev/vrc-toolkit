import { isJoinable, parseLocation } from "@vrc-toolkit/core/domain";
import type { Person } from "./people";

// Presence dot color, keyed off VRChat's status string (ported verbatim from
// the Worker UI's statusClass).
function statusClass(status: string): string {
  if (status === "join me") return "joinme";
  if (status === "active") return "active";
  if (status === "ask me") return "askme";
  if (status === "busy") return "busy";
  return "offline";
}

export function PersonCard({
  person,
  onOpen,
}: {
  person: Person;
  onOpen: (userId: string) => void;
}) {
  const parsed = parseLocation(person.location);
  const joinable = person.isOnline && isJoinable(parsed);

  let worldText: string;
  if (!person.isOnline) {
    worldText = "オフライン";
  } else if (parsed.kind === "instance") {
    worldText = person.worldName || "ワールドに滞在中";
  } else if (parsed.kind === "private") {
    worldText = "プライベート";
  } else if (parsed.kind === "traveling") {
    worldText = "移動中";
  } else {
    worldText = person.statusDescription || "";
  }

  return (
    // A native button, not a div+role="button": .fcard already supplies the
    // border/background/layout, so only the browser's default button chrome
    // (padding/font/alignment) needs neutralizing inline.
    <button
      type="button"
      className="fcard"
      style={{ padding: 0, font: "inherit", textAlign: "left" }}
      onClick={() => onOpen(person.userId)}
    >
      <div
        className="favatar"
        style={person.imageUrl ? { backgroundImage: `url("${person.imageUrl}")` } : undefined}
      />
      <div className="fbody">
        <div className="fname">
          <span className={`fdot ${person.isOnline ? statusClass(person.status) : "offline"}`} />
          <span>{person.displayName || "（名前なし）"}</span>
        </div>
        <div className="fworld">{worldText}</div>
        {joinable && <div className="fjoin">参加可能</div>}
        {person.note && <div className="fnote">{person.note}</div>}
      </div>
    </button>
  );
}
