'use client';

import { cn } from '@/lib/utils';
import {
  WizardData, ChampFormat, NUM_TEAMS_OPTIONS, FORMAT_LABELS, CATEGORY_OPTIONS,
} from './types';

interface Props {
  data: WizardData;
  onChange: (p: Partial<WizardData>) => void;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-secondary mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
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

const YEAR = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, i) => YEAR - 1 + i);

// Compute valid group options for a given numTeams
function getGroupOptions(numTeams: number): number[] {
  const opts: number[] = [];
  for (let g = 2; g <= Math.floor(numTeams / 2); g++) {
    opts.push(g);
  }
  return opts;
}

export function Step1Config({ data, onChange }: Props) {
  const nameError = data.name.length > 0 && data.name.length < 3 ? 'Mínimo 3 caracteres' : null;
  const isOdd = data.numTeams % 2 !== 0;
  const showOddWarning = isOdd && ['DOUBLE_ROUND_ROBIN', 'SINGLE_ROUND_ROBIN'].includes(data.format);

  // Group config derived values
  const isGroups = data.format === 'GROUPS_THEN_PLAYOFFS';
  const teamsPerGroup = isGroups ? Math.ceil(data.numTeams / data.numGroups) : 0;
  const remainder = isGroups ? data.numTeams % data.numGroups : 0;
  const unevenGroups = remainder !== 0;
  const totalQualifiers = isGroups ? data.numGroups * data.teamsQualifyPerGroup : 0;
  const qualifyError = isGroups && data.teamsQualifyPerGroup >= teamsPerGroup
    ? `No pueden clasificar ${data.teamsQualifyPerGroup} de ${teamsPerGroup} equipos por grupo`
    : null;

  function handleFormatChange(f: ChampFormat) {
    const update: Partial<WizardData> = { format: f };
    // Reset group fields to sensible defaults when switching to groups format
    if (f === 'GROUPS_THEN_PLAYOFFS') {
      const groups = data.numTeams >= 8 ? 2 : 2;
      update.numGroups = groups;
      update.teamsQualifyPerGroup = 2;
    }
    onChange(update);
  }

  function handleNumTeamsChange(n: number) {
    const update: Partial<WizardData> = { numTeams: n };
    // Recalculate group defaults when teams change
    if (data.format === 'GROUPS_THEN_PLAYOFFS') {
      const maxGroups = Math.floor(n / 2);
      const groups = Math.min(data.numGroups, maxGroups) || 2;
      const perGroup = Math.ceil(n / groups);
      const qualify = Math.min(data.teamsQualifyPerGroup, perGroup - 1) || 1;
      update.numGroups = groups;
      update.teamsQualifyPerGroup = qualify;
    }
    onChange(update);
  }

  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <FieldLabel required>Nombre del campeonato</FieldLabel>
        <Input
          value={data.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Ej: Torneo Apertura 2026"
          maxLength={100}
        />
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </div>

      {/* Category */}
      <div>
        <FieldLabel required>Categoría</FieldLabel>
        <Select value={data.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="">Selecciona una categoría…</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {/* Season + Organizer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Temporada</FieldLabel>
          <Select value={data.season} onChange={e => onChange({ season: e.target.value })}>
            {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Organizador</FieldLabel>
          <Input
            value={data.organizer}
            onChange={e => onChange({ organizer: e.target.value })}
            placeholder="Ej: Federación X"
          />
        </div>
      </div>

      {/* Num teams */}
      <div>
        <FieldLabel required>Cantidad de equipos</FieldLabel>
        <div className="flex flex-wrap gap-2 mt-1">
          {NUM_TEAMS_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleNumTeamsChange(n)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-sm font-medium transition',
                data.numTeams === n
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-secondary border-border hover:border-primary hover:text-primary'
              )}
            >
              {n}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">o</span>
            <Input
              type="number"
              min={3}
              max={32}
              value={!NUM_TEAMS_OPTIONS.includes(data.numTeams) ? data.numTeams : ''}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 3 && v <= 32) handleNumTeamsChange(v);
              }}
              placeholder="Otro"
              className="w-20"
            />
          </div>
        </div>
        {showOddWarning && (
          <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded-lg px-2 py-1">
            Con {data.numTeams} equipos (número impar), cada jornada un equipo descansará automáticamente.
          </p>
        )}
      </div>

      {/* Format */}
      <div>
        <FieldLabel required>Formato de la fase regular</FieldLabel>
        <div className="space-y-2 mt-1">
          {(Object.keys(FORMAT_LABELS) as ChampFormat[]).map(f => (
            <div key={f}>
              <label
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition',
                  data.format === f
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={data.format === f}
                  onChange={() => handleFormatChange(f)}
                  className="mt-0.5 accent-primary"
                />
                <p className="text-sm font-medium text-secondary">{FORMAT_LABELS[f]}</p>
              </label>

              {/* Groups config — inline under the option when selected */}
              {f === 'GROUPS_THEN_PLAYOFFS' && data.format === 'GROUPS_THEN_PLAYOFFS' && (
                <div className="ml-6 mt-2 mb-1 pl-4 border-l-2 border-primary/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Num groups */}
                    <div>
                      <FieldLabel>Cantidad de grupos</FieldLabel>
                      <Select
                        value={data.numGroups}
                        onChange={e => {
                          const g = Number(e.target.value);
                          const perGroup = Math.ceil(data.numTeams / g);
                          const qualify = Math.min(data.teamsQualifyPerGroup, perGroup - 1) || 1;
                          onChange({ numGroups: g, teamsQualifyPerGroup: qualify });
                        }}
                      >
                        {getGroupOptions(data.numTeams).map(g => (
                          <option key={g} value={g}>{g} grupos</option>
                        ))}
                      </Select>
                    </div>

                    {/* Qualify per group */}
                    <div>
                      <FieldLabel>Clasifican por grupo</FieldLabel>
                      <Select
                        value={data.teamsQualifyPerGroup}
                        onChange={e => onChange({ teamsQualifyPerGroup: Number(e.target.value) })}
                      >
                        {Array.from({ length: teamsPerGroup - 1 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'equipo' : 'equipos'}</option>
                        ))}
                      </Select>
                      {qualifyError && <p className="text-xs text-red-500 mt-1">{qualifyError}</p>}
                    </div>
                  </div>

                  {/* Info card */}
                  <div className={cn(
                    'rounded-lg px-3 py-2.5 text-xs space-y-1',
                    unevenGroups
                      ? 'bg-amber-50 border border-amber-200 text-amber-700'
                      : 'bg-blue-50 border border-blue-100 text-blue-700'
                  )}>
                    <div className="flex items-center gap-4 font-medium">
                      <span>{data.numGroups} grupos</span>
                      <span>·</span>
                      <span>
                        {unevenGroups
                          ? `${data.numGroups - remainder} grupos de ${teamsPerGroup - 1} + ${remainder} de ${teamsPerGroup}`
                          : `${data.numTeams / data.numGroups} equipos c/u`
                        }
                      </span>
                      <span>·</span>
                      <span>Clasifican {totalQualifiers} en total</span>
                    </div>
                    {unevenGroups && (
                      <p>Los grupos no son del mismo tamaño. Podés cambiar la cantidad de equipos o grupos para equilibrarlos.</p>
                    )}
                    {!unevenGroups && (
                      <p>
                        Top {data.teamsQualifyPerGroup} de cada grupo → {totalQualifiers} equipos pasan a playoffs.
                        {totalQualifiers <= 2 || totalQualifiers === 4 || totalQualifiers === 8
                          ? ` Bracket de ${totalQualifiers} equipos.`
                          : ` Recomendamos ajustar para tener 4 u 8 clasificados.`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
