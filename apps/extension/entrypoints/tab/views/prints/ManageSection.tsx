import {
  type PrintSummary,
  type RetentionPolicy,
  selectPrintsToDelete,
  sortPrints,
  toPrintSummary,
} from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { useVrc } from "../../vrc";
import { errorMessage } from "./errorMessage";
import { ViewLargeIcon, ViewListIcon, ViewSmallIcon } from "./icons";
import { PrintCard } from "./PrintCard";

type ViewMode = "list" | "sm" | "lg";

function fmtTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

interface Props {
  // Bumped by UploadSection after a submit batch finishes, to reload the grid
  // the way the old client-script called loadPrints() after every upload.
  refreshToken: number;
}

export function ManageSection({ refreshToken }: Props) {
  const client = useVrc();
  const [prints, setPrints] = useState<PrintSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("lg");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const user = await client.auth.currentUser();
      if (!user?.id) {
        setPrints([]);
        setLoadError("ログインが必要です");
        return;
      }
      const raw = await client.prints.list(user.id, { n: 100 });
      setPrints(sortPrints(raw.map(toPrintSummary)));
      setLastUpdate(new Date());
    } catch (err) {
      setPrints([]);
      setLoadError(errorMessage(err));
    }
  }, [client]);

  useEffect(() => {
    // refreshToken has no value read here; it exists purely to force this
    // effect to re-run after each UploadSection submit batch.
    void refreshToken;
    load();
  }, [load, refreshToken]);

  async function handleDelete(p: PrintSummary) {
    if (!p.id) return;
    if (!window.confirm(`この Print を削除しますか？\n${p.note || p.id}`)) return;
    setDeletingIds((prev) => new Set(prev).add(p.id));
    try {
      await client.prints.delete(p.id);
      setPrints((prev) => (prev ? prev.filter((x) => x.id !== p.id) : prev));
    } catch (err) {
      window.alert(errorMessage(err));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }

  const loading = prints === null && !loadError;
  const empty = prints !== null && prints.length === 0 && !loadError;
  const statusText = loading
    ? "読み込み中…"
    : loadError || (empty ? "まだ Print がありません。" : null);

  return (
    <>
      <section className="card">
        <div className="mhead">
          <h2>Print 一覧</h2>
          {lastUpdate ? (
            <span className="flast-update">{`最終更新: ${fmtTime(lastUpdate)}`}</span>
          ) : null}
          <div className="view-toggle">
            <button
              type="button"
              className={viewMode === "list" ? "vtog active" : "vtog"}
              aria-label="リスト表示"
              onClick={() => setViewMode("list")}
            >
              <ViewListIcon />
            </button>
            <button
              type="button"
              className={viewMode === "sm" ? "vtog active" : "vtog"}
              aria-label="小カード表示"
              onClick={() => setViewMode("sm")}
            >
              <ViewSmallIcon />
            </button>
            <button
              type="button"
              className={viewMode === "lg" ? "vtog active" : "vtog"}
              aria-label="大カード表示"
              onClick={() => setViewMode("lg")}
            >
              <ViewLargeIcon />
            </button>
          </div>
          <button type="button" className="refresh" onClick={load}>
            更新
          </button>
        </div>
        <p className="hint">
          保存済みの Print をタイル表示します。削除ボタンで個別に削除できます。
        </p>
        {statusText ? <p className={loadError ? "mstatus err" : "mstatus"}>{statusText}</p> : null}
        <div className={`pgrid view-${viewMode}`}>
          {(prints ?? []).map((p) => (
            <PrintCard
              key={p.id}
              print={p}
              onDelete={() => handleDelete(p)}
              deleting={deletingIds.has(p.id)}
            />
          ))}
        </div>
      </section>

      <RetentionSection prints={prints} onExecuted={load} />
    </>
  );
}

interface RetentionProps {
  prints: PrintSummary[] | null;
  onExecuted: () => void;
}

// Preview and execute act on the same candidate list: whatever was previewed
// is exactly what gets deleted, so there is no surprise from the print list
// changing between the two steps.
function RetentionSection({ prints, onExecuted }: RetentionProps) {
  const client = useVrc();
  const [keepLatest, setKeepLatest] = useState("");
  const [maxAgeDays, setMaxAgeDays] = useState("");
  const [candidates, setCandidates] = useState<PrintSummary[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function readPolicy(): RetentionPolicy {
    const policy: RetentionPolicy = {};
    const keep = keepLatest.trim();
    const age = maxAgeDays.trim();
    if (keep !== "") policy.keepLatest = Number(keep);
    if (age !== "") policy.maxAgeDays = Number(age);
    return policy;
  }

  function handlePreview() {
    const policy = readPolicy();
    if (policy.keepLatest === undefined && policy.maxAgeDays === undefined) {
      setStatus("「最新 N 件」か「N 日より古い」のどちらかを入力してください。");
      setCandidates(null);
      return;
    }
    if (!prints) {
      setStatus("Print 一覧を読み込み中です。しばらく待ってから再試行してください。");
      return;
    }
    const toDelete = new Set(selectPrintsToDelete(prints, policy, new Date()));
    const selected = sortPrints(prints.filter((p) => p.id && toDelete.has(p.id)));
    setCandidates(selected);
    setStatus(selected.length ? `${selected.length} 件が削除対象です。` : "削除対象はありません。");
  }

  async function handleExecute() {
    if (!candidates?.length) return;
    if (!window.confirm(`${candidates.length} 件の Print を削除します。よろしいですか？`)) return;
    setBusy(true);
    setStatus("削除中…");
    try {
      for (const p of candidates) {
        if (p.id) await client.prints.delete(p.id);
      }
      setStatus(`${candidates.length} 件を削除しました。`);
      setCandidates(null);
      onExecuted();
    } catch (err) {
      setStatus(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="mhead">
        <h2>Print を整理</h2>
      </div>
      <p className="hint">
        件数や日数で保持ポリシーを設定し、該当する Print
        をまとめて削除します。作成日不明のものは安全のため残します。
      </p>
      <div className="rotrow">
        <label className="rotfield">
          <span>最新 N 件だけ残す</span>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="例: 50"
            value={keepLatest}
            onChange={(e) => setKeepLatest(e.target.value)}
          />
        </label>
        <label className="rotfield">
          <span>N 日より古いものを削除</span>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="例: 90"
            value={maxAgeDays}
            onChange={(e) => setMaxAgeDays(e.target.value)}
          />
        </label>
      </div>
      <div className="rotrow">
        <button type="button" className="refresh" onClick={handlePreview}>
          プレビュー
        </button>
        <button
          type="button"
          className="del-old"
          disabled={!candidates?.length || busy}
          onClick={handleExecute}
        >
          選択した Print を削除
        </button>
      </div>
      {status ? <p className="mstatus">{status}</p> : null}
      <div className="pgrid">
        {(candidates ?? []).map((p) => (
          <PrintCard key={p.id} print={p} />
        ))}
      </div>
    </section>
  );
}
