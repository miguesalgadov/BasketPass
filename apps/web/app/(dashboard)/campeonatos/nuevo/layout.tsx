import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NuevoCampeonatoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Fixed header */}
      <div className="flex items-center gap-3">
        <Link
          href="/campeonatos"
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-secondary transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-secondary">Nuevo campeonato</h1>
          <p className="text-sm text-muted-foreground">Completá los 4 pasos para crear el campeonato</p>
        </div>
      </div>
      {children}
    </div>
  );
}
