import { VrcError } from "@vrc-toolkit/core";
import { type ImageTag, validateImageParams } from "@vrc-toolkit/core/domain";
import { type DragEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { useVrc } from "../../vrc";

const IMAGE_TAG_OPTIONS: { value: ImageTag; label: string }[] = [
  { value: "sticker", label: "sticker（ステッカー）" },
  { value: "emoji", label: "emoji（絵文字）" },
  { value: "emojianimated", label: "emojianimated（アニメ絵文字）" },
  { value: "icon", label: "icon（アイコン）" },
  { value: "gallery", label: "gallery（ギャラリー）" },
];

interface UploadStatus {
  message: string;
  isError: boolean;
}

interface Props {
  onClose: () => void;
  onUploaded: (tag: ImageTag) => void;
}

export function StickerUploadModal({ onClose, onUploaded }: Props) {
  const vrc = useVrc();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [tag, setTag] = useState<ImageTag>("sticker");
  const [frames, setFrames] = useState("4");
  const [framesOverTime, setFramesOverTime] = useState("2");
  const [animationStyle, setAnimationStyle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<UploadStatus | null>(null);

  const animated = tag === "emojianimated";
  const pickFile = () => fileInputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0];
    if (picked) setFile(picked);
  };

  // Paste is wired only while the modal is mounted (open).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = e.clipboardData?.files?.[0];
      if (f?.type.startsWith("image/")) {
        e.preventDefault();
        setFile(f);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const handleDrag = (dragOn: boolean) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(dragOn);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setStatus({ message: "画像ファイルを選択してください。", isError: true });
      return;
    }
    let validated: ReturnType<typeof validateImageParams>;
    try {
      validated = validateImageParams({
        mime: file.type,
        tag,
        frames: animated ? Number(frames) : undefined,
        framesOverTime: animated ? Number(framesOverTime) : undefined,
        animationStyle: animated && animationStyle ? animationStyle : undefined,
      });
    } catch (err) {
      setStatus({
        message: `入力エラー: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      });
      return;
    }
    setSubmitting(true);
    setStatus({ message: "アップロード中…", isError: false });
    try {
      await vrc.files.uploadImage({
        blob: file,
        filename: file.name,
        tag: validated.tag,
        animation: validated.animation ?? undefined,
      });
      setStatus({ message: "アップロードしました。", isError: false });
      const uploadedTag = validated.tag;
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (uploadedTag === "sticker" || uploadedTag === "emoji") onUploaded(uploadedTag);
    } catch (err) {
      const message =
        err instanceof VrcError
          ? err.message
          : `ネットワークエラー: ${err instanceof Error ? err.message : String(err)}`;
      setStatus({ message, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  function requestClose() {
    if (file && !window.confirm("選択中の画像があります。破棄して閉じますか？")) return;
    onClose();
  }

  return (
    <Modal
      title="ステッカー・絵文字を投稿"
      hint="PNG 画像をステッカー・絵文字・アイコン等としてアップロードします。"
      onRequestClose={requestClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="imgFile">画像ファイル（PNG）</label>
          <input
            ref={fileInputRef}
            id="imgFile"
            type="file"
            accept="image/png"
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          {/* biome-ignore lint/a11y/useSemanticElements: shared .img-drop is block-level; a <button> default box would break it. */}
          <div
            className={dragging ? "img-drop drag" : "img-drop"}
            tabIndex={0}
            role="button"
            aria-label="画像を選択"
            onClick={pickFile}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                pickFile();
              }
            }}
            onDragEnter={handleDrag(true)}
            onDragOver={handleDrag(true)}
            onDragLeave={handleDrag(false)}
            onDragEnd={handleDrag(false)}
            onDrop={handleDrop}
          >
            <div className="ico" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M5 20h14" />
              </svg>
            </div>
            <div className="big">{file ? file.name : "クリック / ペーストで画像を選択"}</div>
            <div className="sub">PNG / 最大 10 MB</div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="imgTag">用途</label>
          <select id="imgTag" value={tag} onChange={(e) => setTag(e.target.value as ImageTag)}>
            {IMAGE_TAG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {animated ? (
          <>
            <div className="two field">
              <div>
                <label htmlFor="imgFrames">frames（2-64）</label>
                <input
                  id="imgFrames"
                  type="number"
                  min={2}
                  max={64}
                  step={1}
                  value={frames}
                  onChange={(e) => setFrames(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="imgFps">framesOverTime（1-64）</label>
                <input
                  id="imgFps"
                  type="number"
                  min={1}
                  max={64}
                  step={1}
                  value={framesOverTime}
                  onChange={(e) => setFramesOverTime(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="imgStyle">animationStyle（任意）</label>
              <input
                id="imgStyle"
                type="text"
                placeholder="既定でよければ空欄"
                value={animationStyle}
                onChange={(e) => setAnimationStyle(e.target.value)}
              />
            </div>
          </>
        ) : null}
        <button className="submit" type="submit" disabled={submitting}>
          アップロード
        </button>
        {status ? (
          <p className={status.isError ? "mstatus err" : "mstatus"}>{status.message}</p>
        ) : null}
      </form>
    </Modal>
  );
}
