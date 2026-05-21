'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type Role } from '@/store/auth.store';

export function useAuth(requiredRole?: Role | Role[]) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (requiredRole && user) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(user.role)) router.replace('/unauthorized');
    }
  }, [isAuthenticated, user, requiredRole, router]);

  return { user, isAuthenticated };
}
