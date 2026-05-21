'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!accessToken && pathname !== '/stats/login') {
      router.replace(`/stats/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, accessToken, pathname, router]);

  // Avoid flash: render nothing until hydration is complete
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0F1117] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // While unauthenticated and not yet redirected, don't render protected children.
  // The login page itself is always allowed through.
  if (!accessToken && pathname !== '/stats/login') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-white">
      {children}
    </div>
  );
}
