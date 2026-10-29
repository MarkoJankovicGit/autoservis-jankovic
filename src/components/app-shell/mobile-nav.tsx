"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, LogOut, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/app/login/actions";
import { MOBILE_PRIMARY, NAV_ITEMS, isActive, type NavItem } from "./nav-items";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 bg-sidebar pt-[env(safe-area-inset-top)] text-sidebar-foreground lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Početna">
          <Image src="/brand/icon-j.svg" alt="" width={32} height={32} unoptimized className="size-8 rounded-md" />
          <span className="font-heading text-base font-semibold tracking-tight">Automehaničar Janković</span>
        </Link>
        <GlobalSearch
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              aria-label="Pretraga"
              className="ml-auto flex size-11 items-center justify-center rounded-lg hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <Search className="size-6" aria-hidden />
            </button>
          )}
        />
      </div>
    </header>
  );
}

const itemCls =
  "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(itemCls, active && "text-primary")}>
      <Icon className="size-6" aria-hidden />
      {item.label}
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = MOBILE_PRIMARY.map((href) => NAV_ITEMS.find((i) => i.href === href)!);
  const rest = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));
  const restActive = rest.some((i) => isActive(pathname, i.href));

  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex items-stretch">
        <Tab item={primary[0]} pathname={pathname} />
        <Tab item={primary[1]} pathname={pathname} />
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/nalozi/novi"
            aria-label="Novi prijem"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background focus-visible:ring-ring focus-visible:outline-none"
          >
            <Plus className="size-7" aria-hidden />
          </Link>
        </div>
        <Tab item={primary[2]} pathname={pathname} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={cn(itemCls, restActive && "text-primary")}>
            <Ellipsis className="size-6" aria-hidden />
            Više
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle>Meni</SheetTitle>
            </SheetHeader>
            <ul className="grid grid-cols-3 gap-2 px-4">
              {rest.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl bg-muted text-sm font-medium",
                        active && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Icon className="size-6" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-muted text-sm font-medium"
                  >
                    <LogOut className="size-6" aria-hidden />
                    Odjava
                  </button>
                </form>
              </li>
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
