import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { FilesResource } from "./files";

describe("FilesResource.uploadImage", () => {
  test("POST /file/image multipart: 'file' field + tag, no animation fields", async () => {
    const { transport, calls } = recorder(replyJson({ id: "file_1", ownerId: "usr_1" }));
    await new FilesResource(transport).uploadImage({
      blob: new Blob(["x"], { type: "image/png" }),
      filename: "sticker.png",
      tag: "sticker",
    });
    expect(calls[0]?.path).toBe("/file/image");
    expect(calls[0]?.init?.method).toBe("POST");
    const form = calls[0]?.init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect((form.get("file") as File).name).toBe("sticker.png");
    expect(form.get("tag")).toBe("sticker");
    expect(form.has("frames")).toBe(false);
  });

  test("appends animation fields when provided", async () => {
    const { transport, calls } = recorder(replyJson({ id: "file_1" }));
    await new FilesResource(transport).uploadImage({
      blob: new Blob(["x"]),
      filename: "anim.png",
      tag: "emojianimated",
      animation: {
        frames: 4,
        framesOverTime: 2,
        animationStyle: "linear",
        loopStyle: "pingpong",
        maskTag: "square",
      },
    });
    const form = calls[0]?.init?.body as FormData;
    expect(form.get("frames")).toBe("4");
    expect(form.get("framesOverTime")).toBe("2");
    expect(form.get("animationStyle")).toBe("linear");
    expect(form.get("loopStyle")).toBe("pingpong");
    expect(form.get("maskTag")).toBe("square");
  });
});

describe("FilesResource.fetchFile", () => {
  test("GET /file/{fileId}/{version}/file, returns the raw Response", async () => {
    const { transport, calls } = recorder(() => new Response("bytes", { status: 200 }));
    const res = await new FilesResource(transport).fetchFile("file_1", 3);
    expect(calls[0]?.path).toBe("/file/file_1/3/file");
    expect(res).toBeInstanceOf(Response);
    expect(await res.text()).toBe("bytes");
  });
});
