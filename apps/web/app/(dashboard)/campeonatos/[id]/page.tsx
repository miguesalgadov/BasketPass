'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ChampionshipPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/campeonatos/${params.id}/tabla`);
  }, [params.id, router]);

  return null;
}
