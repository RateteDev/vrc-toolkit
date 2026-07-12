import { type PrintSummary, sortPrints, toPrintSummary } from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { LastUpdated } from "../../components/LastUpdated";
import { type ViewMode, ViewToggle } from "../../components/ViewToggle";
import { useVrc } from "../../vrc";
import { errorMessage } from "../errorMessage";
import { PrintCard } from "./PrintCard";

// Inter-request delay between bulk DELETEs. Writes carry more BAN risk than
// reads, so a bulk "全選択 → 削除" must not fire back-to-back at network speed.
const DELETE_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Props {
  // Bumped by the upload modal after a submit batch, to reload the grid.
  refreshToken: number;
  onOpenUpload: () => void;
}

interface Progress {
  total: number;
  done: number;
}

export function ManageSection({ refreshToken, onOpenUpload }: Props) {
  const client = useVrc();
  const [prints, setPrints] = useState<PrintSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Multi-select delete state.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Progress | null>(null);
  const stopRef = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const user = await client.auth.currentUser();
      if (!user?.id) {
        setPrints([]);
        setLoadError("ログインが必要です");
        return;
      }
      const raw = await client.prints.listAll(user.id);
      setPrints(sortPrints(raw.map(toPrintSummary)));
      setLastUpdate(new Date());
    } catch (err) {
      setPrints([]);
      setLoadError(errorMessage(err));
    }
  }, [client]);

  useEffect(() => {
    void refreshToken;
    load();
  }, [load, refreshToken]);

  async function handleDelete(p: PrintSummary) {
    if (!p.id) return;
    if (!window.confirm(`この Print を削除しますか？\n${p.note || p.id}`)) return;
    setDeletingId(p.id);
    try {
      await client.prints.delete(p.id);
      setPrints((prev) => (prev ? prev.filter((x) => x.id !== p.id) : prev));
    } catch (err) {
      window.alert(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  const list = prints ?? [];
  const allSelected = list.length > 0 && selected.size === list.length;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(list.map((p) => p.id).filter(Boolean)));
  }

  // Optimistic bulk delete: mark the chosen cards as removing, issue DELETEs one
  // at a time (gentle on the API), and — regardless of any per-item error — let
  // a final reload decide truth. A 404 means it is already gone, i.e. success.
  async function deleteSelected() {
    const targets = list.filter((p) => p.id && selected.has(p.id));
    if (!targets.length) return;
    if (!window.confirm(`${targets.length} 件の Print を削除します。よろしいですか？`)) return;
    stopRef.current = false;
    setRemoving(new Set(targets.map((p) => p.id)));
    setProgress({ total: targets.length, done: 0 });
    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) break;
      const p = targets[i];
      if (!p) continue;
      try {
        await client.prints.delete(p.id);
      } catch {
        // Ignore: the reconciling reload below reflects the real server state.
      }
      setProgress((pr) => (pr ? { ...pr, done: pr.done + 1 } : pr));
      if (i < targets.length - 1 && !stopRef.current) await delay(DELETE_DELAY_MS);
    }
    setProgress(null);
    exitSelectMode();
    await load();
    setRemoving(new Set());
  }

  const loading = prints === null && !loadError;
  const empty = prints !== null && list.length === 0 && !loadError;
  const statusText = loading
    ? "読み込み中…"
    : loadError || (empty ? "まだ Print がありません。" : null);
  const busy = progress !== null;

  return (
    <section className="card">
      <div className="mhead">
        <LastUpdated at={lastUpdate} />
        <ViewToggle mode={viewMode} onChange={setViewMode} />
        <button type="button" className="refresh" onClick={load} disabled={busy}>
          更新
        </button>
      </div>
      <div className="ptoolbar">
        <button type="button" className="postbtn" onClick={onOpenUpload}>
          + 投稿
        </button>
        {!selectMode ? (
          <button
            type="button"
            className="selbtn"
            onClick={() => setSelectMode(true)}
            disabled={list.length === 0}
          >
            選択
          </button>
        ) : (
          <>
            <span className="selinfo">{selected.size} 件選択中</span>
            <button type="button" className="selbtn" onClick={toggleSelectAll} disabled={busy}>
              {allSelected ? "全解除" : "全選択"}
            </button>
            {!busy ? (
              <>
                <button
                  type="button"
                  className="del-old"
                  disabled={selected.size === 0}
                  onClick={deleteSelected}
                >
                  選択した {selected.size} 件を削除
                </button>
                <button type="button" className="selbtn" onClick={exitSelectMode}>
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <span className="selinfo">
                  {progress?.done}/{progress?.total} 件削除中…
                </span>
                <button
                  type="button"
                  className="selbtn stop"
                  onClick={() => {
                    stopRef.current = true;
                  }}
                >
                  停止
                </button>
              </>
            )}
          </>
        )}
      </div>

      {statusText ? <p className={loadError ? "mstatus err" : "mstatus"}>{statusText}</p> : null}
      <div className={`pgrid view-${viewMode}`}>
        {list.map((p) => (
          <PrintCard
            key={p.id}
            print={p}
            selectable={selectMode}
            selected={selected.has(p.id)}
            onToggle={() => toggleSelect(p.id)}
            onDelete={selectMode ? undefined : () => handleDelete(p)}
            deleting={removing.has(p.id) || deletingId === p.id}
          />
        ))}
      </div>
    </section>
  );
}
