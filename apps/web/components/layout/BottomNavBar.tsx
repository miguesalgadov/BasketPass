'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Calendar, Award, CreditCard, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { id: 'home',      icon: LayoutGrid,   label: 'Inicio',     href: '/player' },
  { id: 'calendar', icon: Calendar,      label: 'Calendario', href: '/player/calendar' },
  { id: 'logros',   icon: Award,         label: 'Logros',     href: '/player/logros' },
  { id: 'payments', icon: CreditCard,    label: 'Pagos',      href: '/player/payments' },
  { id: 'chat',     icon: MessageCircle, label: 'Chat',       href: '/player/chat' },
];

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex lg:hidden z-50">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/player' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3"
          >
            <Icon
              size={20}
              className={cn(isActive ? 'text-primary' : 'text-muted-foreground')}
            />
            <span className={cn('text-[9px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
