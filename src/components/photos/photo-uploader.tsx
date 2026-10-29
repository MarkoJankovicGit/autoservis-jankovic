"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, CheckCircle2, CircleAlert, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_CATEGORY_LABELS, type AttachmentCategory } from "@/domain/model";
import { compressImage } from "./compress";

type Job = { key: string; file: File; status: "compress" | "upload" | "done" | "error"; progress: number; error?: string };

const CATEGORIES: AttachmentCategory[] = ["before", "after", "part", "document", "other"];
const PARALLEL = 3;

function upload(orderId: string, job: Job, category: string, onProgress: (p: number) => void): Promise<void> {
  return compressImage(job.file).then(
    (c) =>
      new Promise<void>((resolve, reject) => {
        const fd = new FormData();
        fd.append("file", c.main, "foto.jpg");
        fd.append("thumb", c.thumb, "thumb.jpg");
        fd.append("width", String(c.width));
        fd.append("height", String(c.height));
        fd.append("category", category);
        fd.append("name", job.file.name);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/nalozi/${orderId}/fotografije`);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          if (xhr.status === 201) return resolve();
          let msg = "Slanje nije uspelo.";
          try {
            msg = JSON.parse(xhr.responseText).error ?? msg;
          } catch {}
          reject(new Error(msg));
        };
        xhr.onerror = () => reject(new Error("Nema veze sa serverom. Pokušaj ponovo."));
        xhr.send(fd);
      }),
  );
}

/** Dodavanje fotografija na nalog: kamera ili galerija, više odjednom, napredak po fajlu. */
export function PhotoUploader({ orderId, defaultCategory = "before" }: { orderId: string; defaultCategory?: AttachmentCategory }) {
  const router = useRouter();
  const [category, setCategory] = useState<AttachmentCategory>(defaultCategory);
  const [jobs, setJobs] = useState<Job[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const patch = (key: string, p: Partial<Job>) => setJobs((all) => all.map((j) => (j.key === key ? { ...j, ...p } : j)));

  async function run(list: Job[]) {
    const queue = [...list];
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const k = job.key;
        patch(k, { status: "compress", progress: 0, error: undefined });
        try {
          await upload(orderId, job, category, (p) => patch(k, { status: "upload", progress: p }));
          patch(k, { status: "done", progress: 100 });
        } catch (e) {
          patch(k, { status: "error", error: (e as Error).message });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, list.length) }, worker));
    router.refresh();
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list: Job[] = Array.from(files).map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, status: "compress", progress: 0 }));
    setJobs((all) => [...all.filter((j) => j.status !== "done"), ...list]);
    void run(list);
  }

  const active = jobs.filter((j) => j.status !== "done").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Vrsta fotografije">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-sm font-medium",
              category === c ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {ATTACHMENT_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button type="button" size="xl" onClick={() => camRef.current?.click()}>
          <Camera aria-hidden />
          Slikaj
        </Button>
        <Button type="button" size="xl" variant="outline" onClick={() => galRef.current?.click()}>
          <ImagePlus aria-hidden />
          Iz galerije
        </Button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        <input ref={galRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {jobs.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.key} className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              {j.status === "done" ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : j.status === "error" ? (
                <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden />
              ) : (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">{j.file.name}</span>
              <span className={cn("shrink-0 tabular", j.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                {j.status === "compress" ? "smanjujem…" : j.status === "upload" ? `${j.progress} %` : j.status === "done" ? "sačuvano" : j.error}
              </span>
              {j.status === "error" && (
                <button type="button" onClick={() => void run([j])} aria-label={`Pokušaj ponovo ${j.file.name}`} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted">
                  <RotateCcw className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {active > 0 && <p className="text-sm text-muted-foreground">Šaljem slike ({active})…</p>}
    </div>
  );
}
