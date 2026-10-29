"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Link2, Link2Off, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";
import { formatDateTime } from "@/domain/dates";
import { newPartsOrderLink, revokePartsOrderLink } from "../../actions";
import { plural } from "@/domain/text";

/**
 * Link za dobavljača. Token se vidi samo odmah posle pravljenja (u bazi je samo heš);
 * ako se izgubi, pravi se novi, a stari prestaje da važi.
 */
export function SharePanel({
  id,
  number,
  shopName,
  supplierEmail,
  hasLink,
  opens,
  lastOpenedAt,
  cancelled,
}: {
  id: string;
  number: string;
  shopName: string;
  supplierEmail?: string;
  hasLink: boolean;
  opens: number;
  lastOpenedAt?: string;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = (u: string) => `Narudžbenica ${number} — ${shopName}. Spisak delova i VIN vozila: ${u}`;

  const create = async () => {
    if (hasLink && !confirm("Napraviti novi link? Stari link prestaje da važi.")) return;
    setBusy(true);
    setError(null);
    const r = await newPartsOrderLink(id);
    setBusy(false);
    if (r.token) {
      setUrl(`${window.location.origin}/n/${r.token}`);
      router.refresh();
    } else setError(r.error ?? "Link nije napravljen.");
  };

  if (cancelled) return <p className="text-sm text-muted-foreground">Narudžbenica je otkazana; link ne važi.</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <Notice variant="error" title={error} />}
      {url ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-accent/50 p-3">
          <p className="text-sm font-medium">Link za dobavljača</p>
          <p className="font-mono text-xs break-all">{url}</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message(url));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  setError("Kopiranje nije dozvoljeno u ovom browseru; označi link i kopiraj ga ručno.");
                }
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Kopirano" : "Kopiraj poruku"}
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button type="button" variant="outline" onClick={() => navigator.share({ title: `Narudžbenica ${number}`, text: message(url) }).catch(() => undefined)}>
                <Share2 aria-hidden />
                Podeli (Viber…)
              </Button>
            )}
            {supplierEmail && (
              <Button asChild variant="outline">
                <a href={`mailto:${supplierEmail}?subject=${encodeURIComponent(`Narudžbenica ${number} — ${shopName}`)}&body=${encodeURIComponent(message(url))}`}>
                  <Mail aria-hidden />
                  Email
                </a>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" onClick={() => void create()} disabled={busy} className="self-start">
          <Link2 aria-hidden />
          {hasLink ? "Napravi novi link" : "Napravi link za dobavljača"}
        </Button>
      )}
      {hasLink && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{opens ? `Otvoren ${opens} ${plural(opens, "put", "puta", "puta")}${lastOpenedAt ? `, poslednji put ${formatDateTime(lastOpenedAt)}` : ""}` : "Link još nije otvoren."}</span>
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center gap-1 font-medium text-destructive"
            onClick={async () => {
              if (!confirm("Ugasiti link? Dobavljač više neće moći da ga otvori.")) return;
              setBusy(true);
              await revokePartsOrderLink(id);
              setUrl(null);
              setBusy(false);
              router.refresh();
            }}
          >
            <Link2Off className="size-4" aria-hidden />
            Ugasi link
          </button>
        </div>
      )}
    </div>
  );
}
