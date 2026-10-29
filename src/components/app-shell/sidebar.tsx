"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { logout } from "@/app/login/actions";
import { NAV_ITEMS, isActive } from "./nav-items";

const linkCls =
  "flex h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-medium text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <Link href="/" className="px-5 pt-6 pb-5" aria-label="Početna">
        <Image
          src="/brand/logo-on-dark.svg"
          alt="Automehaničar Janković"
          width={996}
          height={376}
          priority
          unoptimized
          className="h-auto w-full"
        />
      </Link>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <GlobalSearch
          shortcut
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              className="flex h-11 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-white/5 px-3 text-sm text-sidebar-muted-foreground hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <Search className="size-4" aria-hidden />
              <span className="flex-1 text-left">Pretraga</span>
              <kbd className="rounded border border-sidebar-border px-1.5 text-xs">Ctrl K</kbd>
            </button>
          )}
        />
        <Button asChild size="xl" className="w-full">
          <Link href="/nalozi/novi">
            <Plus aria-hidden />
            Novi prijem
          </Link>
        </Button>
      </div>
      <nav aria-label="Glavna navigacija" className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(linkCls, active && "bg-sidebar-accent text-sidebar-accent-foreground")}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <form action={logout} className="border-t border-sidebar-border p-3">
        <button type="submit" className={cn(linkCls, "w-full")}>
          <LogOut className="size-5" aria-hidden />
          Odjava
        </button>
      </form>
    </aside>
  );
}
