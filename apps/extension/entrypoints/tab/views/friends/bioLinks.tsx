// Profile bio links rendered as uniform icon tiles. Icons come from Google's
// favicon service via plain <img> (browser HTTP cache, no extra host
// permissions; only the domain is sent, never the full URL). When Google has
// no real icon it serves a 16px generic globe; that (and any load error) falls
// back to the bundled Tabler world glyph (tinted via CSS mask, see
// .biolink-noicon). Hover / keyboard focus raises a custom popover with the
// @handle (or service name) and the full destination URL; native title is
// intentionally absent on links so the two tooltips never stack. Touch has no
// hover: URL preview stays with the browser's native long-press menu, which a
// long-press tooltip would otherwise hijack.

import { useRef, useState } from "react";
import { resolveLinkMeta } from "./linkMeta";

// Popover clearance from the modal sheet's left/right edges.
const TIP_MARGIN_PX = 12;

function LinkTile({ url }: { url: string }) {
  const meta = resolveLinkMeta(url);
  const [broken, setBroken] = useState(false);
  const tileRef = useRef<HTMLAnchorElement | null>(null);
  const tipRef = useRef<HTMLSpanElement | null>(null);
  const label = meta.serviceName ?? meta.host;
  const ariaLabel = meta.handle ? `${label} ${meta.handle}` : label;

  // CSS alone cannot know a tile's distance to the sheet edge, so on each
  // show, measure and shift the (still invisible) popover to stay inside the
  // sheet; the arrow gets the opposite shift to keep pointing at the tile.
  const positionTip = () => {
    const tile = tileRef.current;
    const tip = tipRef.current;
    const sheet = tile?.closest(".sheet");
    if (!tile || !tip || !sheet) return;
    const tileRect = tile.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();
    const width = tip.offsetWidth;
    const centered = tileRect.left + tileRect.width / 2 - width / 2;
    const min = sheetRect.left + TIP_MARGIN_PX;
    const max = sheetRect.right - TIP_MARGIN_PX - width;
    const shift = Math.min(Math.max(centered, min), Math.max(min, max)) - centered;
    tile.style.setProperty("--tip-shift", `${shift}px`);
    tile.style.setProperty("--arrow-shift", `${-shift}px`);
  };

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
  // renderer. Other schemes (javascript:, data:) render as a non-clickable
  // tile, which keeps the native title since it has no popover.
  return meta.faviconUrl ? (
    <a
      ref={tileRef}
      className="biolink"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onMouseEnter={positionTip}
      onFocus={positionTip}
    >
      {icon}
      <span ref={tipRef} className="biolink-tip" aria-hidden="true">
        <span className="biolink-tip-main">{meta.handle ?? label}</span>
        <span className="biolink-tip-url">{url}</span>
      </span>
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
