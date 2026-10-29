import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { SHOP, isPlaceholder } from "@/config/shop";
import { PartsOrderSheet } from "@/components/parts-order-sheet";
import { getPublicPartsOrder } from "@/server/parts-orders";
import { PrintButton } from "./print-button";
import "../../dokumenti/print.css";

// bez dinamičkog naslova: učitavanje stranice broji otvaranje linka, pa se podaci čitaju samo jednom
export const metadata: Metadata = { title: "Narudžbenica", robots: { index: false, follow: false } };

/** Javna strana za dobavljača: bez prijave, samo spisak delova i podaci vozila. */
export default async function JavnaNarudzbenicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await getPublicPartsOrder(token);

  return (
    <div className="doc-root min-h-dvh bg-neutral-100 px-3 py-6 print:bg-white print:p-0">
      {d ? (
        <>
          <div className="no-print mx-auto mb-3 flex w-[210mm] max-w-full flex-wrap items-center gap-2">
            {!isPlaceholder(SHOP.phone) && (
              <a href={`tel:${SHOP.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#185e93] px-4 font-semibold text-white">
                <Phone className="size-5" aria-hidden />
                Pozovi servis
              </a>
            )}
            <PrintButton />
          </div>
          <article className="doc-page">
            <PartsOrderSheet d={d} />
          </article>
        </>
      ) : (
        <main className="mx-auto max-w-md rounded-2xl border border-neutral-300 bg-white p-6 text-center text-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- statičan logo */}
          <img src="/brand/logo-light.svg" alt={SHOP.legalName} className="mx-auto mb-6 h-auto w-48" />
          <h1 className="text-lg font-semibold">Link nije aktivan</h1>
          <p className="mt-2 text-neutral-600">Narudžbenica je izmenjena, otkazana ili link više ne važi. Kontaktirajte servis.</p>
          <p className="mt-4 font-semibold">{SHOP.legalName}</p>
          <p className="text-neutral-600">Tel. {SHOP.phone}</p>
        </main>
      )}
    </div>
  );
}
