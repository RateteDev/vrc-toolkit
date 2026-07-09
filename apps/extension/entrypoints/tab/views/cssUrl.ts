// Escape a URL for safe use inside CSS `url("...")`. Prevents a malicious or
// malformed URL from breaking out of the double-quoted context.
export function cssUrl(url: string): string {
  return `url("${url.replace(/["\\()]/g, encodeURIComponent)}")`;
}
