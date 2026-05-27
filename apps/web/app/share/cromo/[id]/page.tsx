import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ShareableCromoCard } from '@/components/modules/achievements/ShareableCromoCard';
import type { PlayerProfile, Achievement } from '@/components/modules/achievements/types';

interface Props { params: { id: string } }

async function getData(playerAchievementId: string) {
  const pa = await prisma.playerAchievement.findUnique({
    where:   { id: playerAchievementId },
    include: {
      achievement: true,
      player: {
        include: {
          user: { include: { club: true } },
          team: true,
        },
      },
    },
  });
  return pa;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pa = await getData(params.id);
  if (!pa) return { title: 'BasketPass' };

  const playerName = `${pa.player.user.firstName} ${pa.player.user.lastName}`;
  return {
    title:       `${pa.achievement.name} — ${playerName} · BasketPass`,
    description: `${playerName} desbloqueó "${pa.achievement.name}" en BasketPass. ${pa.achievement.description}`,
    openGraph: {
      title:       `¡${playerName} desbloqueó ${pa.achievement.name}! 🏅`,
      description: pa.achievement.description,
      images: [`/api/og/cromo/${params.id}`],
      type:        'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `¡${playerName} desbloqueó ${pa.achievement.name}!`,
      description: pa.achievement.description,
      images:      [`/api/og/cromo/${params.id}`],
    },
  };
}

export default async function ShareCromoPage({ params }: Props) {
  const pa = await getData(params.id);

  if (!pa) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/40 mb-4">Este logro no está disponible.</p>
        <Link href="/" className="text-[#0057FF] text-sm hover:underline">Ir a BasketPass</Link>
      </div>
    );
  }

  const player: PlayerProfile = {
    id:           pa.player.id,
    firstName:    pa.player.user.firstName,
    lastName:     pa.player.user.lastName,
    avatarUrl:    pa.player.user.avatarUrl,
    jerseyNumber: pa.player.jerseyNumber,
    position:     pa.player.position,
    isActive:     pa.player.isActive,
    team:  pa.player.team  ? { name: pa.player.team.name, category: pa.player.team.category } : null,
    club:  pa.player.user.club ? { name: pa.player.user.club.name, logo: pa.player.user.club.logo ?? null } : null,
  };

  const achievement: Achievement = {
    ...(pa.achievement as any),
    status:       pa.status,
    progress:     pa.progress,
    target:       pa.target,
    unlockedAt:   pa.unlockedAt?.toISOString() ?? null,
    coachComment: pa.coachComment,
  };

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-5">
        <ShareableCromoCard achievement={achievement} player={player} format="square" />

        <div className="text-center space-y-2">
          <p className="text-white/60 text-sm">
            {player.firstName} desbloqueó este logro en BasketPass
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0057FF] text-white text-sm font-bold hover:bg-blue-600 transition"
          >
            Crea tu cuenta en BasketPass →
          </Link>
        </div>
      </div>
    </div>
  );
}
