'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Apple, Bot, Dumbbell, LayoutDashboard, LineChart, User } from 'lucide-react';
import { useHydrated, useStore } from '@/lib/store';

const TABS = [
  { href: '/dashboard', label: 'Accueil', Icon: LayoutDashboard },
  { href: '/coach', label: 'Coach IA', Icon: Bot },
  { href: '/workout', label: 'Séance', Icon: Dumbbell },
  { href: '/nutrition', label: 'Nutrition', Icon: Apple },
  { href: '/analytics', label: 'Progrès', Icon: LineChart },
  { href: '/profile', label: 'Profil', Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const hasActive = useStore((s) => s.active !== null);

  if (pathname.startsWith('/login') || pathname.startsWith('/onboarding')) return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          const live = href === '/workout' && hydrated && hasActive;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                  active ? 'text-white' : 'text-muted'
                }`}
              >
                {active && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-royal" />}
                <Icon size={21} strokeWidth={active ? 2.5 : 2} />
                {label}
                {live && <span className="absolute right-[26%] top-2 h-2 w-2 rounded-full bg-ember" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
