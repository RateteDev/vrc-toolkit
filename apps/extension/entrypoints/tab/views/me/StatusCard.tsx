import { VrcError } from "@vrc-toolkit/core";
import { parseLocation, type VrcStatus, validateStatus } from "@vrc-toolkit/core/domain";
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useState } from "react";
import { useVrc } from "../../vrc";

const STATUS_CARDS: Array<{ value: VrcStatus; dotClass: string; label: string }> = [
  { value: "join me", dotClass: "joinme", label: "join me" },
  { value: "active", dotClass: "active", label: "active" },
  { value: "ask me", dotClass: "askme", label: "ask me" },
  { value: "busy", dotClass: "busy", label: "busy" },
  { value: "offline", dotClass: "offline", label: "offline" },
];

const STATUS_PRESETS = ["作業中", "まったり", "通話中", "寝落ち", "AFK"];

// Display copy per parsed location kind. 'offline' here is the location sentinel
// string itself, distinct from the presence status of the same name.
const LOCATION_LABELS: Record<ReturnType<typeof parseLocation>["kind"], string> = {
  instance: "ワールドに滞在中",
  private: "プライベート",
  traveling: "移動中",
  offline: "オフライン",
};

function describeError(err: unknown): string {
  if (err instanceof VrcError) {
    return err.message || `読み込みに失敗しました（HTTP ${err.status}）`;
  }
  return `ネットワークエラー: ${err instanceof Error ? err.message : String(err)}`;
}

export function StatusCard() {
  const client = useVrc();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<VrcStatus | "">("");
  const [statusText, setStatusText] = useState("");
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [message, setMessage] = useState("読み込み中…");
  const [applying, setApplying] = useState(false);

  // One request per load: GET /auth/user carries status, statusDescription, location,
  // and the id status.update needs — no separate lookup required.
  const load = useCallback(() => {
    setMessage("読み込み中…");
    setLocationLabel(null);
    client.auth
      .currentUser()
      .then((raw) => {
        const user = raw;
        if (!user?.id) {
          setMessage("読み込みに失敗しました。");
          return;
        }
        setUserId(user.id);
        setSelectedStatus((user.status as VrcStatus | undefined) || "");
        setStatusText(user.statusDescription || "");
        if (user.location) {
          setLocationLabel(`現在地: ${LOCATION_LABELS[parseLocation(user.location).kind]}`);
        }
        setMessage("");
      })
      .catch((err) => setMessage(describeError(err)));
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let update: { status: VrcStatus; statusDescription: string };
    try {
      update = validateStatus({ status: selectedStatus, statusDescription: statusText });
    } catch {
      setMessage("ステータスを選択してください。");
      return;
    }
    if (!userId) {
      setMessage("読み込みに失敗しました。");
      return;
    }
    setApplying(true);
    setMessage("適用中…");
    client.status
      .update(userId, update)
      .then(() => setMessage("適用しました。"))
      .catch((err) => setMessage(describeError(err)))
      .finally(() => setApplying(false));
  };

  const selectCard = (value: VrcStatus) => setSelectedStatus(value);
  const handleCardKeyDown = (value: VrcStatus) => (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    selectCard(value);
  };

  return (
    <section id="view-status">
      <section className="card">
        <div className="mhead">
          <h2>ステータス切替</h2>
          <button type="button" className="refresh" onClick={load}>
            更新
          </button>
        </div>
        <p className="hint">ステータスとひとこと文を手動で切り替えます。</p>
        {message && <p className="mstatus">{message}</p>}
        {locationLabel && <p className="slocation">{locationLabel}</p>}
        <form onSubmit={submit} noValidate>
          <div className="scards">
            {STATUS_CARDS.map((card) => (
              // biome-ignore lint/a11y/useSemanticElements: div required — .scard (styles.css) sets no font/color, so a <button> would render in the UA button font/color instead of inheriting from body.
              <div
                key={card.value}
                className={card.value === selectedStatus ? "scard selected" : "scard"}
                role="button"
                tabIndex={0}
                onClick={() => selectCard(card.value)}
                onKeyDown={handleCardKeyDown(card.value)}
              >
                <span className={`sdot ${card.dotClass}`} /> {card.label}
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="sdesc">ステータス文</label>
            <input
              id="sdesc"
              type="text"
              placeholder="表示するひとこと"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
            />
            <div className="spresets">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="preset"
                  onClick={() => setStatusText(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <button className="submit" type="submit" disabled={applying}>
            適用
          </button>
        </form>
      </section>
    </section>
  );
}
