import type { ImageTag, InventoryType } from "@vrc-toolkit/core/domain";
import type { MutableRefObject } from "react";
import { useCallback, useState } from "react";
import type { PasteHandler } from "../Layout";
import { StickerInventoryCard } from "./stickers/StickerInventoryCard";
import { StickerUploadCard } from "./stickers/StickerUploadCard";

interface StickersViewProps {
  onPasteRef: MutableRefObject<PasteHandler | null>;
}

export function StickersView({ onPasteRef }: StickersViewProps) {
  const [invType, setInvType] = useState<InventoryType>("sticker");
  const [reloadNonce, setReloadNonce] = useState(0);

  // A successful sticker/emoji upload jumps the inventory card to the
  // matching tab and forces a refetch, mirroring the old client-script's
  // post-upload `invType = params.tag; loadInventory()`.
  const handleUploaded = useCallback((tag: ImageTag) => {
    if (tag !== "sticker" && tag !== "emoji") return;
    setInvType(tag);
    setReloadNonce((n) => n + 1);
  }, []);

  return (
    <section id="view-images">
      <StickerUploadCard onUploaded={handleUploaded} onPasteRef={onPasteRef} />
      <StickerInventoryCard
        invType={invType}
        onInvTypeChange={setInvType}
        reloadNonce={reloadNonce}
      />
    </section>
  );
}
