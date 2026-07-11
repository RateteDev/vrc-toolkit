import { latestFileUrl } from "@vrc-toolkit/core/domain";
import { type FormEvent, useCallback, useState } from "react";
import { CropStage } from "../../components/CropStage";
import { ImageDropZone, useImagePasteDrop } from "../../components/ImageDropZone";
import { Modal } from "../../components/Modal";
import { useObjectUrlCleanup } from "../../objectUrls";
import { useVrc } from "../../vrc";
import {
  AVATAR_ASPECT,
  AVATAR_HEIGHT,
  AVATAR_OUTPUT_QUALITY,
  AVATAR_OUTPUT_TYPE,
  AVATAR_WIDTH,
  cropToBlob,
} from "../canvas";
import { errorMessage } from "../errorMessage";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useObjectUrlCleanup(() => (url ? [url] : []));

  const pickFile = useCallback((f: File) => {
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

  // Single-image flow: only the first received file is staged. Intake stops
  // once a file has been picked — "選び直す" is the explicit way back rather
  // than a stray paste silently swapping the staged image.
  const handleFiles = useCallback(
    (files: File[]) => {
      if (files[0]) pickFile(files[0]);
    },
    [pickFile],
  );
  useImagePasteDrop(!file, handleFiles);

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
        <ImageDropZone
          multiple={false}
          subLabel="PNG · JPEG · WebP / 最大 10 MB / 1 枚のみ"
          onFiles={handleFiles}
        />
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
    </Modal>
  );
}
