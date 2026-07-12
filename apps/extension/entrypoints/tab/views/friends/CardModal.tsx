import {
  type Card,
  deriveTrustRank,
  fmtCard,
  fmtDateTime,
  fmtRelative,
  TRUST_RANK_LABELS,
} from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { statusDotClass } from "../../status";
import { trustClass } from "../../trust";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import { BioLinkCards } from "./bioLinks";
import { renderMd } from "./markdown";

type Phase = "idle" | "loading" | "loaded" | "error";

// Meta rows stay compact: relative time in the row, absolute on hover — the
// same convention as the list headers' LastUpdated. Older instants (where the
// relative form loses meaning) fall back to the pre-formatted absolute date.
function fmtWhen(iso: string, absolute: string): string {
  const rel = fmtRelative(iso, new Date());
  return rel || absolute;
}

export function CardModal({
  userId,
  onClose,
  onNoteSaved,
}: {
  userId: string | null;
  onClose: () => void;
  // Fired with the persisted note after a successful upsert, so the caller
  // can update its list locally instead of refetching.
  onNoteSaved: (userId: string, note: string) => void;
}) {
  const client = useVrc();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Guards against a stale response landing after the modal switched to
  // another user (or was refreshed): without it, user A's slow response could
  // overwrite user B's card — and a note saved from that state would write
  // A's note text onto B. Each load bumps the sequence; only the latest
  // load's callbacks may touch state.
  const loadSeqRef = useRef(0);

  // Shared by the open effect and the refresh button; resets everything so a
  // refresh behaves exactly like reopening the card.
  const load = useCallback(() => {
    if (userId === null) return;
    const seq = ++loadSeqRef.current;
    setPhase("loading");
    setErrorMessage("");
    setCard(null);
    setNoteDraft("");
    setNoteStatus("");
    // An in-flight save's callbacks are sequence-guarded and will not restore
    // this, so reset it here or the save button stays stuck disabled.
    setSaving(false);
    client.users
      .get(userId)
      .then((user) => {
        if (seq !== loadSeqRef.current) return;
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
        if (seq !== loadSeqRef.current) return;
        setPhase("error");
        setErrorMessage(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
      });
  }, [client, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNote = () => {
    if (userId === null) return;
    const saved = noteDraft;
    // The upsert itself targets the captured userId either way; the guard only
    // keeps its UI feedback from landing on a different user's card after a
    // mid-save switch (any switch runs load(), which bumps the sequence).
    const seq = loadSeqRef.current;
    setSaving(true);
    setNoteStatus("保存中…");
    client.notes
      .upsert({ targetUserId: userId, note: saved })
      .then(() => {
        onNoteSaved(userId, saved);
        if (seq !== loadSeqRef.current) return;
        // Advance the dirty-check baseline to what was persisted so closing no
        // longer prompts to discard. A later edit re-dirties against this value.
        setCard((c) => (c ? { ...c, note: saved } : c));
        setNoteStatus("保存しました。");
        setSaving(false);
      })
      .catch((e: unknown) => {
        if (seq !== loadSeqRef.current) return;
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
        <div title={card ? fmtDateTime(card.dateJoinedIso) : undefined}>
          <span className="card-metalabel">参加日</span>
          <span className="card-metaval">
            {card ? fmtWhen(card.dateJoinedIso, card.dateJoined) || "—" : "—"}
          </span>
        </div>
        <div title={card ? fmtDateTime(card.lastLoginIso) : undefined}>
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
      {/* Links precede the bio: they are actions, the bio is reading matter,
          and a long bio must not push them below the fold. */}
      <BioLinkCards urls={card?.bioLinks ?? []} />
      {card?.bio ? (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: renderMd escapes &/</> before emitting any markup, so the only HTML present is generated by us
        <p className="card-bio" dangerouslySetInnerHTML={{ __html: renderMd(card.bio) }} />
      ) : null}
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
