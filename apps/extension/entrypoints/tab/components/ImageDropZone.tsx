// Shared image-intake surface for the upload modals (prints batch / avatar
// image): one dropzone contract — click / drag / paste — so the two flows
// cannot drift apart in how they accept files. Only the intake lives here;
// what happens to the received files (single-image crop vs. batch staging)
// stays with each caller.

import { type RefObject, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

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

// Document-level paste capture plus drag-navigation suppression, active only
// while `enabled`. Callers gate it to their intake phase (the avatar flow
// turns it off once an image is staged, so a stray paste cannot silently
// replace the image being cropped). `onFiles` must be referentially stable
// (useCallback) or the listeners churn every render.
export function useImagePasteDrop(enabled: boolean, onFiles: (files: File[]) => void): void {
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || tag === "textarea") return;
      const files = extractImageFiles(e);
      if (!files.length) return;
      e.preventDefault();
      onFiles(files);
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
  }, [enabled, onFiles]);
}

interface Props {
  // Whether the hidden file input allows selecting multiple files at once.
  multiple: boolean;
  // The constraints line under the fixed headline (formats, size, count).
  subLabel: string;
  // Receives image/* files only; non-image drops are filtered out here.
  onFiles: (files: File[]) => void;
  // Callers with a second trigger for the same picker (e.g. the batch
  // gallery's "+" tile) pass their own ref to click the hidden input.
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function ImageDropZone({ multiple, subLabel, onFiles, inputRef }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = inputRef ?? localInputRef;

  const emit = (list: FileList | null | undefined) => {
    if (!list?.length) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  return (
    <>
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
          emit(e.dataTransfer?.files);
        }}
      >
        <div className="ico" aria-hidden="true">
          <Icon name="upload" size={20} />
        </div>
        <div className="big">ドラッグ / クリック / ペーストで画像を追加</div>
        <div className="sub">{subLabel}</div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        hidden
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
