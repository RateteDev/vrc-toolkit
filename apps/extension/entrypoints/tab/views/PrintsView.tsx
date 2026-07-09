import { type MutableRefObject, useState } from "react";
import type { PasteHandler } from "../Layout";
import { ManageSection } from "./prints/ManageSection";
import { UploadSection } from "./prints/UploadSection";

interface PrintsViewProps {
  onPasteRef: MutableRefObject<PasteHandler | null>;
}

export function PrintsView({ onPasteRef }: PrintsViewProps) {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <>
      <UploadSection onUploaded={() => setRefreshToken((n) => n + 1)} onPasteRef={onPasteRef} />
      <ManageSection refreshToken={refreshToken} />
    </>
  );
}
