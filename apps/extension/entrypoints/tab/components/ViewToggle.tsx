import { Icon } from "./Icon";

// Shared view-mode toggle (list / card), used by the friends, avatars, prints,
// and stickers views.

export type ViewMode = "list" | "card";

const MODES: { mode: ViewMode; label: string; icon: string }[] = [
  { mode: "list", label: "リスト表示", icon: "list" },
  { mode: "card", label: "カード表示", icon: "layout-grid" },
];

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="view-toggle">
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          className={mode === m.mode ? "vtog active" : "vtog"}
          aria-label={m.label}
          title={m.label}
          onClick={() => onChange(m.mode)}
        >
          <Icon name={m.icon} size={15} />
        </button>
      ))}
    </div>
  );
}
