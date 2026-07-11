// Profile bio links rendered as icon tiles. Icons come from Google's favicon
// service via plain <img> (browser HTTP cache, no extra host permissions;
// only the domain is sent, never the full URL). The destination URL is shown
// on hover via title; a recognizable profile URL also shows its @handle.

import { type LinkMeta, resolveLinkMeta } from "./linkMeta";

function GlobeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  );
}

function TileBody({ meta }: { meta: LinkMeta }) {
  return (
    <>
      {meta.faviconUrl ? (
        <img className="biolink-icon" src={meta.faviconUrl} alt="" loading="lazy" />
      ) : (
        <span className="biolink-icon biolink-noicon">
          <GlobeIcon />
        </span>
      )}
      {meta.handle ? <span className="biolink-handle">{meta.handle}</span> : null}
    </>
  );
}

export function BioLinkCards({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="biolinks">
      {urls.map((url, i) => {
        const meta = resolveLinkMeta(url);
        const label = meta.serviceName ?? meta.host;
        // A bio link is user-controlled: only follow http(s), matching the
        // markdown renderer. Other schemes (javascript:, data:) render as a
        // non-clickable tile. Keys are index-suffixed since bio links may repeat.
        const key = `${url}-${i}`;
        return meta.faviconUrl ? (
          <a
            key={key}
            className="biolink"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
            aria-label={meta.handle ? `${label} ${meta.handle}` : label}
          >
            <TileBody meta={meta} />
          </a>
        ) : (
          <span key={key} className="biolink" title={url}>
            <TileBody meta={meta} />
          </span>
        );
      })}
    </div>
  );
}
