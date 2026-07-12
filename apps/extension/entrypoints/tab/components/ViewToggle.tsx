import { Icon } from "./Icon";

// Shared view-mode toggle. Defaults to the common list/card pair; views with
// a different density set (e.g. stickers' list/sm/lg) pass their own options.

export type ViewMode = "list" | "card";

export interface ViewModeOption<M extends string> {
  mode: M;
  label: string;
  icon: string;
}

const DEFAULT_MODES: ViewModeOption<ViewMode>[] = [
  { mode: "list", label: "リスト表示", icon: "list" },
  { mode: "card", label: "カード表示", icon: "layout-grid" },
];

interface Props<M extends string> {
  mode: M;
  onChange: (mode: M) => void;
  modes?: ViewModeOption<M>[];
}

export function ViewToggle<M extends string = ViewMode>({ mode, onChange, modes }: Props<M>) {
  // The cast is sound in practice: callers omit `modes` only where M is the
  // default ViewMode.
  const options = (modes ?? DEFAULT_MODES) as ViewModeOption<M>[];
  return (
    <div className="view-toggle">
      {options.map((o) => (
        <button
          key={o.mode}
          type="button"
          className={mode === o.mode ? "vtog active" : "vtog"}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.mode)}
        >
          <Icon name={o.icon} size={14} />
        </button>
      ))}
    </div>
  );
}
