"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, History, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", icon: Layout, href: "/client" },
    { label: "History", icon: History, href: "/client/history" },
    { label: "Profile", icon: User, href: "/client/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-wg-background border-t border-gray-100 px-6 py-3 md:hidden flex justify-around items-center z-50 shadow-lg rounded-t-3xl">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? "text-wg-primary" : "text-wg-charcoal/40"
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
