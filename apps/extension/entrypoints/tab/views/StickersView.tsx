import type { ImageTag, InventoryType } from "@vrc-toolkit/core/domain";
import { useCallback, useState } from "react";
import { StickerInventoryCard } from "./stickers/StickerInventoryCard";
import { StickerUploadModal } from "./stickers/StickerUploadModal";

export function StickersView() {
  const [invType, setInvType] = useState<InventoryType>("sticker");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  // A successful sticker/emoji upload jumps the inventory to the matching tab
  // and forces a refetch.
  const handleUploaded = useCallback((tag: ImageTag) => {
    if (tag !== "sticker" && tag !== "emoji") return;
    setInvType(tag);
    setReloadNonce((n) => n + 1);
  }, []);

  return (
    <section id="view-images">
      <StickerInventoryCard
        invType={invType}
        onInvTypeChange={setInvType}
        reloadNonce={reloadNonce}
        onOpenUpload={() => setUploadOpen(true)}
      />
      {uploadOpen ? (
        <StickerUploadModal onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />
      ) : null}
    </section>
  );
}
