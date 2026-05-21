'use client';

import { cn } from '@/lib/utils';
import { WizardData, PlayoffFormat, PlayoffSeeding } from './types';

interface Props {
  data: WizardData;
  onChange: (p: Partial<WizardData>) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-secondary mb-1">{children}</label>;
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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors',
        value ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
        value ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{children}</h3>;
}

export function Step3Rules({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Scoring */}
      <div>
        <SectionTitle>Sistema de puntuación</SectionTitle>
        <div className="space-y-2">
          {[
            { v: 'FIBA', label: 'FIBA', desc: 'Victoria = 2pts · Derrota = 1pt · WO perdido = 0pts' },
            { v: 'CLASSIC', label: 'Clásico', desc: 'Victoria = 2pts · Derrota = 0pts' },
          ].map(opt => (
            <label
              key={opt.v}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition',
                data.scoringSystem === opt.v ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              )}
            >
              <input
                type="radio"
                name="scoringSystem"
                value={opt.v}
                checked={data.scoringSystem === opt.v}
                onChange={() => onChange({ scoringSystem: opt.v as 'FIBA' | 'CLASSIC' })}
                className="mt-0.5 accent-primary"
              />
              <div>
                <p className="text-sm font-semibold text-secondary">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Playoffs */}
      <div>
        <SectionTitle>Playoffs</SectionTitle>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary">¿Tiene playoffs?</p>
              <p className="text-xs text-muted-foreground">Los mejores equipos disputarán eliminatorias</p>
            </div>
            <Toggle value={data.hasPlayoffs} onChange={v => onChange({ hasPlayoffs: v })} />
          </div>

          {data.hasPlayoffs && (
            <div className="pl-4 border-l-2 border-primary/20 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Clasifican a playoffs</FieldLabel>
                  <Select
                    value={data.playoffTeams}
                    onChange={e => onChange({ playoffTeams: Number(e.target.value) })}
                  >
                    {[2, 4, 6, 8].map(n => (
                      <option key={n} value={n}>{n} equipos</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel>Formato playoff</FieldLabel>
                  <Select
                    value={data.playoffFormat}
                    onChange={e => onChange({ playoffFormat: e.target.value as PlayoffFormat })}
                  >
                    <option value="SINGLE_ELIMINATION">Eliminación simple</option>
                    <option value="BEST_OF_3">Al mejor de 3</option>
                    <option value="BEST_OF_5">Al mejor de 5</option>
                  </Select>
                </div>
              </div>

              <div>
                <FieldLabel>Sembrado (seeding)</FieldLabel>
                <Select
                  value={data.playoffSeeding}
                  onChange={e => onChange({ playoffSeeding: e.target.value as PlayoffSeeding })}
                >
                  <option value="FIBA_STANDARD">FIBA: 1° vs N°, 2° vs N-1°</option>
                  <option value="RANDOM">Sorteo aleatorio</option>
                </Select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.hasThirdPlace}
                  onChange={e => onChange({ hasThirdPlace: e.target.checked })}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-sm text-secondary">Incluir partido por 3er puesto</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Dates & venue */}
      <div>
        <SectionTitle>Fechas y sede</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Fecha de inicio</FieldLabel>
            <Input
              type="date"
              value={data.startDate}
              onChange={e => onChange({ startDate: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Días entre jornadas</FieldLabel>
            <Input
              type="number"
              min={1}
              max={30}
              value={data.daysBetweenRounds}
              onChange={e => onChange({ daysBetweenRounds: Number(e.target.value) })}
            />
          </div>
          <div className="col-span-2">
            <FieldLabel>Sede predeterminada</FieldLabel>
            <Input
              value={data.defaultVenue}
              onChange={e => onChange({ defaultVenue: e.target.value })}
              placeholder="Ej: Polideportivo Municipal"
            />
          </div>
        </div>
      </div>

      {/* Sanctions */}
      <div>
        <SectionTitle>Sanciones y reglas</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Marcador WO ganador</FieldLabel>
            <Input
              type="number"
              min={1}
              value={data.walkoverScore}
              onChange={e => onChange({ walkoverScore: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-0.5">Puntos al ganar por WO</p>
          </div>
          <div>
            <FieldLabel>Espera antes de WO (min)</FieldLabel>
            <Input
              type="number"
              min={0}
              value={data.walkoverWaitMins}
              onChange={e => onChange({ walkoverWaitMins: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel>Máx. jugadores extranjeros</FieldLabel>
            <Input
              type="number"
              min={0}
              value={data.maxForeignPlayers ?? ''}
              onChange={e => onChange({ maxForeignPlayers: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Sin límite"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
