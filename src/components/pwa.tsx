"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CheckCircle2, Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Događaj koji Chrome/Edge šalju kad aplikacija može da se instalira. */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// mali globalni „store“: događaj može stići pre nego što se dugme prikaže
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

const STANDALONE = "(display-mode: standalone)";
const subscribeDisplay = (l: () => void) => {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener("change", l);
  return () => mq.removeEventListener("change", l);
};
const isStandalone = () => window.matchMedia(STANDALONE).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const noSubscribe = () => () => {};

const DISMISS_KEY = "jk-install-dismissed";
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

function useInstall() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null, () => false);
  const installed = useSyncExternalStore(subscribeDisplay, isStandalone, () => false);
  const ios = useSyncExternalStore(noSubscribe, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    emit();
  };
  return { canPrompt, installed, ios, install };
}

/** Registruje service worker (samo u produkciji, da ne smeta razvoju). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

/** Kartica u podešavanjima: instalacija ili kako se instalira na iPhone-u. */
export function InstallCard() {
  const { canPrompt, installed, ios, install } = useInstall();
  if (installed) {
    return (
      <p className="flex items-center gap-2 font-medium text-success">
        <CheckCircle2 className="size-5" aria-hidden />
        Instalirano na ovom uređaju
      </p>
    );
  }
  if (canPrompt) {
    return (
      <Button type="button" size="xl" onClick={() => void install()}>
        <Download aria-hidden />
        Instaliraj aplikaciju
      </Button>
    );
  }
  return (
    <p className="text-muted-foreground">
      {ios ? "U Safariju: Podeli, pa „Dodaj na početni ekran“." : "U meniju browsera: „Instaliraj aplikaciju“ ili „Dodaj na početni ekran“."}
    </p>
  );
}

/** Traka na početnoj, samo na telefonu i samo dok aplikacija može da se instalira. */
export function InstallBanner() {
  const { canPrompt, installed, install } = useInstall();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  if (!canPrompt || installed || dismissed) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/30 bg-accent/50 p-3 lg:hidden">
      <Smartphone className="size-6 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1 font-medium">Aplikacija na telefonu</span>
      <Button type="button" onClick={() => void install()} className="h-11">
        Instaliraj
      </Button>
      <button
        type="button"
        aria-label="Sakrij"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // privatni režim: traka se samo sakrije do sledećeg učitavanja
          }
          emit();
        }}
        className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}
