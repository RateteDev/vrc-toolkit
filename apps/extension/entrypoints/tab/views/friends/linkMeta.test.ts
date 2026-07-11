// resolveLinkMeta(url): pure URL → display-metadata mapping for bio link
// tiles (favicon URL, service name, extracted @handle). No network access.

import { describe, expect, it } from "bun:test";
import { resolveLinkMeta } from "./linkMeta";

describe("resolveLinkMeta: host & favicon", () => {
  it("strips www and lowercases the host", () => {
    const m = resolveLinkMeta("https://WWW.Example.COM/whatever");
    expect(m.host).toBe("example.com");
    expect(m.faviconUrl).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=64");
  });

  it("keeps a known service name", () => {
    expect(resolveLinkMeta("https://x.com/somebody").serviceName).toBe("X");
    expect(resolveLinkMeta("https://booth.pm/ja/items/123").serviceName).toBe("BOOTH");
  });

  it("uses the host as the label for unknown services", () => {
    const m = resolveLinkMeta("https://blog.example.net/post/1");
    expect(m.serviceName).toBeNull();
    expect(m.host).toBe("blog.example.net");
  });

  it("yields no favicon for non-http(s) schemes", () => {
    const m = resolveLinkMeta("javascript:alert(1)");
    expect(m.faviconUrl).toBeNull();
  });
});

describe("resolveLinkMeta: handle extraction", () => {
  it("extracts @handle from X / Twitter profile paths", () => {
    expect(resolveLinkMeta("https://x.com/ratete").handle).toBe("@ratete");
    expect(resolveLinkMeta("https://twitter.com/ratete/").handle).toBe("@ratete");
    expect(resolveLinkMeta("https://x.com/ratete/status/123").handle).toBe("@ratete");
  });

  it("ignores X non-profile paths", () => {
    expect(resolveLinkMeta("https://x.com/intent/follow?screen_name=a").handle).toBeNull();
    expect(resolveLinkMeta("https://x.com/").handle).toBeNull();
  });

  it("extracts from GitHub user/org paths", () => {
    expect(resolveLinkMeta("https://github.com/RateteDev").handle).toBe("@RateteDev");
    expect(resolveLinkMeta("https://github.com/RateteDev/repo").handle).toBe("@RateteDev");
  });

  it("extracts from Instagram profile paths, skipping content paths", () => {
    expect(resolveLinkMeta("https://instagram.com/some_user").handle).toBe("@some_user");
    expect(resolveLinkMeta("https://www.instagram.com/p/abc123/").handle).toBeNull();
  });

  it("extracts the BOOTH shop subdomain", () => {
    expect(resolveLinkMeta("https://ratete.booth.pm/").handle).toBe("@ratete");
    expect(resolveLinkMeta("https://booth.pm/ja/items/123").handle).toBeNull();
  });

  it("extracts YouTube @channels only", () => {
    expect(resolveLinkMeta("https://www.youtube.com/@somechannel").handle).toBe("@somechannel");
    expect(resolveLinkMeta("https://www.youtube.com/watch?v=abc").handle).toBeNull();
    expect(resolveLinkMeta("https://youtu.be/abc").handle).toBeNull();
  });

  it("extracts Twitch channel paths", () => {
    expect(resolveLinkMeta("https://twitch.tv/somestreamer").handle).toBe("@somestreamer");
    expect(resolveLinkMeta("https://www.twitch.tv/directory/game/x").handle).toBeNull();
  });

  it("extracts Bluesky profile paths", () => {
    expect(resolveLinkMeta("https://bsky.app/profile/user.bsky.social").handle).toBe(
      "@user.bsky.social",
    );
    expect(resolveLinkMeta("https://bsky.app/feeds").handle).toBeNull();
  });

  it("never extracts a handle for unknown services", () => {
    expect(resolveLinkMeta("https://blog.example.net/ratete").handle).toBeNull();
  });

  it("does not double the @ when the path already carries one", () => {
    expect(resolveLinkMeta("https://x.com/@ratete").handle).toBe("@ratete");
  });
});
