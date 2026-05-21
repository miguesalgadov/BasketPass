'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Trophy, Calendar, ClipboardCheck,
  BarChart2, DollarSign, FileText, Settings, LogOut, Dumbbell,
  MessageCircle, Medal, ClipboardList, Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const NAV_ITEMS: Record<string, { href: string; label: string; icon: React.ReactNode }[]> = {
  CLUB_ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/players', label: 'Jugadores', icon: <Users size={18} /> },
    { href: '/admin/teams', label: 'Equipos', icon: <Trophy size={18} /> },
    { href: '/admin/calendar', label: 'Calendario', icon: <Calendar size={18} /> },
    { href: '/admin/attendance', label: 'Asistencia', icon: <ClipboardCheck size={18} /> },
    { href: '/admin/finanzas', label: 'Finanzas', icon: <Wallet size={18} /> },
    { href: '/campeonatos', label: 'Campeonatos', icon: <Medal size={18} /> },
    { href: '/admin/reports', label: 'Reportes', icon: <BarChart2 size={18} /> },
    { href: '/admin/documents', label: 'Documentos', icon: <FileText size={18} /> },
    { href: '/admin/settings', label: 'Configuración', icon: <Settings size={18} /> },
  ],
  SUPER_ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/players', label: 'Jugadores', icon: <Users size={18} /> },
    { href: '/admin/teams', label: 'Equipos', icon: <Trophy size={18} /> },
    { href: '/admin/finanzas', label: 'Finanzas', icon: <Wallet size={18} /> },
    { href: '/admin/reports', label: 'Reportes', icon: <BarChart2 size={18} /> },
    { href: '/admin/settings', label: 'Configuración', icon: <Settings size={18} /> },
  ],
  COACH: [
    { href: '/coach', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/coach/calendar', label: 'Calendario', icon: <Calendar size={18} /> },
    { href: '/coach/nominations', label: 'Nóminas', icon: <ClipboardList size={18} /> },
    { href: '/coach/attendance', label: 'Asistencia', icon: <ClipboardCheck size={18} /> },
    { href: '/coach/stats', label: 'Estadísticas', icon: <BarChart2 size={18} /> },
    { href: '/campeonatos', label: 'Campeonatos', icon: <Medal size={18} /> },
    { href: '/coach/players', label: 'Jugadores', icon: <Users size={18} /> },
    { href: '/coach/training', label: 'Planes de entrenamiento', icon: <Dumbbell size={18} /> },
    { href: '/coach/chat', label: 'Chat', icon: <MessageCircle size={18} /> },
  ],
  PLAYER: [
    { href: '/player', label: 'Mi panel', icon: <LayoutDashboard size={18} /> },
    { href: '/player/calendar', label: 'Calendario', icon: <Calendar size={18} /> },
    { href: '/player/stats', label: 'Mis estadísticas', icon: <BarChart2 size={18} /> },
    { href: '/player/payments', label: 'Mis pagos', icon: <DollarSign size={18} /> },
    { href: '/player/chat', label: 'Chat', icon: <MessageCircle size={18} /> },
  ],
  PARENT: [
    { href: '/parent', label: 'Panel familiar', icon: <LayoutDashboard size={18} /> },
    { href: '/parent/profile', label: 'Perfil del hijo/a', icon: <Users size={18} /> },
    { href: '/parent/calendar', label: 'Calendario', icon: <Calendar size={18} /> },
    { href: '/parent/payments', label: 'Pagos', icon: <DollarSign size={18} /> },
    { href: '/parent/documents', label: 'Documentos', icon: <FileText size={18} /> },
  ],
};

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const navItems = NAV_ITEMS[user?.role || 'PLAYER'] || [];

  return (
    <div className="flex flex-col h-full bg-secondary text-white">
      <div className="flex items-center gap-3 p-6 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
          B
        </div>
        <span className="text-lg font-bold">BasketPass</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const isRoot = item.href === '/admin' || item.href === '/coach' || item.href === '/player' || item.href === '/parent';
          const isActive = isRoot ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
