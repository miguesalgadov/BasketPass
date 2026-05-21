'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Save, Users, PlayCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DangerZone } from '@/components/modules/championships/DangerZone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Championship {
  id: string;
  name: string;
  category: string;
  season: string;
  organizer?: string;
  format: string;
  scoringSystem: string;
  status: string;
  hasPlayoffs: boolean;
  playoffTeams: number;
  hasThirdPlace: boolean;
  startDate?: string;
  defaultVenue?: string;
  daysBetweenRounds: number;
  walkoverScore: number;
  walkoverWaitMins: number;
  maxTeams: number;
  participants: { id: string; teamId?: string; externalName?: string; isExternal: boolean; team?: { name: string } }[];
  _count?: { matches: number };
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
      {...props}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <select
      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
      {...rest}
    >
      {children}
    </select>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-secondary mb-1">{children}</label>;
}

export default function ConfiguracionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuthStore();

  const [champ, setChamp] = useState<Championship | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const [form, setForm] = useState({
    name: '', category: '', season: '', organizer: '',
    startDate: '', defaultVenue: '', daysBetweenRounds: 7,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/championships/${id}`);
        const c: Championship = res.data.data ?? res.data;
        setChamp(c);
        setForm({
          name: c.name,
          category: c.category,
          season: c.season,
          organizer: c.organizer ?? '',
          startDate: c.startDate ? c.startDate.split('T')[0] : '',
          defaultVenue: c.defaultVenue ?? '',
          daysBetweenRounds: c.daysBetweenRounds,
        });
        // Check if has results
        const roundsRes = await api.get(`/championships/${id}/rounds`);
        const rounds = roundsRes.data.data ?? [];
        const hasAnyResult = rounds.some((r: any) =>
          r.matches?.some((m: any) => ['FINISHED', 'WALKOVER'].includes(m.status))
        );
        setHasResults(hasAnyResult);
      } catch {
        toast.error('Error al cargar configuración');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/championships/${id}`, {
        name: form.name,
        category: form.category,
        season: form.season,
        organizer: form.organizer || undefined,
        startDate: form.startDate || undefined,
        defaultVenue: form.defaultVenue || undefined,
        daysBetweenRounds: form.daysBetweenRounds,
      });
      toast.success('Configuración guardada');
      setChamp(prev => prev ? { ...prev, ...form } : null);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateFixture() {
    if (!champ) return;
    if (!form.startDate) { toast.error('Ingresa la fecha de inicio primero'); return; }
    try {
      await api.post(`/championships/${id}/generate-fixture`, {
        startDate: form.startDate,
        daysBetweenRounds: form.daysBetweenRounds,
      });
      toast.success('Fixture generado correctamente');
      const res = await api.get(`/championships/${id}`);
      setChamp(res.data.data ?? res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Error al generar fixture');
    }
  }

  const isDraft = champ?.status === 'DRAFT' || champ?.status === 'REGISTRATION';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!champ) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* General config */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-secondary mb-4">Configuración general</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldLabel>Nombre</FieldLabel>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={!isDraft}
              />
            </div>
            <div>
              <FieldLabel>Categoría</FieldLabel>
              <Input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                disabled={!isDraft}
              />
            </div>
            <div>
              <FieldLabel>Temporada</FieldLabel>
              <Input
                value={form.season}
                onChange={e => setForm(f => ({ ...f, season: e.target.value }))}
                disabled={!isDraft}
              />
            </div>
            <div className="col-span-2">
              <FieldLabel>Organizador</FieldLabel>
              <Input
                value={form.organizer}
                onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))}
                placeholder="Ej: Federación X"
              />
            </div>
            <div>
              <FieldLabel>Fecha de inicio</FieldLabel>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Días entre jornadas</FieldLabel>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.daysBetweenRounds}
                onChange={e => setForm(f => ({ ...f, daysBetweenRounds: Number(e.target.value) }))}
                disabled={!isDraft}
              />
            </div>
            <div className="col-span-2">
              <FieldLabel>Sede predeterminada</FieldLabel>
              <Input
                value={form.defaultVenue}
                onChange={e => setForm(f => ({ ...f, defaultVenue: e.target.value }))}
                placeholder="Ej: Polideportivo Municipal"
              />
            </div>
          </div>

          {!isDraft && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              Algunos campos no se pueden editar porque el campeonato ya está en curso.
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      {/* Participants summary */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-secondary flex items-center gap-2">
            <Users size={16} />
            Equipos ({champ.participants.length}/{champ.maxTeams})
          </h2>
          {isDraft && champ.participants.length === champ.maxTeams && !(champ as any).fixtureGeneratedAt && (
            <button
              type="button"
              onClick={handleGenerateFixture}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              <PlayCircle size={14} />
              Generar fixture
            </button>
          )}
        </div>
        {champ.participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin equipos registrados.</p>
        ) : (
          <div className="space-y-1">
            {champ.participants.map((p, i) => (
              <div key={p.id} className={cn(
                'flex items-center gap-2.5 p-2 rounded-lg border-l-4',
                p.isExternal ? 'border-l-amber-400' : 'border-l-blue-400'
              )}>
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <span className="text-sm flex-1">{p.team?.name || p.externalName}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  p.isExternal ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                )}>
                  {p.isExternal ? 'Externo' : 'BP'}
                </span>
              </div>
            ))}
          </div>
        )}
        {champ.participants.length < champ.maxTeams && isDraft && (
          <p className="text-xs text-amber-600 mt-2">
            Faltan {champ.maxTeams - champ.participants.length} equipo(s) para completar el campeonato.
          </p>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <DangerZone
          championshipId={id}
          championshipName={champ.name}
          hasResults={hasResults}
          status={champ.status}
        />
      </div>
    </div>
  );
}
