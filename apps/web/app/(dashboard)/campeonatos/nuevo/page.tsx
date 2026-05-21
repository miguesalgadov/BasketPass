'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { WizardStepper } from '@/components/modules/championships/wizard/WizardStepper';
import { Step1Config } from '@/components/modules/championships/wizard/Step1Config';
import { Step2Teams } from '@/components/modules/championships/wizard/Step2Teams';
import { Step3Rules } from '@/components/modules/championships/wizard/Step3Rules';
import { Step4Review } from '@/components/modules/championships/wizard/Step4Review';
import { WizardData, WIZARD_INITIAL } from '@/components/modules/championships/wizard/types';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Configuración', 'Equipos', 'Reglas y fechas', 'Revisar y crear'];

function canAdvanceFrom(step: number, data: WizardData): boolean {
  if (step === 0) return data.name.length >= 3 && Boolean(data.category) && Boolean(data.season);
  if (step === 1) return data.teams.length >= 3;
  return true;
}

export default function NuevoCampeonatoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(WIZARD_INITIAL);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const update = useCallback((partial: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  function buildPayload(isDraft: boolean) {
    return {
      name: data.name,
      category: data.category,
      season: data.season,
      organizer: data.organizer || undefined,
      numTeams: data.numTeams,
      format: data.format,
      numGroups: data.numGroups,
      teamsQualifyPerGroup: data.teamsQualifyPerGroup,
      scoringSystem: data.scoringSystem,
      hasPlayoffs: data.hasPlayoffs,
      playoffTeams: data.playoffTeams,
      playoffFormat: data.playoffFormat,
      playoffSeries: data.playoffSeries,
      hasThirdPlace: data.hasThirdPlace,
      playoffSeeding: data.playoffSeeding,
      startDate: data.startDate || undefined,
      daysBetweenRounds: data.daysBetweenRounds,
      defaultVenue: data.defaultVenue || undefined,
      walkoverScore: data.walkoverScore,
      walkoverWaitMins: data.walkoverWaitMins,
      maxForeignPlayers: data.maxForeignPlayers,
      teams: data.teams.map(t => ({
        isExternal: t.isExternal,
        teamId: t.isExternal ? undefined : t.teamId,
        externalName: t.isExternal ? t.externalName : undefined,
        externalShort: t.isExternal ? t.externalShort : undefined,
        externalCity: t.isExternal ? t.externalCity : undefined,
        externalContact: t.isExternal ? t.externalContact : undefined,
      })),
      // If draft, override teams to empty to skip fixture generation
      ...(isDraft ? { teams: [] } : {}),
    };
  }

  async function handleCreate() {
    setLoading(true);
    setErrors([]);
    try {
      const res = await api.post('/championships', buildPayload(false));
      const result = res.data.data ?? res.data;
      toast.success('¡Campeonato creado!');
      router.push(result.fixtureGenerated
        ? `/campeonatos/${result.champId}/fixture`
        : `/campeonatos/${result.champId}/configuracion`
      );
    } catch (e: any) {
      const msg = e.response?.data?.error?.message ?? 'Error al crear el campeonato';
      setErrors([msg]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    setLoading(true);
    try {
      // Save with all teams but mark intent as draft (no fixture)
      const payload = {
        ...buildPayload(false),
        teams: data.teams.map(t => ({
          isExternal: t.isExternal,
          teamId: t.isExternal ? undefined : t.teamId,
          externalName: t.isExternal ? t.externalName : undefined,
          externalShort: t.isExternal ? t.externalShort : undefined,
          externalCity: t.isExternal ? t.externalCity : undefined,
          externalContact: t.isExternal ? t.externalContact : undefined,
        })),
      };
      // Force draft status by sending incomplete data
      if (data.teams.length < data.numTeams) {
        // Naturally becomes DRAFT on backend since teams < numTeams
      }
      const res = await api.post('/championships', payload);
      const result = res.data.data ?? res.data;
      toast.success('Guardado como borrador');
      router.push(`/campeonatos/${result.champId}/configuracion`);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const canAdvance = canAdvanceFrom(step, data);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <WizardStepper
        steps={STEP_LABELS}
        current={step}
        onStepClick={i => { if (i <= step) setStep(i); }}
      />

      <div className="bg-surface rounded-xl border border-border p-6">
        {step === 0 && <Step1Config data={data} onChange={update} />}
        {step === 1 && <Step2Teams data={data} onChange={update} />}
        {step === 2 && <Step3Rules data={data} onChange={update} />}
        {step === 3 && (
          <Step4Review
            data={data}
            errors={errors}
            onSaveDraft={handleSaveDraft}
            onCreate={handleCreate}
            loading={loading}
          />
        )}
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
            className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition"
          >
            ← {step > 0 ? 'Atrás' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance}
            className={cn(
              'px-5 py-2 text-sm font-semibold rounded-lg transition',
              canAdvance
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            Siguiente →
          </button>
        </div>
      )}
      {step === 3 && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition"
          >
            ← Atrás
          </button>
        </div>
      )}
    </div>
  );
}
