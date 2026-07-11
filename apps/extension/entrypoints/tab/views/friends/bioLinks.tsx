// Profile bio links rendered as a square-card grid keyed by recognized service.
//
// Icons are resolved locally by domain — no favicon or external image request is
// ever made from a friend's arbitrary bio URL (that would leak the viewer's IP
// to third parties and force a looser CSP). Each known service gets a bundled
// monogram tile in its brand color; unknown hosts fall back to a neutral globe
// tile labeled with the hostname. To upgrade a monogram to a true Simple Icons
// glyph later, add an `svg` path to the matching SERVICES entry and render it in
// place of the monogram.

interface Service {
  name: string;
  color: string;
  // Matched against the lowercased hostname (without leading "www.").
  match: RegExp;
}

const SERVICES: Service[] = [
  { name: "X", color: "#000000", match: /^(twitter|x)\.com$/ },
  { name: "Bluesky", color: "#1185fe", match: /(^|\.)bsky\.app$/ },
  { name: "Misskey", color: "#86b300", match: /(^|\.)misskey\.io$/ },
  { name: "Mastodon", color: "#6364ff", match: /(^|\.)(mastodon|mstdn)\./ },
  { name: "Discord", color: "#5865f2", match: /(^|\.)(discord\.(gg|com)|discordapp\.com)$/ },
  { name: "YouTube", color: "#ff0000", match: /(^|\.)(youtube\.com|youtu\.be)$/ },
  { name: "Twitch", color: "#9146ff", match: /(^|\.)twitch\.tv$/ },
  { name: "niconico", color: "#252525", match: /(^|\.)(nicovideo\.jp|nico\.ms)$/ },
  { name: "Instagram", color: "#e4405f", match: /(^|\.)instagram\.com$/ },
  { name: "TikTok", color: "#010101", match: /(^|\.)tiktok\.com$/ },
  { name: "GitHub", color: "#181717", match: /(^|\.)github\.(com|io)$/ },
  { name: "Steam", color: "#171a21", match: /(^|\.)(steamcommunity\.com|steampowered\.com)$/ },
  { name: "BOOTH", color: "#fc4d50", match: /(^|\.)booth\.pm$/ },
  { name: "pixiv", color: "#0096fa", match: /(^|\.)pixiv\.net$/ },
  { name: "FANBOX", color: "#e08e39", match: /(^|\.)fanbox\.cc$/ },
  { name: "Fantia", color: "#e4007f", match: /(^|\.)fantia\.jp$/ },
  { name: "Skeb", color: "#0e1e33", match: /(^|\.)skeb\.jp$/ },
  { name: "Patreon", color: "#ff424d", match: /(^|\.)patreon\.com$/ },
  { name: "Ko-fi", color: "#ff5e5b", match: /(^|\.)ko-fi\.com$/ },
  { name: "note", color: "#41c9b4", match: /(^|\.)note\.com$/ },
  { name: "マシュマロ", color: "#ffd43b", match: /(^|\.)marshmallow-qa\.com$/ },
  { name: "Linktree", color: "#43e660", match: /(^|\.)linktr\.ee$/ },
  { name: "lit.link", color: "#000000", match: /(^|\.)lit\.link$/ },
  { name: "SoundCloud", color: "#ff5500", match: /(^|\.)soundcloud\.com$/ },
  { name: "Spotify", color: "#1db954", match: /(^|\.)spotify\.com$/ },
  { name: "VRChat", color: "#1778ff", match: /(^|\.)vrchat\.com$/ },
];

interface Resolved {
  name: string;
  color: string;
  host: string;
  monogram: string;
  known: boolean;
}

function resolve(url: string): Resolved {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    host = url;
  }
  for (const s of SERVICES) {
    if (s.match.test(host)) {
      return {
        name: s.name,
        color: s.color,
        host,
        monogram: s.name.charAt(0).toUpperCase(),
        known: true,
      };
    }
  }
  return {
    name: host || url,
    color: "#8a7f6c",
    host: host || url,
    monogram: (host || "?").charAt(0).toUpperCase(),
    known: false,
  };
}

function GlobeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  );
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function BioLinkCards({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="biolinks">
      {urls.map((url, i) => {
        const r = resolve(url);
        const badge = (
          <>
            <span className="biolink-badge" style={{ background: r.color }}>
              {r.known ? r.monogram : <GlobeIcon />}
            </span>
            <span className="biolink-name">{r.name}</span>
            <span className="biolink-host">{r.host}</span>
          </>
        );
        // A bio link is user-controlled: only follow http(s), matching the
        // markdown renderer. Other schemes (javascript:, data:) render as a
        // non-clickable tile. Keys are index-suffixed since bio links may repeat.
        const key = `${url}-${i}`;
        return isHttpUrl(url) ? (
          <a
            key={key}
            className="biolink"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
          >
            {badge}
          </a>
        ) : (
          <span key={key} className="biolink" title={url}>
            {badge}
          </span>
        );
      })}
    </div>
  );
}
