'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin/finanzas',             label: 'Resumen'       },
  { href: '/admin/finanzas/movimientos', label: 'Movimientos'   },
  { href: '/admin/finanzas/cuotas',      label: 'Cuotas'        },
  { href: '/admin/finanzas/nuevo',       label: '+ Registrar'   },
];

export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-0">
      {/* Module header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-secondary leading-tight">Flujo de Caja</h1>
            <p className="text-xs text-muted-foreground">Gestión financiera del club</p>
          </div>
        </div>

        <nav className="flex gap-1">
          {TABS.map(tab => {
            const isActive = tab.href === '/admin/finanzas'
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-secondary hover:bg-muted/50',
                  tab.label.startsWith('+') && !isActive && 'border border-primary/40 text-primary hover:bg-primary/5',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}
