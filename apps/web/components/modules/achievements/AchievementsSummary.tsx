import { Trophy, Target, Crown, Star } from 'lucide-react';
import { AchievementKPICard } from './AchievementKPICard';
import type { AchievementSummary } from './types';

interface AchievementsSummaryProps {
  summary: AchievementSummary;
}

export function AchievementsSummary({ summary }: AchievementsSummaryProps) {
  const { level, nextLevel, progressToNext, unlockedCount, inProgressCount, totalPoints } = summary;

  const levelSub = nextLevel
    ? `${unlockedCount} logros · ${nextLevel.min - unlockedCount} para ${nextLevel.name}`
    : `${unlockedCount} logros · Nivel máximo`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <AchievementKPICard
        icon={Trophy}
        iconColor="#0057FF"
        value={unlockedCount}
        label="Desbloqueados"
        cta="Ver todos"
      />
      <AchievementKPICard
        icon={Target}
        iconColor="#FF5A00"
        value={inProgressCount}
        label="En progreso"
        cta="Ver todos"
      />
      <AchievementKPICard
        icon={Crown}
        iconColor={level.color}
        value={level.name}
        label="Nivel actual"
        sub={levelSub}
        progress={progressToNext}
        progressColor={level.color}
      />
      <AchievementKPICard
        icon={Star}
        iconColor="#F5B301"
        value={totalPoints.toLocaleString('es-CL')}
        label="Puntos"
        cta="Historial"
      />
    </div>
  );
}
