'use client';

import { AlertTriangle, Check, Trophy, Users, Settings, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardData, FORMAT_LABELS } from './types';

interface Props {
  data: WizardData;
  errors: string[];
  onSaveDraft: () => void;
  onCreate: () => void;
  loading: boolean;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-primary">{icon}</div>
        <h3 className="text-sm font-semibold text-secondary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground w-36 flex-shrink-0">{label}</span>
      <span className="text-secondary font-medium">{value || <span className="text-muted-foreground italic">—</span>}</span>
    </div>
  );
}

export function Step4Review({ data, errors, onSaveDraft, onCreate, loading }: Props) {
  const missing = data.numTeams - data.teams.length;
  const canCreate = errors.length === 0 && missing === 0 && data.name.length >= 3 && data.category;

  const warnings: string[] = [];
  if (!data.startDate) warnings.push('Sin fecha de inicio: el fixture se generará sin fechas.');
  if (data.hasPlayoffs && data.playoffTeams >= data.numTeams) {
    warnings.push(`Clasifican ${data.playoffTeams} equipos pero hay solo ${data.numTeams}. Ajusta los clasificantes en el paso 3.`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-secondary mb-1">Revisión final</h2>
        <p className="text-sm text-muted-foreground">Verificá los datos antes de crear el campeonato.</p>
      </div>

      {/* Config */}
      <Section title="Configuración" icon={<Trophy size={16} />}>
        <div className="space-y-1.5">
          <Row label="Nombre" value={data.name || <span className="text-red-500">Requerido</span>} />
          <Row label="Categoría" value={data.category || <span className="text-red-500">Requerida</span>} />
          <Row label="Temporada" value={data.season} />
          <Row label="Organizador" value={data.organizer} />
          <Row label="Formato" value={FORMAT_LABELS[data.format]} />
          <Row label="Equipos" value={`${data.numTeams} equipos`} />
          {data.format === 'GROUPS_THEN_PLAYOFFS' && (
            <Row
              label="Grupos"
              value={`${data.numGroups} grupos · ${data.teamsQualifyPerGroup} clasifican por grupo (${data.numGroups * data.teamsQualifyPerGroup} en total)`}
            />
          )}
        </div>
      </Section>

      {/* Teams */}
      <Section title={`Equipos (${data.teams.length}/${data.numTeams})`} icon={<Users size={16} />}>
        {data.teams.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin equipos registrados</p>
        ) : (
          <div className="space-y-1">
            {data.teams.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={cn(
                  'w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0',
                  t.isExternal ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                )}>
                  {(t.displayShort || t.externalShort || '?').slice(0, 3)}
                </span>
                <span className="truncate">{t.displayName || t.externalName}</span>
                {t.isExternal && <span className="text-xs text-amber-600 ml-auto">Externo</span>}
              </div>
            ))}
            {missing > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 pt-1.5 border-t border-border">
                Faltan {missing} equipo(s) — el fixture no se generará hasta completarlos.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Rules */}
      <Section title="Reglas" icon={<Settings size={16} />}>
        <div className="space-y-1.5">
          <Row label="Puntuación" value={data.scoringSystem === 'FIBA' ? 'FIBA (V=2, D=1)' : 'Clásico (V=2, D=0)'} />
          <Row label="Playoffs" value={data.hasPlayoffs ? `Sí — top ${data.playoffTeams}` : 'No'} />
          {data.hasPlayoffs && <Row label="Formato playoff" value={data.playoffFormat.replace('_', ' ')} />}
          <Row label="3er puesto" value={data.hasThirdPlace ? 'Sí' : 'No'} />
          <Row label="Sembrado" value={data.playoffSeeding === 'FIBA_STANDARD' ? 'FIBA estándar' : 'Sorteo'} />
        </div>
      </Section>

      {/* Dates */}
      <Section title="Fechas" icon={<Calendar size={16} />}>
        <div className="space-y-1.5">
          <Row label="Inicio" value={data.startDate || undefined} />
          <Row label="Días entre jornadas" value={`${data.daysBetweenRounds} días`} />
          <Row label="Sede" value={data.defaultVenue} />
          <Row label="WO marcador" value={`${data.walkoverScore} puntos`} />
        </div>
      </Section>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Blocking errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600">{e}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={loading || data.name.length < 3}
          className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium border border-border rounded-lg text-secondary hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate || loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition',
            canCreate && !loading
              ? 'bg-primary hover:bg-primary/90 text-white'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {loading ? (
            <><Loader2 size={15} className="animate-spin" /> Creando…</>
          ) : (
            <><Check size={15} /> Crear y generar fixture</>
          )}
        </button>
      </div>
      {!canCreate && !loading && missing === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Completa el nombre y la categoría para poder crear.
        </p>
      )}
      {missing > 0 && (
        <p className="text-xs text-amber-600 text-center">
          Faltan {missing} equipo(s). Podés guardar como borrador y agregar los equipos después.
        </p>
      )}
    </div>
  );
}
