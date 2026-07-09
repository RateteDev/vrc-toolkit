import { VrcError } from "@vrc-toolkit/core";
import { type ImageTag, validateImageParams } from "@vrc-toolkit/core/domain";
import {
  type DragEvent,
  type FormEvent,
  type MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import type { PasteHandler } from "../../Layout";
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
  onUploaded: (tag: ImageTag) => void;
  onPasteRef: MutableRefObject<PasteHandler | null>;
}

export function StickerUploadCard({ onUploaded, onPasteRef }: Props) {
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

  useEffect(() => {
    onPasteRef.current = (pasted) => {
      if (pasted[0]) setFile(pasted[0]);
    };
    return () => {
      onPasteRef.current = null;
    };
  }, [onPasteRef]);

  const handleDrag = (dragOn: boolean) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(dragOn);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const resetForm = () => {
    setFile(null);
    setTag("sticker");
    setFrames("4");
    setFramesOverTime("2");
    setAnimationStyle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      resetForm();
      if (uploadedTag === "sticker" || uploadedTag === "emoji") {
        onUploaded(uploadedTag);
      }
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

  return (
    <section className="card">
      <h2>ステッカー・絵文字を投稿</h2>
      <p className="hint">PNG 画像をステッカー・絵文字・アイコン等としてアップロードします。</p>
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
          {/* biome-ignore lint/a11y/useSemanticElements: must stay a div — the
              shared .img-drop CSS class (styles.css, not owned by this file)
              assumes block-level layout that a <button>'s default inline-block
              box would break. */}
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
            <div className="big">{file ? file.name : "クリックして画像を選択"}</div>
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
        {animated && (
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
        )}
        {animated && (
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
        )}
        <button className="submit" type="submit" disabled={submitting}>
          アップロード
        </button>
        {status && <p className={status.isError ? "mstatus err" : "mstatus"}>{status.message}</p>}
      </form>
    </section>
  );
}
