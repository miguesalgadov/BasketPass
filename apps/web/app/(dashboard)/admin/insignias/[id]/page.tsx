'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { AchievementBadge }  from '@/components/modules/achievements/AchievementBadge';
import { RarityBadge }       from '@/components/modules/achievements/RarityBadge';
import { CATEGORY_CONFIG }   from '@/components/modules/achievements/types';
import toast from 'react-hot-toast';
import type { Achievement } from '@/components/modules/achievements/types';

export default function AdminInsigniaDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [data,    setData]    = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get(`/achievements/${id}`)
      .then((r) => setData(r.data.data))
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleToggle = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const newVal = !data.isActive;
      await api.patch(`/achievements/${id}`, { isActive: newVal });
      setData((d) => d ? { ...d, isActive: newVal } : d);
      toast.success(newVal ? 'Insignia activada' : 'Insignia desactivada');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (!data) return null;

  const { color, label: categoryLabel } = CATEGORY_CONFIG[data.category];

  const TRIGGER_LABEL: Record<string, string> = {
    AUTOMATIC: 'Automático (sistema)',
    MANUAL:    'Manual (coach / admin)',
  };

  const METRIC_LABEL: Record<string, string> = {
    attendance_count:       'Asistencias totales',
    monthly_attendance_pct: 'Asistencia mensual %',
    season_attendance_pct:  'Asistencia de temporada %',
    matches_played:         'Partidos jugados',
    points_total:           'Puntos anotados',
    threes_total:           'Triples anotados',
    assists_total:          'Asistencias dadas',
    has_digital_card:       'Carnet digital activo',
    profile_complete:       'Perfil completo',
  };

  return (
    <div className="min-h-screen bg-[#0F1117] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white mb-5 transition"
      >
        <ArrowLeft size={14} /> Volver al catálogo
      </button>

      <div className="max-w-lg mx-auto space-y-5">
        {/* Header card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex items-start gap-4">
          <AchievementBadge
            icon={data.icon}
            category={data.category}
            rarity={data.rarity}
            status="UNLOCKED"
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-base font-black text-white">{data.name}</h1>
                <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{data.description}</p>
              </div>
              <button
                onClick={handleToggle}
                disabled={saving}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  data.isActive
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                    : 'bg-white/[0.06] text-white/40 hover:bg-white/10 border border-white/10'
                }`}
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : data.isActive ? (
                  <Eye size={12} />
                ) : (
                  <EyeOff size={12} />
                )}
                {data.isActive ? 'Activa' : 'Inactiva'}
              </button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/8">
          {[
            { label: 'Categoría',       value: <span style={{ color }}>{categoryLabel}</span> },
            { label: 'Rareza',          value: <RarityBadge rarity={data.rarity} /> },
            { label: 'Tipo',            value: TRIGGER_LABEL[data.triggerType] },
            ...(data.metric ? [
              { label: 'Métrica',       value: METRIC_LABEL[data.metric] ?? data.metric },
              { label: 'Umbral',        value: data.threshold?.toString() ?? '—' },
            ] : []),
            { label: 'Puntos',         value: `${data.points} pts` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-white/40">{label}</span>
              <span className="text-[11px] text-white/90 font-medium">{value}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-white/25 text-center">
          ID: {data.id}
        </p>
      </div>
    </div>
  );
}
