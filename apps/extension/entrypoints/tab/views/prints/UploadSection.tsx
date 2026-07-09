import {
  type FormEvent,
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { PasteHandler } from "../../Layout";
import { useVrc } from "../../vrc";
import { CropModal } from "./CropModal";
import { cropToPrintBlob, PRINT_ASPECT } from "./canvas";
import { errorMessage } from "./errorMessage";
import { UploadIcon } from "./icons";
import { cropThumbStyle } from "./thumbStyle";
import { MAX_UPLOAD_ITEMS, type UploadItem } from "./types";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

interface Props {
  onUploaded: () => void;
  onPasteRef: MutableRefObject<PasteHandler | null>;
}

export function UploadSection({ onUploaded, onPasteRef }: Props) {
  const client = useVrc();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const seqRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read in event handlers instead of a stale closure over `items`, so
  // addFiles/removeItem can keep a stable identity (see useCallback below)
  // without re-subscribing the paste listener on every queue change.
  const itemsRef = useRef<UploadItem[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const additions: UploadItem[] = [];
    let count = itemsRef.current.length;
    let limited = false;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      if (count >= MAX_UPLOAD_ITEMS) {
        limited = true;
        break;
      }
      additions.push({
        id: ++seqRef.current,
        file: f,
        url: URL.createObjectURL(f),
        natW: 0,
        natH: 0,
        ncx: 0.5,
        ncy: 0.5,
        zoom: 1,
        note: "",
        worldId: "",
        worldName: "",
        status: "pending",
        resultId: null,
        error: null,
      });
      count++;
    }
    if (limited) setHitLimit(true);
    else if (additions.length) setHitLimit(false);
    if (additions.length) setItems((prev) => prev.concat(additions));
    for (const it of additions) {
      const probe = new Image();
      probe.onload = () => {
        setItems((prev) =>
          prev.map((x) =>
            x.id === it.id ? { ...x, natW: probe.naturalWidth, natH: probe.naturalHeight } : x,
          ),
        );
      };
      probe.src = it.url;
    }
  }, []);

  useEffect(() => {
    onPasteRef.current = addFiles;
    return () => {
      onPasteRef.current = null;
    };
  }, [addFiles, onPasteRef]);

  function removeItem(id: number) {
    const it = itemsRef.current.find((x) => x.id === id);
    if (it) URL.revokeObjectURL(it.url);
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (itemsRef.current.length - 1 < MAX_UPLOAD_ITEMS) setHitLimit(false);
    if (activeId === id) setActiveId(null);
  }

  // Global drop/paste handling: without this, a drop that misses the dropzone
  // navigates the tab to the dropped file, and paste needs to work anywhere
  // on the page (not just while an input is focused).
  useEffect(() => {
    function preventNav(e: DragEvent) {
      e.preventDefault();
    }
    window.addEventListener("dragover", preventNav);
    window.addEventListener("drop", preventNav);
    return () => {
      window.removeEventListener("dragover", preventNav);
      window.removeEventListener("drop", preventNav);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const queue = items.filter((it) => it.status !== "done");
    if (!queue.length) return;
    setSubmitting(true);
    for (const it of queue) {
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "uploading" } : x)));
      try {
        const blob = await cropToPrintBlob(it, it.file);
        const res = await client.prints.upload({
          image: blob,
          filename: "print.jpg",
          note: it.note.trim() || undefined,
          worldId: it.worldId.trim() || undefined,
          worldName: it.worldName.trim() || undefined,
        });
        if (!res?.id) throw new Error("print upload failed");
        const resultId = res.id;
        setItems((prev) =>
          prev.map((x) => (x.id === it.id ? { ...x, status: "done", resultId, error: null } : x)),
        );
      } catch (err) {
        const message = errorMessage(err);
        setItems((prev) =>
          prev.map((x) => (x.id === it.id ? { ...x, status: "error", error: message } : x)),
        );
      }
    }
    setSubmitting(false);
    onUploaded();
  }

  const pendingCount = items.filter((it) => it.status !== "done").length;
  const submitLabel =
    items.length === 0
      ? "画像を選択してください"
      : pendingCount === 0
        ? "すべてアップロード済み"
        : `${pendingCount} 枚をアップロード`;
  const shownResults = items.filter((it) => it.status === "done" || it.status === "error");
  const activeItem = items.find((it) => it.id === activeId) ?? null;
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

  return (
    <section id="view-upload">
      <form onSubmit={handleSubmit}>
        <section className="card">
          <h2>Print を投稿</h2>
          <p className="hint">最大 20 枚 · タップして切り抜きと詳細を編集</p>
          {/* biome-ignore lint/a11y/useSemanticElements: styles.css defines
              `.drop` as a block-level dropzone; a native <button> defaults to
              inline-block and needs a UA-style reset styles.css doesn't
              provide. role+tabIndex+onKeyDown already cover keyboard access. */}
          <div
            className={dragOver ? "drop drag" : "drop"}
            tabIndex={0}
            role="button"
            aria-label="画像を選択"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDragEnd={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
            }}
          >
            <div className="ico" aria-hidden="true">
              <UploadIcon />
            </div>
            <div className="big">ドラッグ / クリック / ペーストで画像を追加</div>
            <div className="sub">PNG · JPEG · WebP / 最大 10 MB · 複数可 · Ctrl+V 対応</div>
          </div>
          <div className={items.length ? "gallery on" : "gallery"}>
            {items.map((it, idx) => (
              // biome-ignore lint/a11y/useSemanticElements: .thumb also nests a delete <button>; buttons can't nest.
              <div
                key={it.id}
                className="thumb"
                role="button"
                tabIndex={0}
                aria-label={`画像 ${idx + 1} を編集`}
                onClick={() => setActiveId(it.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveId(it.id);
                  }
                }}
              >
                <div
                  className="pic"
                  style={
                    it.natW
                      ? cropThumbStyle(it, it.url, PRINT_ASPECT)
                      : { backgroundImage: `url("${it.url}")` }
                  }
                />
                <button
                  type="button"
                  className="rm"
                  aria-label="削除"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(it.id);
                  }}
                >
                  ×
                </button>
                <div className="meta">編集</div>
                <div className={`badge ${it.status}`}>
                  {it.status === "uploading" ? (
                    <span className="sp" />
                  ) : it.status === "done" ? (
                    "✓"
                  ) : it.status === "error" ? (
                    "!"
                  ) : (
                    idx + 1
                  )}
                </div>
              </div>
            ))}
            {items.length < MAX_UPLOAD_ITEMS ? (
              // biome-ignore lint/a11y/useSemanticElements: same block-level constraint as .drop above.
              <div
                className="thumb add"
                role="button"
                tabIndex={0}
                aria-label="追加"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                +
              </div>
            ) : null}
          </div>
          <p className="limit" hidden={!hitLimit}>
            画像は最大 20 枚までです。
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </section>

        <button
          type="submit"
          className={submitting ? "submit loading" : "submit"}
          disabled={submitting || pendingCount === 0}
        >
          <span className="spinner" aria-hidden="true" />
          <span>{submitLabel}</span>
        </button>
      </form>
      <div className={shownResults.length ? "results on" : "results"}>
        {shownResults.map((it) => (
          <div key={it.id} className={it.status === "done" ? "ritem ok" : "ritem err"}>
            <div className="rmark">{it.status === "done" ? "✓" : "!"}</div>
            <div className="rbody">
              <div className="rname">{it.file.name}</div>
              <div className="rsub">{it.status === "done" ? it.resultId : it.error}</div>
            </div>
            {it.status === "done" && it.resultId ? <CopyButton text={it.resultId} /> : null}
          </div>
        ))}
      </div>

      {activeItem ? (
        <CropModal
          item={activeItem}
          index={activeIndex}
          total={items.length}
          onChange={(patch) =>
            setItems((prev) => prev.map((x) => (x.id === activeItem.id ? { ...x, ...patch } : x)))
          }
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        const mark = () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1300);
        };
        navigator.clipboard.writeText(text).then(mark, mark);
      }}
    >
      {copied ? "済" : "コピー"}
    </button>
  );
}
