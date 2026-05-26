'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Calendar, Users, CheckCircle2, Send, Clock, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UpcomingMatch {
  id: string;
  scheduledAt: string | null;
  venue: string | null;
  championship: string;
  homeTeam: string;
  awayTeam: string;
  side: 'home' | 'away';
  coachTeamId: string | null;
  nomination: {
    id: string;
    playerCount: number;
    notes: string | null;
    jerseyColor: string | null;
    sockColor: string | null;
    whatsappSentAt: string | null;
  } | null;
}

interface RosterPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  phone: string | null;
}

const MAX = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(iso: string | null): number {
  if (!iso) return 99;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function buildWhatsappText(
  match: UpcomingMatch,
  players: RosterPlayer[],
  notes: string,
  jerseyColor?: string,
  sockColor?: string,
): string {
  const date = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : 'Por confirmar';

  return [
    `🏀 *NÓMINA — ${match.homeTeam} vs ${match.awayTeam}*`,
    `📅 ${date}`,
    match.venue ? `📍 ${match.venue}` : null,
    jerseyColor || sockColor
      ? `👕 Camiseta: ${jerseyColor || '—'}${sockColor ? `  |  🧦 Calcetas: ${sockColor}` : ''}`
      : null,
    '',
    `*Jugadores convocados (${players.length}/${MAX}):*`,
    ...players.map((p, i) => `${i + 1}. #${p.number ?? '?'} ${p.name}${p.position ? ` — ${p.position}` : ''}`),
    '',
    notes ? `📝 ${notes}` : null,
    '_Confirmá asistencia respondiendo a este mensaje._',
  ].filter(Boolean).join('\n');
}

// ── Nomination modal ──────────────────────────────────────────────────────────

function NominationModal({
  match, onClose, onSaved,
}: {
  match: UpcomingMatch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [jerseyColor, setJerseyColor] = useState('');
  const [sockColor, setSockColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'select' | 'preview'>('select');

  useEffect(() => {
    async function load() {
      try {
        const rosterRes = match.coachTeamId
          ? await api.get(`/nominations/roster/${match.coachTeamId}`)
          : { data: { data: [] } };
        setRoster(rosterRes.data.data ?? rosterRes.data);

        try {
          const nomRes = await api.get(`/nominations/${match.id}?teamId=${match.coachTeamId}`);
          const nom = nomRes.data.data;
          if (nom) {
            if (nom.players?.length) setSelected(new Set(nom.players.map((p: any) => p.playerId)));
            setNotes(nom.notes ?? '');
            setJerseyColor(nom.jerseyColor ?? '');
            setSockColor(nom.sockColor ?? '');
          }
        } catch { /* no nomination yet */ }
      } catch {
        toast.error('Error al cargar el plantel');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [match]);

  const selectedPlayers = roster.filter(p => selected.has(p.id));

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX) {
        next.add(id);
      } else {
        toast.error(`Máximo ${MAX} jugadores`);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!match.coachTeamId) return;
    setSaving(true);
    try {
      await api.put(`/nominations/${match.id}`, {
        teamId: match.coachTeamId,
        playerIds: Array.from(selected),
        notes: notes.trim() || undefined,
        jerseyColor: jerseyColor.trim() || undefined,
        sockColor: sockColor.trim() || undefined,
      });
      toast.success('Nómina guardada');
      onSaved();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendWhatsapp() {
    if (!match.coachTeamId) return;
    const text = buildWhatsappText(match, selectedPlayers, notes, jerseyColor, sockColor);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    try { await api.post(`/nominations/${match.id}/whatsapp`, { teamId: match.coachTeamId }); } catch { /* non-critical */ }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-secondary">
                {match.homeTeam} vs {match.awayTeam}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(match.scheduledAt)}</p>
              {match.venue && <p className="text-xs text-muted-foreground">{match.venue}</p>}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-secondary text-xl leading-none p-1">✕</button>
          </div>

          <div className="flex gap-1 mt-3">
            {(['select', 'preview'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition',
                  tab === t
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-secondary hover:bg-muted/50'
                )}>
                {t === 'select' ? `Jugadores (${selected.size}/${MAX})` : 'Vista previa WhatsApp'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'select' ? (
            <div className="p-4 space-y-2">
              {roster.length === 0 ? (
                <div className="text-center py-10">
                  <Users size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay jugadores en el plantel.</p>
                </div>
              ) : (
                roster.map(p => {
                  const isSel = selected.has(p.id);
                  const disabled = !isSel && selected.size >= MAX;
                  return (
                    <label key={p.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition',
                        isSel
                          ? 'bg-primary/8 border-primary/30'
                          : disabled
                          ? 'opacity-40 cursor-not-allowed border-border bg-white'
                          : 'border-border bg-white hover:bg-muted/40'
                      )}>
                      <input type="checkbox" checked={isSel} disabled={disabled}
                        onChange={() => toggle(p.id)} className="accent-primary" />
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-secondary flex-shrink-0">
                        {p.number ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-secondary truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.position ?? 'Sin posición'}</div>
                      </div>
                      {p.phone && <span className="text-[10px] text-emerald-600 flex-shrink-0">📱</span>}
                    </label>
                  );
                })
              )}

              <div className="pt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      👕 Color camiseta
                    </label>
                    <input
                      type="text"
                      value={jerseyColor}
                      onChange={e => setJerseyColor(e.target.value)}
                      placeholder="Ej: Naranja"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-secondary placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      🧦 Color calcetas
                    </label>
                    <input
                      type="text"
                      value={sockColor}
                      onChange={e => setSockColor(e.target.value)}
                      placeholder="Ej: Blancas"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-secondary placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Notas (opcional)</label>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Ej: Concentración 1h antes del partido"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-secondary placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <pre className="whitespace-pre-wrap text-xs text-secondary bg-muted/30 border border-border rounded-xl p-4 font-sans leading-relaxed">
                {buildWhatsappText(match, selectedPlayers, notes, jerseyColor, sockColor)}
              </pre>
              <p className="text-xs text-muted-foreground mt-3">
                Al hacer clic en "Enviar WhatsApp" se abrirá WhatsApp con este mensaje. Elegí el grupo o jugador al que quieras enviarlo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border flex-shrink-0 flex gap-2">
          {tab === 'select' ? (
            <button onClick={handleSave} disabled={saving || selected.size === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl transition disabled:opacity-50">
              <CheckCircle2 size={15} />
              {saving ? 'Guardando...' : 'Guardar nómina'}
            </button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving || selected.size === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border border-border text-secondary bg-white hover:bg-muted/50 rounded-xl transition disabled:opacity-50">
                <CheckCircle2 size={15} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={handleSendWhatsapp} disabled={selected.size === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition disabled:opacity-50">
                <Send size={15} />
                Enviar WhatsApp
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({ match, onEdit, onSendWhatsapp }: { match: UpcomingMatch; onEdit: () => void; onSendWhatsapp: () => void }) {
  const days = daysUntil(match.scheduledAt);
  const nom = match.nomination;
  const isUrgent = days <= 2;

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 shadow-sm',
      isUrgent && !nom ? 'border-red-200' : 'border-border'
    )}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="text-muted-foreground flex-shrink-0" />
            <span className={cn(
              'text-xs font-semibold',
              days <= 1 ? 'text-red-500' : days <= 2 ? 'text-orange-500' : 'text-muted-foreground'
            )}>
              {days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
              {match.scheduledAt && ` · ${new Date(match.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
          {match.venue && <p className="text-[11px] text-muted-foreground mt-0.5">{match.venue}</p>}
        </div>

        {nom ? (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0',
            nom.playerCount >= MAX
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-orange-50 text-orange-600 border border-orange-200'
          )}>
            <Users size={10} />
            {nom.playerCount}/{MAX}
            {nom.whatsappSentAt && <Send size={9} className="ml-0.5" />}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-lg border border-border flex-shrink-0">
            Sin nómina
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={cn(
          'text-sm font-bold flex-1 text-right truncate',
          match.side === 'home' ? 'text-primary' : 'text-secondary'
        )}>{match.homeTeam}</span>
        <span className="text-xs text-muted-foreground px-2 flex-shrink-0">vs</span>
        <span className={cn(
          'text-sm font-bold flex-1 truncate',
          match.side === 'away' ? 'text-primary' : 'text-secondary'
        )}>{match.awayTeam}</span>
      </div>

      {isUrgent && !nom && (
        <div className="flex items-center gap-1.5 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <Clock size={11} className="text-red-500 flex-shrink-0" />
          <span className="text-[11px] text-red-600">Faltan menos de 2 días — definí el plantel</span>
        </div>
      )}

      {nom ? (
        <div className="flex gap-2">
          <button onClick={onEdit}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-muted text-secondary border border-border hover:bg-muted/70 transition">
            Editar nómina
          </button>
          <button onClick={onSendWhatsapp}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition">
            <Send size={13} />
            Enviar WhatsApp
          </button>
        </div>
      ) : (
        <button onClick={onEdit}
          className="w-full py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition">
          Crear nómina
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NominationsPage() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UpcomingMatch | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await api.get('/nominations/upcoming');
      setMatches(res.data.data ?? res.data);
    } catch {
      toast.error('Error al cargar los partidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  async function handleSendWhatsapp(match: UpcomingMatch) {
    try {
      const [nomRes, rosterRes] = await Promise.all([
        api.get(`/nominations/${match.id}?teamId=${match.coachTeamId}`),
        match.coachTeamId ? api.get(`/nominations/roster/${match.coachTeamId}`) : Promise.resolve({ data: { data: [] } }),
      ]);
      const nom = nomRes.data.data;
      const roster: RosterPlayer[] = rosterRes.data.data ?? rosterRes.data;
      const players = roster.filter(p => nom?.players?.some((np: any) => np.playerId === p.id));
      const text = buildWhatsappText(match, players, nom?.notes ?? '', nom?.jerseyColor ?? '', nom?.sockColor ?? '');
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      await api.post(`/nominations/${match.id}/whatsapp`, { teamId: match.coachTeamId });
      fetchMatches();
    } catch {
      toast.error('Error al preparar el mensaje');
    }
  }

  const urgent = matches.filter(m => daysUntil(m.scheduledAt) <= 2);
  const rest   = matches.filter(m => daysUntil(m.scheduledAt) > 2);

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      {editing && (
        <NominationModal
          match={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchMatches(); }}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-secondary flex items-center gap-2">
          <ClipboardList size={22} className="text-primary" />
          Nóminas de partido
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seleccioná hasta {MAX} jugadores por partido. Se muestran los partidos de los próximos 7 días.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center shadow-sm">
          <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-secondary">No hay partidos en los próximos 7 días</p>
          <p className="text-xs text-muted-foreground mt-1">
            Los partidos agendados en el calendario aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {urgent.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock size={11} /> Urgente — próximos 2 días
              </h2>
              <div className="space-y-3">
                {urgent.map(m => <MatchCard key={m.id} match={m} onEdit={() => setEditing(m)} onSendWhatsapp={() => handleSendWhatsapp(m)} />)}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Próximos partidos
              </h2>
              <div className="space-y-3">
                {rest.map(m => <MatchCard key={m.id} match={m} onEdit={() => setEditing(m)} onSendWhatsapp={() => handleSendWhatsapp(m)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
