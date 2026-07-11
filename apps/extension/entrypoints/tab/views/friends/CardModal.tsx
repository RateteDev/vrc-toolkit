import {
  type Card,
  deriveTrustRank,
  fmtCard,
  fmtDateTime,
  fmtRelative,
  TRUST_RANK_LABELS,
} from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import { statusDotClass } from "../../status";
import { trustClass } from "../../trust";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import { BioLinkCards } from "./bioLinks";
import { renderMd } from "./markdown";

type Phase = "idle" | "loading" | "loaded" | "error";

// Recent instants read as "3時間前（2026/07/12 09:00）"; older ones fall back
// to the pre-formatted absolute date.
function fmtWhen(iso: string, absolute: string): string {
  const rel = fmtRelative(iso, new Date());
  return rel ? `${rel}（${fmtDateTime(iso)}）` : absolute;
}

export function CardModal({
  userId,
  onClose,
  onNoteSaved,
}: {
  userId: string | null;
  onClose: () => void;
  onNoteSaved: () => void;
}) {
  const client = useVrc();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Shared by the open effect and the refresh button; resets everything so a
  // refresh behaves exactly like reopening the card.
  const load = useCallback(() => {
    if (userId === null) return;
    setPhase("loading");
    setErrorMessage("");
    setCard(null);
    setNoteDraft("");
    setNoteStatus("");
    client.users
      .get(userId)
      .then((user) => {
        if (!user) {
          setPhase("error");
          setErrorMessage("読み込みに失敗しました");
          return;
        }
        // GET /users/{userId} embeds the account owner's own note, so one
        // request yields both the profile and the note body. Local tags are
        // out of scope this stage (see the FriendsView note), so the merge
        // always runs against an empty tag set.
        const c = fmtCard(user, []);
        setCard(c);
        setNoteDraft(c.note);
        setPhase("loaded");
      })
      .catch((e: unknown) => {
        setPhase("error");
        setErrorMessage(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
      });
  }, [client, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNote = () => {
    if (userId === null) return;
    setSaving(true);
    setNoteStatus("保存中…");
    client.notes
      .upsert({ targetUserId: userId, note: noteDraft })
      .then(() => {
        setNoteStatus("保存しました。");
        setSaving(false);
        onNoteSaved();
      })
      .catch((e: unknown) => {
        setNoteStatus(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
        setSaving(false);
      });
  };

  const headline =
    phase === "loading"
      ? "読み込み中…"
      : phase === "error"
        ? errorMessage
        : card?.displayName || "（名前なし）";

  // Trust rank drives the name color + a labeled badge. Only meaningful once the
  // card has loaded; the label is spelled out for color-vision accessibility.
  const trustRank = card ? deriveTrustRank(card.tags) : null;

  if (userId === null) return null;

  // Backdrop click / Esc / refresh must not silently discard an unsaved note edit.
  const noteDirty = phase === "loaded" && card !== null && noteDraft !== card.note;
  const requestClose = () => {
    if (noteDirty && !window.confirm("編集中のノートがあります。破棄して閉じますか？")) return;
    onClose();
  };
  const refresh = () => {
    if (noteDirty && !window.confirm("編集中のノートがあります。破棄して更新しますか？")) return;
    load();
  };

  return (
    <Modal ariaLabel="名刺" sheetClass="card-sheet" onRequestClose={requestClose}>
      <button
        type="button"
        className="card-refresh"
        onClick={refresh}
        disabled={phase === "loading"}
        aria-label="情報を更新"
        title="情報を更新"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="card-head">
        <div
          className="card-avatar"
          style={card?.imageUrl ? { backgroundImage: cssUrl(card.imageUrl) } : undefined}
        >
          {card ? <span className={`fdot card-dot ${statusDotClass(card.status)}`} /> : null}
        </div>
        <div className="card-headtext">
          <h2 className={trustRank ? `card-name ${trustClass(trustRank)}` : "card-name"}>
            {headline}
          </h2>
          {trustRank ? (
            <span className={`trustbadge ${trustClass(trustRank)}`}>
              {TRUST_RANK_LABELS[trustRank]}
            </span>
          ) : null}
          <div className="card-status">{card ? card.statusDescription || card.status : ""}</div>
        </div>
      </div>
      <div className="card-meta">
        <div>
          <span className="card-metalabel">参加日</span>
          <span className="card-metaval">
            {card ? fmtWhen(card.dateJoinedIso, card.dateJoined) || "—" : "—"}
          </span>
        </div>
        <div>
          <span className="card-metalabel">最終ログイン</span>
          <span className="card-metaval">
            {card ? fmtWhen(card.lastLoginIso, card.lastLogin) || "—" : "—"}
          </span>
        </div>
        {card?.pronouns ? (
          <div>
            <span className="card-metalabel">代名詞</span>
            <span className="card-metaval">{card.pronouns}</span>
          </div>
        ) : null}
      </div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: renderMd escapes &/</> before emitting any markup, so the only HTML present is generated by us */}
      <p className="card-bio" dangerouslySetInnerHTML={{ __html: renderMd(card?.bio ?? "") }} />
      <BioLinkCards urls={card?.bioLinks ?? []} />
      <div className="field">
        <label htmlFor="cardNote">自分のノート</label>
        <textarea
          id="cardNote"
          placeholder="このユーザーについて…"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          disabled={phase !== "loaded"}
        />
        <button
          type="button"
          className="card-save"
          onClick={saveNote}
          disabled={phase !== "loaded" || saving}
        >
          ノートを保存
        </button>
        <span className="card-notestatus">{noteStatus}</span>
      </div>
      {/*
        The old "ローカルタグ" editor (add/remove chips) lived here, backed by
        a server-side D1 table. The extension has no server DB and
        client-side persistence (IndexedDB / storage) is out of scope this
        stage, so it is intentionally omitted.
      */}
    </Modal>
  );
}
