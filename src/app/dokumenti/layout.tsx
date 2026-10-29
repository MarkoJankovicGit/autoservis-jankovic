import { requireSession } from "@/server/auth/guard";
import "./print.css";

/** Dokumenti za štampu: bela strana A4 bez navigacije, uvek svetla tema. */
export default async function DokumentiLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <div className="doc-root min-h-dvh bg-neutral-200 py-6 print:bg-white print:py-0">{children}</div>;
}
