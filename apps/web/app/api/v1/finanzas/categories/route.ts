import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

const INCOME_CATEGORIES = [
  { value: 'MONTHLY_FEE',    label: 'Cuota mensual' },
  { value: 'REGISTRATION',   label: 'Inscripción de jugador' },
  { value: 'TOURNAMENT_FEE', label: 'Inscripción a torneo (recibida)' },
  { value: 'SPONSORSHIP',    label: 'Auspicio / Publicidad' },
  { value: 'DONATION',       label: 'Donación' },
  { value: 'SUBSIDY',        label: 'Subvención / Aporte municipal' },
  { value: 'OTHER_INCOME',   label: 'Otro ingreso' },
];

const EXPENSE_CATEGORIES = [
  { value: 'VENUE_RENTAL',     label: 'Arriendo de cancha' },
  { value: 'EQUIPMENT',        label: 'Equipamiento y uniformes' },
  { value: 'TRANSPORT',        label: 'Transporte' },
  { value: 'REFEREE',          label: 'Arbitraje' },
  { value: 'TOURNAMENT_ENTRY', label: 'Inscripción a campeonato' },
  { value: 'COACH_FEE',        label: 'Honorarios entrenador' },
  { value: 'MEDICAL',          label: 'Gastos médicos / kinesiología' },
  { value: 'CLEANING',         label: 'Útiles de aseo' },
  { value: 'ADMIN',            label: 'Gastos administrativos' },
  { value: 'OTHER_EXPENSE',    label: 'Otro egreso' },
];

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  return ok({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
}
