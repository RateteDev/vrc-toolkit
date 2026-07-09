// Shared types for the Prints tab's upload queue and crop flow.

export type UploadStatus = "pending" | "uploading" | "done" | "error";

// One image queued for upload: the source file, its crop framing (matches
// domain/crop's CropItem shape: natW/natH/zoom/ncx/ncy), and the per-print
// metadata fields edited in the crop modal.
export interface UploadItem {
  id: number;
  file: File;
  url: string;
  natW: number;
  natH: number;
  ncx: number;
  ncy: number;
  zoom: number;
  note: string;
  worldId: string;
  worldName: string;
  status: UploadStatus;
  resultId: string | null;
  error: string | null;
}

export const MAX_UPLOAD_ITEMS = 20;
