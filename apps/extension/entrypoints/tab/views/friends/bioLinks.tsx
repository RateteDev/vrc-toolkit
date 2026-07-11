// Profile bio links rendered as uniform icon tiles. Icons come from Google's
// favicon service via plain <img> (browser HTTP cache, no extra host
// permissions; only the domain is sent, never the full URL). When Google has
// no real icon it serves a 16px generic globe; that (and any load error) falls
// back to the bundled Tabler world glyph (tinted via CSS mask, see
// .biolink-noicon). The destination URL — and the @handle when the URL is a
// recognizable profile — is shown on hover.

import { useState } from "react";
import { resolveLinkMeta } from "./linkMeta";

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
        // Google 404s hosts it doesn't know, but the 404 body is a decodable
        // 16px globe that Chrome renders (firing load, not error). Real icons
        // come back >=32px, so a <=16px natural size means this is the generic
        // fallback: swap it for our own glyph.
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 16) setBroken(true);
        }}
        onError={() => setBroken(true)}
      />
    ) : (
      <span className="biolink-icon biolink-noicon" aria-hidden="true" />
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
