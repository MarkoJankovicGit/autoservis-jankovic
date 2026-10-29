"use client";

import { useRouter } from "next/navigation";
import { PhotoGrid, type GridPhoto } from "@/components/photos/photo-grid";
import { PhotoUploader } from "@/components/photos/photo-uploader";
import type { AttachmentCategory } from "@/domain/model";
import { removePhoto } from "../actions";

export function OrderPhotos({ orderId, photos, defaultCategory }: { orderId: string; photos: GridPhoto[]; defaultCategory: AttachmentCategory }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <PhotoGrid
        photos={photos}
        onDelete={async (id) => {
          await removePhoto(orderId, id);
          router.refresh();
        }}
      />
      <PhotoUploader orderId={orderId} defaultCategory={defaultCategory} />
    </div>
  );
}
