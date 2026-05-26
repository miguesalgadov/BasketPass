'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CoachAwardForm } from '@/components/modules/achievements/CoachAwardForm';
import toast from 'react-hot-toast';
import type { Achievement } from '@/components/modules/achievements/types';

interface Player {
  id:           string;
  name:         string;
  jerseyNumber?: number | null;
}

export default function CoachAwardPage() {
  const router = useRouter();
  const [players,      setPlayers]      = useState<Player[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/players'),
      api.get('/achievements'),
    ]).then(([r1, r2]) => {
      const pts = (r1.data.data ?? []).map((p: any) => ({
        id:           p.id,
        name:         `${p.firstName} ${p.lastName}`,
        jerseyNumber: p.jerseyNumber,
      }));
      setPlayers(pts);
      setAchievements(r2.data.data ?? []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(playerId: string, achievementId: string, comment: string) {
    await api.post('/achievements/award', { playerId, achievementId, comment: comment || null });
    toast.success('Reconocimiento otorgado');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      <div className="max-w-md mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/50 hover:text-white/80 transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest">Coach</p>
            <h1 className="text-lg font-black text-white">Otorgar reconocimiento</h1>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
          <CoachAwardForm
            players={players}
            achievements={achievements}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/coach/reconocimientos')}
          />
        </div>
      </div>
    </div>
  );
}
