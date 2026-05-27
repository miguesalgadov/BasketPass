import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RARITY_BG: Record<string, [string, string]> = {
  LEGENDARY: ['#78350F', '#92400E'],
  EPIC:      ['#4C1D95', '#5B21B6'],
  RARE:      ['#1E3A8A', '#1D4ED8'],
  COMMON:    ['#0F172A', '#1E293B'],
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pa = await prisma.playerAchievement.findUnique({
    where:   { id: params.id },
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

  if (!pa) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 24 }}>Logro no encontrado</span>
      </div>,
      { width: 1200, height: 630 },
    );
  }

  const [c1, c2] = RARITY_BG[pa.achievement.rarity] ?? RARITY_BG.COMMON;
  const playerName = `${pa.player.user.firstName} ${pa.player.user.lastName}`;
  const pct = pa.target > 0 ? Math.min(100, Math.round((pa.progress / pa.target) * 100)) : 0;
  const isUnlocked = pa.status === 'UNLOCKED';

  return new ImageResponse(
    <div
      style={{
        width: '100%', height: '100%',
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: 'flex', flexDirection: 'column',
        padding: '48px', fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
          🏀 BasketPass
        </span>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
          background: isUnlocked ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.15)',
          color: isUnlocked ? '#34D399' : 'rgba(255,255,255,0.7)',
        }}>
          {isUnlocked ? 'LOGRO DESBLOQUEADO' : `EN PROGRESO · ${pct}%`}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 40, flex: 1 }}>
        <div style={{
          width: 160, height: 160, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.12)',
          border: '3px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64,
        }}>
          🏅
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
            {pa.achievement.rarity}
          </span>
          <span style={{ color: '#FFFFFF', fontSize: 52, fontWeight: 900, lineHeight: 1.1 }}>
            {pa.achievement.name}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20, lineHeight: 1.4 }}>
            {pa.achievement.description}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 24 }}>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: 700 }}>
          {playerName}{pa.player.team ? ` · ${pa.player.team.name}` : ''}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>basketpass.cl</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
