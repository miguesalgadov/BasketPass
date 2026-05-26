'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNavBar } from './BottomNavBar';
import { useAuthStore } from '@/store/auth.store';
import { NotificationPrompt } from '@/components/NotificationPrompt';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const router = useRouter();
  const isPlayer = user?.role === 'PLAYER';

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Wait for zustand to rehydrate from localStorage before deciding auth state
  if (!_hasHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[60] w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className={`flex-1 overflow-y-auto p-4 lg:p-6 ${isPlayer ? 'pb-20 lg:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {isPlayer && <BottomNavBar />}
      <NotificationPrompt />
    </div>
  );
}
