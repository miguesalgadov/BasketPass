'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLUB_ADMIN: 'Administrador',
  COACH: 'Entrenador',
  PLAYER: 'Jugador',
  PARENT: 'Padre/Tutor',
};

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuthStore();
  const isPlayer = user?.role === 'PLAYER';

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition"
        aria-label="Abrir menú"
      >
        <Menu size={20} className="text-secondary" />
      </button>

      <div className="flex-1 flex items-center">
        {!isPlayer && (
          <div className="relative hidden sm:flex items-center">
            <Search size={15} className="absolute left-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-muted/50 text-secondary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-muted transition" aria-label="Notificaciones">
          <Bell size={18} className="text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-secondary leading-none">{user?.firstName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user?.role || ''] || ''}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
