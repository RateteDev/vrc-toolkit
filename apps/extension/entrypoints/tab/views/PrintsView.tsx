import { useState } from "react";
import { ManageSection } from "./prints/ManageSection";
import { UploadModal } from "./prints/UploadModal";

export function PrintsView() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <ManageSection refreshToken={refreshToken} onOpenUpload={() => setUploadOpen(true)} />
      {uploadOpen ? (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={() => setRefreshToken((n) => n + 1)}
        />
      ) : null}
    </>
  );
}
