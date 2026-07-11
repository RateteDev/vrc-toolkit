import { PRINT_HEIGHT, PRINT_WIDTH } from "@vrc-toolkit/core/domain";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { UploadIcon } from "../../components/icons";
import { Modal } from "../../components/Modal";
import { useVrc } from "../../vrc";
import { cropToBlob, PRINT_ASPECT, PRINT_OUTPUT_QUALITY, PRINT_OUTPUT_TYPE } from "../canvas";
import { cssUrl } from "../cssUrl";
import { errorMessage } from "../errorMessage";
import { CropModal } from "./CropModal";
import { cropThumbStyle } from "./thumbStyle";
import { MAX_UPLOAD_ITEMS, type UploadItem } from "./types";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function extractImageFiles(e: ClipboardEvent): File[] {
  const cd = e.clipboardData;
  if (!cd?.items) return [];
  const out: File[] = [];
  for (let i = 0; i < cd.items.length; i++) {
    const item = cd.items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}

// Print upload as a modal: the list is the primary surface, posting is an
// occasional action layered on top. Paste is only wired while this modal is
// mounted (open), and closing with staged-but-unposted images asks first so the
// crop/note work is not lost by an accidental Esc or backdrop click.
export function UploadModal({ onClose, onUploaded }: Props) {
  const client = useVrc();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const seqRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Paste + drop are handled only while the modal is open. Without the global
  // dragover/drop guard a stray drop navigates the tab to the file.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || tag === "textarea") return;
      const files = extractImageFiles(e);
      if (!files.length) return;
      e.preventDefault();
      addFiles(files);
    };
    const preventNav = (e: DragEvent) => e.preventDefault();
    document.addEventListener("paste", onPaste);
    window.addEventListener("dragover", preventNav);
    window.addEventListener("drop", preventNav);
    return () => {
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", preventNav);
      window.removeEventListener("drop", preventNav);
    };
  }, [addFiles]);

  function removeItem(id: number) {
    const it = itemsRef.current.find((x) => x.id === id);
    if (it) URL.revokeObjectURL(it.url);
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (itemsRef.current.length - 1 < MAX_UPLOAD_ITEMS) setHitLimit(false);
    if (activeId === id) setActiveId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const queue = items.filter((it) => it.status !== "done");
    if (!queue.length) return;
    setSubmitting(true);
    for (const it of queue) {
      // The user can remove a staged image mid-batch; skip anything that is no
      // longer in the queue so it is never uploaded after being taken out.
      if (!itemsRef.current.some((x) => x.id === it.id)) continue;
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "uploading" } : x)));
      try {
        const blob = await cropToBlob(it, it.file, {
          aspect: PRINT_ASPECT,
          outputWidth: PRINT_WIDTH,
          outputHeight: PRINT_HEIGHT,
          type: PRINT_OUTPUT_TYPE,
          quality: PRINT_OUTPUT_QUALITY,
        });
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

  // A close is guarded only while unposted images are staged; once everything is
  // uploaded there is nothing to lose.
  function requestClose() {
    const hasStaged = items.some((it) => it.status !== "done");
    if (hasStaged && !window.confirm("編集中の画像があります。破棄して閉じますか？")) return;
    for (const it of items) URL.revokeObjectURL(it.url);
    onClose();
  }

  const pendingCount = items.filter((it) => it.status !== "done").length;
  const submitLabel =
    items.length === 0
      ? "画像を選択してください"
      : pendingCount === 0
        ? "すべてアップロード済み"
        : `${pendingCount} 枚をアップロード`;
  const activeItem = items.find((it) => it.id === activeId) ?? null;
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

  return (
    <Modal
      title="Print を投稿"
      hint="最大 20 枚 · タップして切り抜きと詳細を編集"
      onRequestClose={requestClose}
      sheetClass="upload-sheet"
    >
      <form onSubmit={handleSubmit}>
        {/* biome-ignore lint/a11y/useSemanticElements: .drop is a block-level dropzone; a native <button> defaults to inline-block. role+tabIndex+onKeyDown cover keyboard access. */}
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
            // biome-ignore lint/a11y/useSemanticElements: .thumb nests a delete <button>; buttons can't nest.
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
                    : { backgroundImage: cssUrl(it.url) }
                }
              />
              <button
                type="button"
                className="rm"
                aria-label="削除"
                disabled={submitting}
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
        <button
          type="submit"
          className={submitting ? "submit loading" : "submit"}
          disabled={submitting || pendingCount === 0}
        >
          <span className="spinner" aria-hidden="true" />
          <span>{submitLabel}</span>
        </button>
      </form>

      {activeItem ? (
        <CropModal
          item={activeItem}
          index={activeIndex}
          total={items.length}
          aspect={PRINT_ASPECT}
          hint="ドラッグで位置、スライダーで拡大。枠内（16:9）が Print になります。"
          onChange={(patch) =>
            setItems((prev) => prev.map((x) => (x.id === activeItem.id ? { ...x, ...patch } : x)))
          }
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </Modal>
  );
}
