import {
  BellRing,
  CalendarDays,
  Car,
  ClipboardList,
  House,
  Settings,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Početna", icon: House },
  { href: "/nalozi", label: "Nalozi", icon: ClipboardList },
  { href: "/vozila", label: "Vozila", icon: Car },
  { href: "/klijenti", label: "Klijenti", icon: Users },
  { href: "/kalendar", label: "Kalendar", icon: CalendarDays },
  { href: "/podsetnici", label: "Podsetnici", icon: BellRing },
  { href: "/finansije", label: "Finansije", icon: Wallet },
  { href: "/dobavljaci", label: "Dobavljači", icon: Truck },
  { href: "/podesavanja", label: "Podešavanja", icon: Settings },
];

/** Stavke u donjoj traci na telefonu; ostalo je u meniju „Više“. */
export const MOBILE_PRIMARY = ["/", "/nalozi", "/vozila"];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
