import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  {
    name: 'Identidad BasketPass', description: 'Tienes tu carnet digital activo en la plataforma.',
    category: 'IDENTITY', icon: 'id-card', triggerType: 'AUTOMATIC',
    metric: 'has_digital_card', threshold: 1, points: 5, rarity: 'COMMON',
  },
  {
    name: 'Perfil Listo', description: 'Completaste tu perfil con foto, posición y número de camiseta.',
    category: 'IDENTITY', icon: 'user-check', triggerType: 'AUTOMATIC',
    metric: 'profile_complete', threshold: 1, points: 5, rarity: 'COMMON',
  },
  {
    name: 'Primer Entrenamiento', description: 'Asististe a tu primer entrenamiento del equipo.',
    category: 'ATTENDANCE', icon: 'dumbbell', triggerType: 'AUTOMATIC',
    metric: 'attendance_count', threshold: 1, points: 5, rarity: 'COMMON',
  },
  {
    name: 'Mes Perfecto', description: 'Asististe al 100% de los entrenamientos en un mes.',
    category: 'ATTENDANCE', icon: 'calendar-check', triggerType: 'AUTOMATIC',
    metric: 'monthly_attendance_pct', threshold: 100, points: 20, rarity: 'RARE',
  },
  {
    name: 'Siempre Presente', description: 'Mantuviste un 90% o más de asistencia en la temporada.',
    category: 'ATTENDANCE', icon: 'flame', triggerType: 'AUTOMATIC',
    metric: 'season_attendance_pct', threshold: 90, points: 40, rarity: 'EPIC',
  },
  {
    name: 'Debut Oficial', description: 'Jugaste tu primer partido oficial con el equipo.',
    category: 'PARTICIPATION', icon: 'play-circle', triggerType: 'AUTOMATIC',
    metric: 'matches_played', threshold: 1, points: 10, rarity: 'COMMON',
  },
  {
    name: 'Primer Punto', description: 'Anotaste tu primer punto en un partido oficial.',
    category: 'OFFENSE', icon: 'target', triggerType: 'AUTOMATIC',
    metric: 'points_total', threshold: 1, points: 5, rarity: 'COMMON',
  },
  {
    name: 'Centenario Ofensivo', description: 'Acumulaste 100 puntos en la temporada.',
    category: 'OFFENSE', icon: 'zap', triggerType: 'AUTOMATIC',
    metric: 'points_total', threshold: 100, points: 25, rarity: 'RARE',
  },
  {
    name: 'Francotirador', description: 'Anotaste 50 triples en tu carrera en la plataforma.',
    category: 'OFFENSE', icon: 'crosshair', triggerType: 'AUTOMATIC',
    metric: 'threes_total', threshold: 50, points: 40, rarity: 'EPIC',
  },
  {
    name: 'Generador de Juego', description: 'Diste 25 asistencias en la temporada.',
    category: 'TEAMPLAY', icon: 'users', triggerType: 'AUTOMATIC',
    metric: 'assists_total', threshold: 25, points: 25, rarity: 'RARE',
  },
  {
    name: 'Candado Defensivo', description: 'Reconocimiento por destacada labor defensiva en el equipo.',
    category: 'DEFENSE', icon: 'shield', triggerType: 'MANUAL',
    metric: null, threshold: null, points: 20, rarity: 'RARE',
  },
  {
    name: 'Reconocimiento del Coach', description: 'Tu coach te destacó por tu contribución al equipo.',
    category: 'COACH', icon: 'medal', triggerType: 'MANUAL',
    metric: null, threshold: null, points: 20, rarity: 'RARE',
  },
  {
    name: 'Actitud Ganadora', description: 'Reconocido por tu actitud positiva y liderazgo dentro del equipo.',
    category: 'COACH', icon: 'star', triggerType: 'MANUAL',
    metric: null, threshold: null, points: 20, rarity: 'RARE',
  },
  {
    name: 'Progreso Notable', description: 'Tu coach reconoce un salto importante en tu desarrollo deportivo.',
    category: 'COACH', icon: 'trending-up', triggerType: 'MANUAL',
    metric: null, threshold: null, points: 20, rarity: 'RARE',
  },
  {
    name: 'MVP de Temporada', description: 'Elegido por la administración como el jugador más valioso de la temporada.',
    category: 'SEASON', icon: 'crown', triggerType: 'MANUAL',
    metric: null, threshold: null, points: 100, rarity: 'LEGENDARY',
  },
] as const;

async function main() {
  console.log('Seeding achievements...');
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { name: a.name },
      update: { ...a },
      create: { ...a },
    });
    console.log(`  ✓ ${a.name}`);
  }
  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
