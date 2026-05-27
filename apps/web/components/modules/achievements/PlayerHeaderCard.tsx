import Image from 'next/image';
import { User } from 'lucide-react';
import type { PlayerProfile } from './types';

interface PlayerHeaderCardProps {
  player:        PlayerProfile;
  unlockedCount: number;
  inProgress:    number;
}

export function PlayerHeaderCard({ player, unlockedCount, inProgress }: PlayerHeaderCardProps) {
  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center">
          {player.avatarUrl ? (
            <Image src={player.avatarUrl} alt={fullName} width={64} height={64} className="object-cover" />
          ) : (
            <User size={28} className="text-white/40" />
          )}
        </div>
        {player.jerseyNumber != null && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0057FF] border border-[#0F1117] flex items-center justify-center">
            <span className="text-[9px] font-black text-white">{player.jerseyNumber}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-black text-white truncate">{fullName}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {player.club && (
            <span className="text-[11px] text-white/50">{player.club.name}</span>
          )}
          {player.team && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="text-[11px] text-white/50">{player.team.category}</span>
            </>
          )}
          {player.position && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="text-[11px] text-white/50">{player.position}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="text-center">
            <p className="text-sm font-black text-white">{unlockedCount}</p>
            <p className="text-[9px] text-white/35">Logros</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <p className="text-sm font-black text-white">{inProgress}</p>
            <p className="text-[9px] text-white/35">En progreso</p>
          </div>
        </div>
      </div>

      {/* Active pill */}
      <div className="flex-shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          player.isActive
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-red-500/20 text-red-400 border-red-500/30'
        }`}>
          {player.isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>
  );
}
