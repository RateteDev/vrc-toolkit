// Files namespace: raw file operations (image upload, file byte fetch). No
// proxy-path rewriting — URLs and Responses are returned untouched.

import { VrcResource } from "../resource";

// Animation fields, only valid (and required) for the animated image tag
// ("emojianimated").
export interface ImageAnimationFields {
  frames: number;
  framesOverTime: number;
  animationStyle?: string;
  loopStyle?: string;
  maskTag?: string;
}

export interface ImageUploadInput {
  blob: Blob;
  filename: string;
  tag: string;
  animation?: ImageAnimationFields;
}

// Raw POST /file/image response (subset).
export interface ImageUploadResponse {
  id?: string;
  ownerId?: string;
}

export class FilesResource extends VrcResource {
  // POST /file/image (multipart/form-data). Uploads an arbitrary image with an
  // ImagePurpose `tag`. NOTE: the file field is 'file' here (Prints use 'image')
  // and the path is /file/image. Animation fields are only appended when the
  // caller supplies them. Returns the raw upload response.
  uploadImage(input: ImageUploadInput): Promise<ImageUploadResponse | null> {
    const form = new FormData();
    form.append("file", input.blob, input.filename);
    form.append("tag", input.tag);
    if (input.animation) {
      form.append("frames", String(input.animation.frames));
      form.append("framesOverTime", String(input.animation.framesOverTime));
      if (input.animation.animationStyle !== undefined) {
        form.append("animationStyle", input.animation.animationStyle);
      }
      if (input.animation.loopStyle !== undefined) {
        form.append("loopStyle", input.animation.loopStyle);
      }
      if (input.animation.maskTag !== undefined) {
        form.append("maskTag", input.animation.maskTag);
      }
    }
    return this.request<ImageUploadResponse>("/file/image", { method: "POST", body: form });
  }

  // GET /file/{fileId}/{version}/file — the raw file bytes. Returns the transport
  // Response untouched (binary body; no JSON parsing, no proxy-path rewriting).
  // The caller inspects status and streams the body.
  fetchFile(fileId: string, version: string | number): Promise<Response> {
    const v = encodeURIComponent(String(version));
    return this.transport.fetch(`/file/${encodeURIComponent(fileId)}/${v}/file`);
  }
}
