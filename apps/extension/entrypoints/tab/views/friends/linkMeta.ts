// Pure URL → display-metadata mapping for bio link tiles. Icons come from
// Google's favicon service (domain-only query; the full URL is never sent),
// so every host gets a real icon and unknown hosts get Google's generic
// globe fallback. Handles are extracted only for services whose profile URL
// shape is unambiguous.
//
// Why Google's favicon service instead of bundled per-service icons — a
// deliberate reversal of the earlier no-external-request design:
// 1. What leaks is viewer metadata: Google can observe which domains appear
//    in the profiles this viewer opens. Domain-only and mostly mainstream
//    hosts, so identifiability is low — accepted as negligible for a
//    personal tool. Re-evaluate if this ever ships to a wider audience.
// 2. Bundled icons cannot keep up with service rebrands and new services;
//    maintaining them is recurring cost for purely cosmetic data.
// 3. Delegating to the single most universal favicon endpoint keeps the
//    implementation simple: one URL scheme, zero per-service assets. The
//    tradeoff is a dependency on Google's response behavior (see the
//    generic-globe detection heuristic in bioLinks).

export interface LinkMeta {
  // Lowercased hostname without a leading "www."; the raw input if unparseable.
  host: string;
  // Known service name, or null for unrecognized hosts.
  serviceName: string | null;
  // "@name" when the URL is a recognizable profile URL, else null.
  handle: string | null;
  // Google favicon endpoint for the host; null for non-http(s) inputs.
  faviconUrl: string | null;
}

interface Service {
  name: string;
  // Matched against the lowercased hostname (without leading "www.").
  match: RegExp;
  // Extract a bare handle (no "@") from the parsed URL, or null.
  handle?: (url: URL, host: string) => string | null;
}

// Path segments that are app routes, not profile names, on first-segment sites.
const X_RESERVED = new Set(["i", "intent", "share", "search", "home", "hashtag", "settings"]);
const INSTAGRAM_RESERVED = new Set(["p", "reel", "reels", "stories", "explore"]);
const TWITCH_RESERVED = new Set(["directory", "videos", "downloads", "p"]);

function firstSegment(url: URL, reserved: Set<string>): string | null {
  const seg = url.pathname.split("/").filter(Boolean)[0];
  if (!seg || reserved.has(seg.toLowerCase())) return null;
  return decodeURIComponent(seg);
}

const SERVICES: Service[] = [
  {
    name: "X",
    match: /^(twitter|x)\.com$/,
    handle: (url) => firstSegment(url, X_RESERVED),
  },
  {
    name: "Bluesky",
    match: /(^|\.)bsky\.app$/,
    handle: (url) => {
      const segs = url.pathname.split("/").filter(Boolean);
      return segs[0] === "profile" && segs[1] ? decodeURIComponent(segs[1]) : null;
    },
  },
  { name: "Misskey", match: /(^|\.)misskey\.io$/ },
  { name: "Mastodon", match: /(^|\.)(mastodon|mstdn)\./ },
  { name: "Discord", match: /(^|\.)(discord\.(gg|com)|discordapp\.com)$/ },
  {
    name: "YouTube",
    match: /(^|\.)(youtube\.com|youtu\.be)$/,
    handle: (url) => {
      const seg = url.pathname.split("/").filter(Boolean)[0];
      return seg?.startsWith("@") ? decodeURIComponent(seg.slice(1)) : null;
    },
  },
  {
    name: "Twitch",
    match: /(^|\.)twitch\.tv$/,
    handle: (url) => firstSegment(url, TWITCH_RESERVED),
  },
  { name: "niconico", match: /(^|\.)(nicovideo\.jp|nico\.ms)$/ },
  {
    name: "Instagram",
    match: /(^|\.)instagram\.com$/,
    handle: (url) => firstSegment(url, INSTAGRAM_RESERVED),
  },
  { name: "TikTok", match: /(^|\.)tiktok\.com$/ },
  {
    name: "GitHub",
    match: /(^|\.)github\.(com|io)$/,
    handle: (url, host) => (host === "github.com" ? firstSegment(url, new Set()) : null),
  },
  { name: "Steam", match: /(^|\.)(steamcommunity\.com|steampowered\.com)$/ },
  {
    name: "BOOTH",
    match: /(^|\.)booth\.pm$/,
    handle: (_url, host) => {
      const sub = host.replace(/\.?booth\.pm$/, "");
      return sub ? sub : null;
    },
  },
  { name: "pixiv", match: /(^|\.)pixiv\.net$/ },
  { name: "FANBOX", match: /(^|\.)fanbox\.cc$/ },
  { name: "Fantia", match: /(^|\.)fantia\.jp$/ },
  { name: "Skeb", match: /(^|\.)skeb\.jp$/ },
  { name: "Patreon", match: /(^|\.)patreon\.com$/ },
  { name: "Ko-fi", match: /(^|\.)ko-fi\.com$/ },
  { name: "note", match: /(^|\.)note\.com$/ },
  { name: "マシュマロ", match: /(^|\.)marshmallow-qa\.com$/ },
  { name: "Linktree", match: /(^|\.)linktr\.ee$/ },
  { name: "lit.link", match: /(^|\.)lit\.link$/ },
  { name: "SoundCloud", match: /(^|\.)soundcloud\.com$/ },
  { name: "Spotify", match: /(^|\.)spotify\.com$/ },
  { name: "VRChat", match: /(^|\.)vrchat\.com$/ },
];

export function resolveLinkMeta(raw: string): LinkMeta {
  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    url = null;
  }
  const isHttp = url !== null && (url.protocol === "https:" || url.protocol === "http:");
  const host = url ? url.hostname.toLowerCase().replace(/^www\./, "") : raw;

  let serviceName: string | null = null;
  let handle: string | null = null;
  if (url && isHttp) {
    for (const s of SERVICES) {
      if (!s.match.test(host)) continue;
      serviceName = s.name;
      const bare = s.handle ? s.handle(url, host) : null;
      handle = bare ? `@${bare.replace(/^@/, "")}` : null;
      break;
    }
  }

  return {
    host,
    serviceName,
    handle,
    faviconUrl: isHttp
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
      : null,
  };
}
