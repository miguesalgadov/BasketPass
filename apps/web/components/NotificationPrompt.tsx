'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { api } from '@/lib/api';

const STORAGE_KEY = 'bp_push_dismissed';

async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const reg = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  });

  await api.post('/push/subscribe', sub.toJSON());
  return true;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationPrompt() {
  const [state, setState] = useState<'idle' | 'prompt' | 'loading' | 'granted' | 'denied' | 'hidden'>('idle');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('hidden');
      return;
    }

    if (Notification.permission === 'granted') { setState('granted'); return; }
    if (Notification.permission === 'denied')  { setState('hidden');  return; }
    if (localStorage.getItem(STORAGE_KEY))     { setState('hidden');  return; }

    // Show prompt after 3 seconds
    const t = setTimeout(() => setState('prompt'), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleEnable = async () => {
    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return; }
      await subscribeToPush();
      setState('granted');
    } catch {
      setState('denied');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setState('hidden');
  };

  if (state === 'hidden' || state === 'idle') return null;

  if (state === 'granted') {
    return (
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex items-center gap-2 bg-green-500/90 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Bell size={14} /> Notificaciones activadas
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/60 text-xs px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
        <BellOff size={14} /> Notificaciones bloqueadas en el navegador
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-white/40 hover:text-white/80 transition"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <Bell size={16} className="text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Activar notificaciones</p>
          <p className="text-xs text-white/50 mt-0.5">
            Recibe avisos de partidos, entrenamientos y cuotas.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={state === 'loading'}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition"
            >
              {state === 'loading' ? 'Activando...' : 'Activar'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-white/40 hover:text-white/70 text-xs transition"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
