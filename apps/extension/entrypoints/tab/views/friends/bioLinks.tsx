// Profile bio links rendered as uniform icon tiles. Icons come from Google's
// favicon service via plain <img> (browser HTTP cache, no extra host
// permissions; only the domain is sent, never the full URL). On load failure
// the tile falls back to a crisp vector globe. The destination URL — and the
// @handle when the URL is a recognizable profile — is shown on hover.

import { useState } from "react";
import { resolveLinkMeta } from "./linkMeta";

// Fallback for links whose host exposes no favicon (Google returns HTTP 404,
// caught by the img onError below). A filled globe reads as a finished icon at
// tile size, unlike a thin outline; meridians are knocked out in the surface color.
function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <g fill="none" stroke="var(--surface)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M2.4 12h19.2" />
        <ellipse cx="12" cy="12" rx="4.3" ry="10" />
        <path d="M4.6 6.4c4.2 2.3 10.6 2.3 14.8 0M4.6 17.6c4.2-2.3 10.6-2.3 14.8 0" />
      </g>
    </svg>
  );
}

function LinkTile({ url }: { url: string }) {
  const meta = resolveLinkMeta(url);
  const [broken, setBroken] = useState(false);
  const label = meta.serviceName ?? meta.host;
  const ariaLabel = meta.handle ? `${label} ${meta.handle}` : label;
  // Hover tooltip: handle when known, plus the full destination URL.
  const title = meta.handle ? `${meta.handle} · ${url}` : url;

  const icon =
    meta.faviconUrl && !broken ? (
      <img
        className="biolink-icon"
        src={meta.faviconUrl}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
      />
    ) : (
      <span className="biolink-icon biolink-noicon">
        <GlobeIcon />
      </span>
    );

  // A bio link is user-controlled: only follow http(s), matching the markdown
  // renderer. Other schemes (javascript:, data:) render as a non-clickable tile.
  return meta.faviconUrl ? (
    <a
      className="biolink"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={ariaLabel}
    >
      {icon}
    </a>
  ) : (
    <span className="biolink" title={url}>
      {icon}
    </span>
  );
}

export function BioLinkCards({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="biolinks">
      {urls.map((url, i) => {
        // Keys are index-suffixed since bio links may repeat.
        const key = `${url}-${i}`;
        return <LinkTile key={key} url={url} />;
      })}
    </div>
  );
}
