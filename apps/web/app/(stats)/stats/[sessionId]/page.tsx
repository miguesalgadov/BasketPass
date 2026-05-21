'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function StatsRootPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const { user } = useAuthStore();

  useEffect(() => {
    const role = user?.role;
    if (role === 'CLUB_ADMIN' || role === 'SUPER_ADMIN' || role === 'COACH') {
      router.replace(`/stats/${params.sessionId}/live`);
    } else {
      router.replace(`/stats/${params.sessionId}/boxscore`);
    }
  }, [user, params.sessionId, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
