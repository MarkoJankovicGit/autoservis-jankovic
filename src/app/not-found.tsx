import Link from "next/link";

/** Nepostojeća adresa van aplikacije (npr. pogrešno ukucan link). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-brand-charcoal px-6 text-center text-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- statičan logo */}
      <img src="/brand/logo-on-dark.svg" alt="Automehaničar Janković" className="h-auto w-64" />
      <h1 className="mt-4 text-xl font-semibold">Stranica ne postoji</h1>
      <p className="max-w-sm text-[#c9c8ca]">Adresa je pogrešna ili stranica više ne postoji.</p>
      <Link href="/" className="mt-2 inline-flex h-12 items-center rounded-xl bg-[#185e93] px-6 font-semibold">
        Na početnu
      </Link>
    </main>
  );
}
