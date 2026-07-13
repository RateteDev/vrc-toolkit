import { fmtDateTime, fmtGroupPost, type GroupPostView } from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";
import { errorMessage } from "../errorMessage";

// VRChat caps list `n` at 100; 10 keeps each on-demand page small, and
// 「もっと見る」 pages further by offset while unseen posts remain.
const PAGE_SIZE = 10;

type Phase = "idle" | "loading" | "loaded" | "error";

// A group's post feed, fetched only when the group modal is open. The first
// page loads on mount; subsequent pages append by offset. Post text keeps its
// raw newlines (rendered pre-wrapped via .gpost-text), no markdown.
export function GroupPosts({ groupId }: { groupId: string }) {
  const client = useVrc();
  const [posts, setPosts] = useState<GroupPostView[]>([]);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");

  const loadPage = useCallback(
    (offset: number) => {
      setPhase("loading");
      client.groups
        .posts(groupId, { n: PAGE_SIZE, offset })
        .then((page) => {
          const items = (page?.posts ?? []).map(fmtGroupPost);
          setPosts((prev) => (offset === 0 ? items : [...prev, ...items]));
          setTotal(typeof page?.total === "number" ? page.total : 0);
          setPhase("loaded");
        })
        .catch((e: unknown) => {
          setPhase("error");
          setMessage(`投稿の取得に失敗しました: ${errorMessage(e)}`);
        });
    },
    [client, groupId],
  );

  useEffect(() => {
    setPosts([]);
    setTotal(0);
    loadPage(0);
  }, [loadPage]);

  if (phase === "error") return <p className="mstatus">{message}</p>;
  if (phase === "loading" && posts.length === 0) return <p className="mstatus">読み込み中…</p>;
  if (posts.length === 0) return <p className="mstatus">投稿はありません。</p>;

  const hasMore = posts.length < total;

  return (
    <div className="gposts">
      {posts.map((post) => (
        <article className="gpost" key={post.id}>
          {post.title ? <h4 className="gpost-title">{post.title}</h4> : null}
          {post.createdAt ? (
            <p className="gpost-date">{fmtDateTime(post.createdAt.toISOString())}</p>
          ) : null}
          {post.imageUrl ? (
            <div className="gpost-image" style={{ backgroundImage: cssUrl(post.imageUrl) }} />
          ) : null}
          {post.text ? <p className="gpost-text">{post.text}</p> : null}
        </article>
      ))}
      {hasMore ? (
        <button
          type="button"
          className="aactbtn gpost-more"
          disabled={phase === "loading"}
          onClick={() => loadPage(posts.length)}
        >
          {phase === "loading" ? "読み込み中…" : "もっと見る"}
        </button>
      ) : null}
    </div>
  );
}
