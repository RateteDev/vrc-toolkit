import type { AuthUserResponse } from "@vrc-toolkit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { cssUrl } from "../views/cssUrl";
import { BioLinkCards } from "../views/friends/bioLinks";
import { renderMd } from "../views/friends/markdown";
import { useVrc } from "../vrc";
import { Modal } from "./Modal";
import { buildProfilePatch, type MyCardForm } from "./myCardPatch";

type Phase = "idle" | "loading" | "loaded" | "error";

interface OwnProfile {
  id: string;
  displayName: string;
  imageUrl: string | null;
  status: string;
  statusDescription: string;
  pronouns: string;
  bio: string;
  bioLinks: string[];
}

function toOwnProfile(u: AuthUserResponse): OwnProfile {
  return {
    id: u.id ?? "",
    displayName: u.displayName ?? "",
    imageUrl: u.currentAvatarThumbnailImageUrl ?? u.currentAvatarImageUrl ?? null,
    status: u.status ?? "",
    statusDescription: u.statusDescription ?? "",
    pronouns: u.pronouns ?? "",
    bio: u.bio ?? "",
    bioLinks: u.bioLinks ?? [],
  };
}

// The form always has exactly 3 link slots; missing links become empty slots.
function toSlots(urls: string[]): [string, string, string] {
  return [urls[0] ?? "", urls[1] ?? "", urls[2] ?? ""];
}

// Self profile editor (bio / bioLinks / pronouns), opened from the header's
// StatusPopover ("プロフィールを編集…"). status/statusDescription stay the
// popover's responsibility — this modal never touches them.
//
// userIcon / profilePicOverride editing is a future candidate: both require
// VRC+ and a file-upload flow, out of scope for this stage.
export function MyCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const client = useVrc();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [form, setForm] = useState<MyCardForm>({ bio: "", bioLinks: ["", "", ""], pronouns: "" });
  const [saveStatus, setSaveStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Same staleness guard as CardModal: a slow load/save response must not
  // clobber state after the modal was closed and reopened.
  const loadSeqRef = useRef(0);

  const load = useCallback(() => {
    const seq = ++loadSeqRef.current;
    setPhase("loading");
    setErrorMessage("");
    setSaveStatus("");
    setSaving(false);
    client.auth
      .currentUser()
      .then((u) => {
        if (seq !== loadSeqRef.current) return;
        if (!u?.id) {
          setPhase("error");
          setErrorMessage("読み込みに失敗しました");
          return;
        }
        const p = toOwnProfile(u);
        setProfile(p);
        setForm({ bio: p.bio, bioLinks: toSlots(p.bioLinks), pronouns: p.pronouns });
        setPhase("loaded");
      })
      .catch((e: unknown) => {
        if (seq !== loadSeqRef.current) return;
        setPhase("error");
        setErrorMessage(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
      });
  }, [client]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const dirty =
    phase === "loaded" &&
    profile !== null &&
    (form.bio !== profile.bio ||
      form.pronouns !== profile.pronouns ||
      toSlots(profile.bioLinks).some((v, i) => v !== form.bioLinks[i]));

  const requestClose = () => {
    if (dirty && !window.confirm("編集中の内容があります。破棄して閉じますか？")) return;
    onClose();
  };

  const save = () => {
    if (!profile) return;
    let patch: ReturnType<typeof buildProfilePatch>;
    try {
      patch = buildProfilePatch(form);
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : String(e));
      return;
    }
    const seq = loadSeqRef.current;
    setSaving(true);
    setSaveStatus("保存中…");
    client.users
      .update(profile.id, patch)
      .then(() => {
        if (seq !== loadSeqRef.current) return;
        // Advance the dirty-check baseline to what was persisted, same as
        // CardModal's note save.
        setProfile((p) => (p ? { ...p, ...patch, bioLinks: patch.bioLinks ?? [] } : p));
        setSaveStatus("保存しました。");
        setSaving(false);
      })
      .catch((e: unknown) => {
        if (seq !== loadSeqRef.current) return;
        setSaveStatus(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
        setSaving(false);
      });
  };

  if (!open) return null;

  const headline =
    phase === "loading"
      ? "読み込み中…"
      : phase === "error"
        ? errorMessage
        : profile?.displayName || "（名前なし）";

  const statusLine = profile
    ? [profile.pronouns, profile.statusDescription || profile.status].filter(Boolean).join(" · ")
    : "";

  return (
    <Modal ariaLabel="プロフィール編集" sheetClass="card-sheet" onRequestClose={requestClose}>
      <div className="card-head">
        <div
          className="card-avatar"
          style={profile?.imageUrl ? { backgroundImage: cssUrl(profile.imageUrl) } : undefined}
        />
        <div className="card-headtext">
          <h2 className="card-name">{headline}</h2>
          <div className="card-status">{statusLine}</div>
        </div>
      </div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: renderMd escapes &/</> before emitting any markup, so the only HTML present is generated by us */}
      <p className="card-bio" dangerouslySetInnerHTML={{ __html: renderMd(profile?.bio ?? "") }} />
      <BioLinkCards urls={profile?.bioLinks ?? []} />

      <div className="field">
        <label htmlFor="myCardBio">自己紹介（bio）</label>
        <textarea
          id="myCardBio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          disabled={phase !== "loaded"}
        />
      </div>
      {([0, 1, 2] as const).map((i) => (
        <div className="field" key={i}>
          <label htmlFor={`myCardLink${i}`}>リンク{i + 1}</label>
          <input
            id={`myCardLink${i}`}
            type="text"
            placeholder="https://..."
            value={form.bioLinks[i]}
            onChange={(e) => {
              const next: [string, string, string] = [...form.bioLinks];
              next[i] = e.target.value;
              setForm((f) => ({ ...f, bioLinks: next }));
            }}
            disabled={phase !== "loaded"}
          />
        </div>
      ))}
      <div className="field">
        <label htmlFor="myCardPronouns">代名詞</label>
        <input
          id="myCardPronouns"
          type="text"
          value={form.pronouns}
          onChange={(e) => setForm((f) => ({ ...f, pronouns: e.target.value }))}
          disabled={phase !== "loaded"}
        />
      </div>
      <button
        type="button"
        className="card-save"
        onClick={save}
        disabled={phase !== "loaded" || saving}
      >
        保存
      </button>
      <span className="card-notestatus">{saveStatus}</span>
    </Modal>
  );
}
