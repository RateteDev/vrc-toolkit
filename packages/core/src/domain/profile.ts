// Profile edit validation for MyCardModal's bio/bioLinks form (bio itself is
// public, unlike notes, so it never gets the notes newline-sentinel encoding).

// VRChat's documented profile bio field limit (unofficial API spec).
export const MAX_BIO_LENGTH = 512;

// Max bioLinks slots the official profile UI exposes.
export const MAX_BIO_LINKS = 3;

// Reject a bio over the length limit; otherwise pass it through unmodified
// (raw newlines are preserved, matching how the API round-trips bio).
export function validateBio(bio: string): string {
  if (bio.length > MAX_BIO_LENGTH) {
    throw new Error(`bio は ${MAX_BIO_LENGTH} 文字以内で入力してください`);
  }
  return bio;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Drop empty input slots, enforce the max slot count, and require each
// remaining entry to be an http(s) URL (matches BioLinkCards, which only
// renders http(s) links as clickable).
export function validateBioLinks(urls: string[]): string[] {
  const nonEmpty = urls.map((u) => u.trim()).filter((u) => u.length > 0);
  if (nonEmpty.length > MAX_BIO_LINKS) {
    throw new Error(`リンクは最大${MAX_BIO_LINKS}件までです`);
  }
  for (const url of nonEmpty) {
    if (!isHttpUrl(url)) {
      throw new Error(`リンクは http(s) の URL のみ指定できます: ${url}`);
    }
  }
  return nonEmpty;
}
