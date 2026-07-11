// Shared view-mode toggle (list / card), used by the friends, avatars, and
// prints views. Icons live here since this is now their only consumer group.

export type ViewMode = "list" | "card";

function ViewListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M1 3h12M1 7h12M1 11h12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function ViewCardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x={1} y={1} width={5} height={5} rx={1} fill="currentColor" />
      <rect x={8} y={1} width={5} height={5} rx={1} fill="currentColor" />
      <rect x={1} y={8} width={5} height={5} rx={1} fill="currentColor" />
      <rect x={8} y={8} width={5} height={5} rx={1} fill="currentColor" />
    </svg>
  );
}

const MODES: { mode: ViewMode; label: string; icon: typeof ViewListIcon }[] = [
  { mode: "list", label: "リスト表示", icon: ViewListIcon },
  { mode: "card", label: "カード表示", icon: ViewCardIcon },
];

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="view-toggle">
      {MODES.map(({ mode: m, label, icon: Icon }) => (
        <button
          key={m}
          type="button"
          className={mode === m ? "vtog active" : "vtog"}
          aria-label={label}
          onClick={() => onChange(m)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
