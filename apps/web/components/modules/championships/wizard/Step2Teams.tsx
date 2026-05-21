'use client';

import { useState } from 'react';
import { Search, Pencil, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { WizardData, ParticipantInput } from './types';

interface Props {
  data: WizardData;
  onChange: (p: Partial<WizardData>) => void;
}

interface TeamSearchResult {
  id: string;
  name: string;
  short: string;
  category: string;
  city: string;
}

export function Step2Teams({ data, onChange }: Props) {
  const [tab, setTab] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', short: '', city: '', contact: '' });
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});

  const alreadyAdded = new Set(data.teams.map(t => t.teamId).filter(Boolean));
  const missing = data.numTeams - data.teams.length;

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/teams/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.data ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addBPTeam(team: TeamSearchResult) {
    if (alreadyAdded.has(team.id) || data.teams.length >= data.numTeams) return;
    onChange({
      teams: [...data.teams, {
        isExternal: false,
        teamId: team.id,
        displayName: team.name,
        displayShort: team.short,
        displayCity: team.city,
        displayCat: team.category,
      }],
    });
  }

  function addManualTeam() {
    const errs: Record<string, string> = {};
    if (!manualForm.name.trim()) errs.name = 'El nombre es obligatorio';
    else if (manualForm.name.trim().length < 2) errs.name = 'Mínimo 2 caracteres';
    if (data.teams.length >= data.numTeams) errs.general = `Ya hay ${data.numTeams} equipos (máximo)`;
    const dup = data.teams.some(t =>
      (t.isExternal && t.externalName?.toLowerCase() === manualForm.name.trim().toLowerCase()) ||
      (!t.isExternal && t.displayName?.toLowerCase() === manualForm.name.trim().toLowerCase())
    );
    if (dup) errs.name = 'Ya existe un equipo con ese nombre';

    if (Object.keys(errs).length > 0) { setManualErrors(errs); return; }

    const short = (manualForm.short.trim() || manualForm.name.trim().slice(0, 2)).toUpperCase();
    onChange({
      teams: [...data.teams, {
        isExternal: true,
        externalName: manualForm.name.trim(),
        externalShort: short,
        externalCity: manualForm.city.trim(),
        externalContact: manualForm.contact.trim(),
        displayName: manualForm.name.trim(),
        displayShort: short,
        displayCity: manualForm.city.trim(),
      }],
    });
    setManualForm({ name: '', short: '', city: '', contact: '' });
    setManualErrors({});
  }

  function removeTeam(i: number) {
    onChange({ teams: data.teams.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className={cn(
        'flex items-center gap-3 rounded-lg p-3 border',
        missing === 0
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
      )}>
        {missing === 0
          ? <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
          : <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />}
        <div className="flex-1 text-sm">
          <span className="font-semibold">{data.teams.length}</span>
          <span className="text-muted-foreground"> de {data.numTeams} equipos</span>
          {missing > 0 && (
            <span className="text-amber-600 ml-1">— Faltan {missing}</span>
          )}
        </div>
        {missing === 0 && (
          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            Completo ✓
          </span>
        )}
      </div>

      {/* Teams list */}
      {data.teams.length > 0 && (
        <div className="space-y-1.5">
          {data.teams.map((t, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg border-l-4 border border-border',
                t.isExternal ? 'border-l-amber-400' : 'border-l-blue-400'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                t.isExternal
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              )}>
                {(t.displayShort || t.externalShort || '??').slice(0, 3)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.displayName || t.externalName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.displayCity || t.externalCity || ''}
                  {t.displayCat ? ` · ${t.displayCat}` : ''}
                  {' · '}
                  <span className={t.isExternal ? 'text-amber-600' : 'text-blue-600'}>
                    {t.isExternal ? 'Externo' : 'BasketPass'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeTeam(i)}
                className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add teams section */}
      {data.teams.length < data.numTeams && (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setTab('search')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors',
                tab === 'search'
                  ? 'bg-surface text-secondary border-b-2 border-primary -mb-px'
                  : 'bg-muted/30 text-muted-foreground hover:text-secondary'
              )}
            >
              <Search size={13} />
              Buscar en BasketPass
            </button>
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors',
                tab === 'manual'
                  ? 'bg-surface text-secondary border-b-2 border-primary -mb-px'
                  : 'bg-muted/30 text-muted-foreground hover:text-secondary'
              )}
            >
              <Pencil size={13} />
              Equipo externo
            </button>
          </div>

          {/* Search tab */}
          {tab === 'search' && (
            <div className="p-3">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Buscar equipo registrado…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
              {searching && (
                <p className="text-xs text-muted-foreground text-center py-3">Buscando…</p>
              )}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-1">No se encontraron equipos.</p>
                  <button
                    type="button"
                    onClick={() => setTab('manual')}
                    className="text-sm text-primary underline"
                  >
                    Agregar como equipo externo →
                  </button>
                </div>
              )}
              {searchResults.map(team => {
                const added = alreadyAdded.has(team.id);
                return (
                  <div
                    key={team.id}
                    onClick={() => addBPTeam(team)}
                    className={cn(
                      'flex items-center gap-2.5 p-2 rounded-lg mb-1 cursor-pointer transition-colors',
                      added
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {team.short}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{team.city} · {team.category}</p>
                    </div>
                    {added
                      ? <span className="text-xs text-muted-foreground">Ya agregado</span>
                      : <span className="text-xs text-primary font-medium px-2 py-0.5 rounded border border-primary/30">+ Agregar</span>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual tab */}
          {tab === 'manual' && (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Nombre del equipo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.name}
                    onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: Pumas Osorno"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                  {manualErrors.name && <p className="text-xs text-red-500 mt-1">{manualErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sigla (2-3 letras)</label>
                  <input
                    type="text"
                    value={manualForm.short}
                    onChange={e => setManualForm(f => ({ ...f, short: e.target.value.toUpperCase() }))}
                    maxLength={3}
                    placeholder="PO"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">Auto si se deja vacío</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={manualForm.city}
                    onChange={e => setManualForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Ej: Osorno"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Contacto delegado (opcional)</label>
                  <input
                    type="text"
                    value={manualForm.contact}
                    onChange={e => setManualForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="email o teléfono"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>
              {manualErrors.general && <p className="text-xs text-red-500">{manualErrors.general}</p>}
              <button
                type="button"
                onClick={addManualTeam}
                className="w-full py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition"
              >
                + Agregar equipo externo
              </button>
            </div>
          )}
        </div>
      )}

      {missing === 0 && data.teams.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={16} />
          ¡Todos los {data.numTeams} equipos están registrados! Podés continuar.
        </div>
      )}
    </div>
  );
}
