import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import type { RawUserNote } from "./notes";
import { NotesResource } from "./notes";

describe("NotesResource.list", () => {
  test("no params -> bare /userNotes", async () => {
    const { transport, calls } = recorder(replyJson([]));
    await new NotesResource(transport).list();
    expect(calls[0]?.path).toBe("/userNotes");
  });

  test("builds the n/offset query string", async () => {
    const { transport, calls } = recorder(replyJson([]));
    await new NotesResource(transport).list({ n: 100, offset: 0 });
    expect(calls[0]?.path).toBe("/userNotes?n=100&offset=0");
  });
});

describe("NotesResource.listAll", () => {
  test("pages with n=100 until a short page", async () => {
    const fullPage: RawUserNote[] = Array.from({ length: 100 }, (_, i) => ({ id: `n${i}` }));
    const { transport, calls } = recorder(({ path }) => {
      const offset = new URL(`https://x${path}`).searchParams.get("offset");
      const body = offset === "0" ? fullPage : [{ id: "last" }];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const all = await new NotesResource(transport).listAll();
    expect(all).toHaveLength(101);
    expect(calls.map((c) => c.path)).toEqual([
      "/userNotes?n=100&offset=0",
      "/userNotes?n=100&offset=100",
    ]);
  });
});

describe("NotesResource.upsert", () => {
  test("POST /userNotes with JSON { targetUserId, note }", async () => {
    const { transport, calls } = recorder(replyJson({ id: "note_1" }));
    await new NotesResource(transport).upsert({ targetUserId: "usr_1", note: "hello" });
    expect(calls[0]?.path).toBe("/userNotes");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(new Headers(calls[0]?.init?.headers).get("content-type")).toBe("application/json");
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ targetUserId: "usr_1", note: "hello" }));
  });

  test("passes an empty note through verbatim (VRChat treats '' as delete)", async () => {
    const { transport, calls } = recorder(replyJson(null));
    await new NotesResource(transport).upsert({ targetUserId: "usr_1", note: "" });
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ targetUserId: "usr_1", note: "" }));
  });
});
