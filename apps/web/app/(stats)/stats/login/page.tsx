'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

function StatsLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const message =
          json?.error?.message ??
          json?.message ??
          'Error al iniciar sesión';
        setError(message);
        return;
      }

      const { user, accessToken } = json.data;
      login(user, accessToken);

      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/') ? next : '/stats');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F97316] text-white font-bold text-xl mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold text-white">BasketPass</h1>
          <p className="text-[#7A8098] text-sm mt-1">Estadísticas</p>
        </div>

        {/* Card */}
        <div className="bg-[#181C25] rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white text-center">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="stats-email" className="block text-sm font-medium text-[#7A8098]">
                Email
              </label>
              <input
                id="stats-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0F1117] border border-[#2A2F3D] text-white placeholder:text-[#7A8098] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent transition text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="stats-password" className="block text-sm font-medium text-[#7A8098]">
                Contraseña
              </label>
              <input
                id="stats-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0F1117] border border-[#2A2F3D] text-white placeholder:text-[#7A8098] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent transition text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-[#F97316] hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function StatsLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StatsLoginForm />
    </Suspense>
  );
}
