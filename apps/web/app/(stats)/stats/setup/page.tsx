'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function SetupContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const matchId      = searchParams.get('matchId');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setError('matchId es requerido');
      return;
    }

    async function setup() {
      try {
        // Try to get existing session
        const existing = await api.get(`/stats/sessions/by-match/${matchId}`).catch(() => null);
        if (existing?.data) {
          const session = existing.data.data ?? existing.data;
          if (session?.id) {
            router.replace(`/stats/${session.id}/live`);
            return;
          }
        }

        // Create new session
        const created = await api.post('/stats/sessions', { matchId });
        const session = created.data.data ?? created.data;
        router.replace(`/stats/${session.id}/live`);
      } catch (err: any) {
        setError(err.response?.data?.error?.message ?? 'Error al preparar la sesión de estadísticas');
      }
    }

    setup();
  }, [matchId, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-4">
        <div className="text-red-400 text-sm text-center">{error}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#F97316] text-white text-sm rounded-lg hover:bg-orange-600 transition"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#7A8098] text-sm">Preparando sesión de estadísticas...</p>
    </div>
  );
}

export default function StatsSetupPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#7A8098] text-sm">Cargando...</p>
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
