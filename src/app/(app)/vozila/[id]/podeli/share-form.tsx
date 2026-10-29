"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, FileText, Link2, Plus, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";
import { Segmented } from "@/components/form/field";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { ATTACHMENT_CATEGORY_LABELS, type AttachmentCategory } from "@/domain/model";
import { DEFAULT_SHARE_DAYS, SHARE_DAYS, SHARE_DAYS_LABELS } from "@/domain/shares";
import { plural } from "@/domain/text";
import type { ShareOptions } from "@/server/shares";
import { createShare } from "./actions";

type Props = {
  vehicleId: string;
  vehicleLabel: string;
  shopName: string;
  orders: ShareOptions["orders"];
  openReminders: number;
  preselect?: string;
};

/**
 * Izbor šta mušterija vidi. Ništa nije čekirano unapred, osim naloga sa kog je majstor došao.
 * Fotografije se biraju tek kad je nalog izabran, jer idu uz njega.
 */
export function ShareForm({ vehicleId, vehicleLabel, shopName, orders, openReminders, preselect }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [orderIds, setOrderIds] = useState<string[]>(orders.some((o) => o.id === preselect) ? [preselect!] : []);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [prices, setPrices] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [days, setDays] = useState(String(DEFAULT_SHARE_DAYS));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ id: string; url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdf, setPdf] = useState<File | null>(null);

  // PDF se priprema čim je link napravljen, da „Pošalji PDF“ radi iz prvog dodira (telefon traži deljenje odmah po dodiru)
  useEffect(() => {
    if (!result) return;
    let alive = true;
    fetch(`/api/podeli/${result.id}/pdf`)
      .then(async (r) => {
        if (!r.ok) return;
        const name = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "Karton.pdf";
        const file = new File([await r.blob()], name, { type: "application/pdf" });
        if (alive) setPdf(file);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      setPdf(null);
    };
  }, [result]);

  const toggleOrder = (id: string, on: boolean) => {
    setOrderIds((xs) => (on ? [...xs, id] : xs.filter((x) => x !== id)));
    if (!on) {
      const own = new Set(orders.find((o) => o.id === id)?.photos.map((p) => p.id));
      setPhotoIds((xs) => xs.filter((x) => !own.has(x)));
    }
  };
  const togglePhoto = (id: string, on: boolean) => setPhotoIds((xs) => (on ? [...xs, id] : xs.filter((x) => x !== id)));
  const nothing = !orderIds.length && !reminders;
  const message = (r: { url: string; expiresAt: string }) => `${shopName}: pregled radova na vozilu ${vehicleLabel}. Link važi do ${formatDate(r.expiresAt)}\n${r.url}`;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createShare(fd);
      if (r.id && r.token && r.expiresAt) {
        setErrors({});
        setResult({ id: r.id, url: `${window.location.origin}/k/${r.token}`, expiresAt: r.expiresAt });
        router.refresh();
      } else setErrors(r.errors ?? { form: "Link nije napravljen." });
    });
  };

  if (result) {
    const canShare = typeof navigator !== "undefined" && "share" in navigator;
    const canShareFile = canShare && !!navigator.canShare?.({ files: [pdf ?? new File([], "x.pdf", { type: "application/pdf" })] });
    const pdfHref = `/api/podeli/${result.id}/pdf`;
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-accent/40 p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Link je napravljen</h2>
          <p className="text-sm text-muted-foreground">Važi do {formatDate(result.expiresAt)}</p>
        </div>
        {errors.form && <Notice variant="error" title={errors.form} />}
        <p className="rounded-lg border bg-card px-3 py-2 font-mono text-xs break-all">{result.url}</p>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {canShare && (
            <Button type="button" size="xl" onClick={() => navigator.share({ title: `Pregled radova ${vehicleLabel}`, text: message(result) }).catch(() => undefined)}>
              <Share2 aria-hidden />
              Pošalji link
            </Button>
          )}
          {canShareFile && (
            <Button type="button" size="xl" disabled={!pdf} onClick={() => pdf && navigator.share({ title: `Pregled radova ${vehicleLabel}`, files: [pdf] }).catch(() => undefined)}>
              <FileText aria-hidden />
              {pdf ? "Pošalji PDF" : "Pripremam PDF…"}
            </Button>
          )}
          <Button
            type="button"
            size="xl"
            variant={canShare ? "outline" : "default"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message(result));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setErrors({ form: "Kopiranje nije dozvoljeno u ovom browseru; označi link i kopiraj ga ručno." });
              }
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Kopirano" : "Kopiraj poruku"}
          </Button>
          <Button asChild variant="outline" size="xl">
            <a href={pdfHref} target="_blank" rel="noreferrer">
              <FileText aria-hidden />
              {canShareFile ? "Otvori PDF" : "PDF"}
            </a>
          </Button>
          <Button asChild variant="outline" size="xl">
            <a href={result.url} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden />
              Pogledaj kao mušterija
            </a>
          </Button>
          <Button type="button" variant="ghost" size="xl" onClick={() => setResult(null)}>
            <Plus aria-hidden />
            Novi link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {errors.form && <Notice variant="error" title={errors.form} />}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Nalozi</legend>
        {orders.length === 0 && <p className="text-sm text-muted-foreground">Vozilo još nema naloga.</p>}
        {orders.map((o) => {
          const on = orderIds.includes(o.id);
          return (
            <div key={o.id} className={cn("rounded-xl border bg-card", on && "border-primary ring-1 ring-primary/30")}>
              <label className="flex cursor-pointer items-start gap-3 p-3 sm:p-4">
                <input type="checkbox" name="orderId[]" value={o.id} checked={on} onChange={(e) => toggleOrder(o.id, e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold tabular">{o.number}</span>
                    <span className="text-sm text-muted-foreground tabular">{formatDate(o.completedDate ?? o.receivedDate)}</span>
                    <span className={cn("text-xs font-semibold", o.status === "open" ? "text-warning" : "text-success")}>{o.status === "open" ? "u radu" : "završen"}</span>
                  </span>
                  <span className="block truncate text-sm">{o.complaint}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatMoney(o.total)}
                    {o.photos.length > 0 && ` · ${o.photos.length} ${plural(o.photos.length, "fotografija", "fotografije", "fotografija")}`}
                  </span>
                </span>
              </label>
              {on && o.photos.length > 0 && (
                <div className="border-t px-3 pt-3 pb-3 sm:px-4">
                  <p className="mb-2 text-sm font-medium">Fotografije uz ovaj nalog</p>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {o.photos.map((p) => {
                      const sel = photoIds.includes(p.id);
                      return (
                        <li key={p.id}>
                          <label className={cn("relative block aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted ring-offset-2 ring-offset-card", sel && "ring-2 ring-primary")}>
                            <Image src={`/api/fajlovi/${p.id}?v=t`} alt={ATTACHMENT_CATEGORY_LABELS[p.category as AttachmentCategory]} fill unoptimized sizes="160px" className={cn("object-cover", !sel && "opacity-60")} />
                            <input type="checkbox" name="photoId[]" value={p.id} checked={sel} onChange={(e) => togglePhoto(p.id, e.target.checked)} className="absolute top-1.5 left-1.5 size-5 accent-[var(--color-primary)]" />
                            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-[0.7rem] font-medium text-white">{ATTACHMENT_CATEGORY_LABELS[p.category as AttachmentCategory]}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">Prikaži i</legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="showPrices" value="1" checked={prices} onChange={(e) => setPrices(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" />
          <span>
            <span className="block font-medium">Cene</span>
          </span>
        </label>
        <label className={cn("flex items-start gap-3", openReminders ? "cursor-pointer" : "opacity-60")}>
          <input type="checkbox" name="showReminders" value="1" checked={reminders} disabled={!openReminders} onChange={(e) => setReminders(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" />
          <span>
            <span className="block font-medium">Podsetnici za sledeći servis</span>
            <span className="block text-sm text-muted-foreground">{openReminders ? `${openReminders} ${plural(openReminders, "otvoren podsetnik", "otvorena podsetnika", "otvorenih podsetnika")}` : "Vozilo nema otvorenih podsetnika."}</span>
          </span>
        </label>
      </fieldset>

      <Segmented name="days" label="Link važi" value={days} onChange={setDays} options={SHARE_DAYS.map((d) => ({ value: String(d), label: SHARE_DAYS_LABELS[d] }))} />
      {errors.days && <p className="-mt-4 text-sm text-destructive">{errors.days}</p>}

      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center">
        <Button type="submit" size="xl" disabled={pending || nothing}>
          <Link2 aria-hidden />
          {pending ? "Pravim link…" : "Napravi link"}
        </Button>
      </div>
    </form>
  );
}
