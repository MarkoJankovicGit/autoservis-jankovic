import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prijava" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-brand-charcoal px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-10">
        <Image
          src="/brand/logo-on-dark.svg"
          alt="Automehaničar Janković"
          width={996}
          height={376}
          priority
          unoptimized
          className="h-auto w-full max-w-[320px]"
        />
        <LoginForm next={next} />
      </div>
    </main>
  );
}
