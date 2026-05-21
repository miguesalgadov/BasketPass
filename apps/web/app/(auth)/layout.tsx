import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-secondary p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
          <span className="text-xl font-bold">BasketPass</span>
        </div>
        <div>
          <blockquote className="text-2xl font-semibold leading-relaxed">
            "La plataforma que necesitaban los clubes de baloncesto latinoamericanos."
          </blockquote>
          <p className="mt-4 text-slate-400">Gestión completa de jugadores, partidos y pagos en un solo lugar.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { value: '500+', label: 'Clubes activos' },
            { value: '15K+', label: 'Jugadores' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}
