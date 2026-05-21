'use client';

import { User, Calendar, DollarSign, FileText } from 'lucide-react';
import { StatsCard } from '@/components/modules/stats/StatsCard';
import { useAuthStore } from '@/store/auth.store';

export default function ParentDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Panel familiar</h1>
        <p className="text-muted-foreground">Bienvenido, {user?.firstName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Asistencia del hijo/a" value="88%" icon={<User size={20} />} color="primary" />
        <StatsCard title="Próximos eventos" value="3" icon={<Calendar size={20} />} color="accent" />
        <StatsCard title="Pagos pendientes" value="1" icon={<DollarSign size={20} />} color="warning" />
        <StatsCard title="Documentos" value="4" icon={<FileText size={20} />} color="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-secondary mb-4">Perfil del jugador</h2>
          <p className="text-muted-foreground text-sm">Cargando información...</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-secondary mb-4">Pagos pendientes</h2>
          <p className="text-muted-foreground text-sm">No hay pagos pendientes.</p>
        </div>
      </div>
    </div>
  );
}
