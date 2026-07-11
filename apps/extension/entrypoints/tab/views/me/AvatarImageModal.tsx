import { latestFileUrl } from "@vrc-toolkit/core/domain";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { useVrc } from "../../vrc";
import { CropStage } from "../prints/CropStage";
import {
  AVATAR_ASPECT,
  AVATAR_HEIGHT,
  AVATAR_OUTPUT_QUALITY,
  AVATAR_OUTPUT_TYPE,
  AVATAR_WIDTH,
  cropToBlob,
} from "../prints/canvas";
import { errorMessage } from "../prints/errorMessage";
import { UploadIcon } from "../prints/icons";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function extractFirstImageFile(e: ClipboardEvent): File | null {
  const cd = e.clipboardData;
  if (!cd?.items) return null;
  for (let i = 0; i < cd.items.length; i++) {
    const item = cd.items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

interface Props {
  avatarId: string;
  onClose: () => void;
  // Fired after a successful upload + PUT /avatars/{id}; the caller closes
  // this modal and reloads the grid.
  onUpdated: () => void;
}

// Single-image variant of the print upload's drop-then-crop flow: one .drop
// zone (click/drag/paste), a 4:3 crop, then a straight-through submit. No
// batching — avatar image changes are a user-initiated, one-at-a-time write
// per the unofficial-API policy.
export function AvatarImageModal({ avatarId, onClose, onUpdated }: Props) {
  const client = useVrc();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [ncx, setNcx] = useState(0.5);
  const [ncy, setNcy] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const objUrl = URL.createObjectURL(f);
    setFile(f);
    setUrl(objUrl);
    setNatW(0);
    setNatH(0);
    setNcx(0.5);
    setNcy(0.5);
    setZoom(1);
    setError(null);
    const probe = new Image();
    probe.onload = () => {
      setNatW(probe.naturalWidth);
      setNatH(probe.naturalHeight);
    };
    probe.src = objUrl;
  }, []);

  function reselect() {
    if (url) URL.revokeObjectURL(url);
    setFile(null);
    setUrl(null);
    setError(null);
  }

  // Paste + drop are handled only while this modal is open, and only before a
  // file has been picked: once cropping, "選び直す" is the explicit way back
  // rather than a stray paste silently swapping the staged image.
  useEffect(() => {
    if (file) return;
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || tag === "textarea") return;
      const f = extractFirstImageFile(e);
      if (!f) return;
      e.preventDefault();
      pickFile(f);
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
  }, [file, pickFile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !url || !natW || !natH) return;
    setSubmitting(true);
    setError(null);
    try {
      const blob = await cropToBlob({ natW, natH, ncx, ncy, zoom, url }, file, {
        aspect: AVATAR_ASPECT,
        outputWidth: AVATAR_WIDTH,
        outputHeight: AVATAR_HEIGHT,
        type: AVATAR_OUTPUT_TYPE,
        quality: AVATAR_OUTPUT_QUALITY,
      });
      const uploaded = await client.files.uploadImage({
        blob,
        filename: "avatar.jpg",
        tag: "avatarimage",
      });
      if (!uploaded) throw new Error("画像のアップロードに失敗しました");
      const imageUrl = latestFileUrl(uploaded);
      if (!imageUrl) throw new Error("アップロードした画像のURLを取得できませんでした");
      await client.avatars.update(avatarId, { imageUrl });
      URL.revokeObjectURL(url);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function requestClose() {
    if (file && !window.confirm("選択中の画像があります。破棄して閉じますか？")) return;
    if (url) URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <Modal
      title="アバター画像を変更"
      hint="1 枚の画像をドラッグ / クリック / ペーストで選択し、4:3 に切り抜いてアップロードします。"
      onRequestClose={requestClose}
    >
      {!file || !url ? (
        // biome-ignore lint/a11y/useSemanticElements: .drop is a block-level dropzone; a native <button> defaults to inline-block. role+tabIndex+onKeyDown cover keyboard access.
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
            const f = e.dataTransfer?.files?.[0];
            if (f) pickFile(f);
          }}
        >
          <div className="ico" aria-hidden="true">
            <UploadIcon />
          </div>
          <div className="big">ドラッグ / クリック / ペーストで画像を追加</div>
          <div className="sub">PNG · JPEG · WebP / 最大 10 MB / 1 枚のみ</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <button
            type="button"
            className="selbtn"
            onClick={reselect}
            disabled={submitting}
            style={{ marginBottom: 12 }}
          >
            画像を選び直す
          </button>
          <CropStage
            url={url}
            item={{ natW, natH, ncx, ncy, zoom }}
            aspect={AVATAR_ASPECT}
            onChange={(patch) => {
              if (patch.ncx !== undefined) setNcx(patch.ncx);
              if (patch.ncy !== undefined) setNcy(patch.ncy);
              if (patch.zoom !== undefined) setZoom(patch.zoom);
            }}
          />
          <button
            type="submit"
            className={submitting ? "submit loading" : "submit"}
            disabled={submitting}
          >
            <span className="spinner" aria-hidden="true" />
            <span>{submitting ? "アップロード中…" : "この画像に変更"}</span>
          </button>
          {error ? <p className="mstatus err">{error}</p> : null}
        </form>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
          e.target.value = "";
        }}
      />
    </Modal>
  );
}
