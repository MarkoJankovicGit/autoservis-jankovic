"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_CATEGORY_LABELS, type AttachmentCategory } from "@/domain/model";

export type GridPhoto = { id: string; category: AttachmentCategory; width?: number; height?: number; caption?: string };

/**
 * Mreža sličica; klik otvara veću sliku sa listanjem i brisanjem (ako je dozvoljeno).
 * `basePath` menja izvor slika (javni karton ih služi preko svog tokena umesto privatne API rute).
 */
export function PhotoGrid({ photos, onDelete, basePath = "/api/fajlovi" }: { photos: GridPhoto[]; onDelete?: (id: string) => Promise<void>; basePath?: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  if (!photos.length) return null;
  const cur = index !== null ? photos[index] : null;
  const go = (d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setIndex(i)} className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <Image src={`${basePath}/${p.id}?v=t`} alt={ATTACHMENT_CATEGORY_LABELS[p.category]} fill unoptimized sizes="200px" className="object-cover transition-transform group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-left text-[0.7rem] font-medium text-white">
                {ATTACHMENT_CATEGORY_LABELS[p.category]}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={cur !== null} onOpenChange={(o) => !o && setIndex(null)}>
        {cur && (
          <DialogContent className="max-w-[calc(100%-1rem)] gap-3 p-3 sm:max-w-4xl">
            <DialogTitle className="text-base">
              {ATTACHMENT_CATEGORY_LABELS[cur.category]}
              {cur.caption && <span className="font-normal text-muted-foreground"> · {cur.caption}</span>}
            </DialogTitle>
            <DialogDescription className="sr-only">Fotografija {index! + 1} od {photos.length}</DialogDescription>
            <div className="relative flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element -- privatna slika iz API rute, bez optimizacije */}
              <img src={`${basePath}/${cur.id}`} alt={ATTACHMENT_CATEGORY_LABELS[cur.category]} className="max-h-[70vh] w-auto object-contain" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon-lg" className="size-11" onClick={() => go(-1)} aria-label="Prethodna">
                  <ChevronLeft aria-hidden />
                </Button>
                <Button type="button" variant="outline" size="icon-lg" className="size-11" onClick={() => go(1)} aria-label="Sledeća">
                  <ChevronRight aria-hidden />
                </Button>
                <span className="self-center text-sm text-muted-foreground tabular">
                  {index! + 1} / {photos.length}
                </span>
              </div>
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={async () => {
                    if (!confirm("Obrisati fotografiju?")) return;
                    setBusy(true);
                    try {
                      await onDelete(cur.id);
                      setIndex(photos.length > 1 ? Math.min(index!, photos.length - 2) : null);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 aria-hidden />
                  Obriši
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
