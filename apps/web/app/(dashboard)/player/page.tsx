'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { PlayerCredential } from '@/components/modules/player/PlayerCredential';
import { PaymentStatusBadge, PaymentStatusLevel } from '@/components/modules/player/PaymentStatusBadge';
import { UpcomingActivities, ActivityEvent } from '@/components/modules/player/UpcomingActivities';
import { SeasonSummaryBar } from '@/components/modules/player/SeasonSummaryBar';
import { PerformanceSparklines } from '@/components/modules/player/PerformanceSparklines';
import { MiniCalendar } from '@/components/modules/player/MiniCalendar';

interface DashboardData {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
    jerseyNumber?: number | null;
    position?: string | null;
    height?: number | null;
    weight?: number | null;
    team?: { id: string; name: string; category: string } | null;
    club?: { name: string; primaryColor?: string | null; slug?: string | null } | null;
    seasonAvgPoints: number;
    seasonAvgRebounds: number;
    seasonAvgAssists: number;
    attendanceRate: number;
  };
  paymentStatus: PaymentStatusLevel;
  fees: { id: string; month: number; year: number; status: string; amount: number; paidAmount?: number | null; paidAt?: string | null; dueDate: string }[];
  upcomingEvents: ActivityEvent[];
  season: { matchesPlayed: number; wins: number; losses: number; attendanceRate: number; callups: number; totalPoints: number; totalAssists: number; totalRebounds: number };
  recentStats: { matchId: string; matchDate: string; opponent: string; points: number; rebounds: number; assists: number; minutes: number }[];
}

function SkeletonCard({ h = 'h-40' }: { h?: string }) {
  return <div className={`${h} rounded-xl bg-white/5 animate-pulse`} />;
}

function ShareStoryButton({ onClick, loading, ready }: { onClick: () => void; loading: boolean; ready: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 text-sm font-medium transition disabled:opacity-40"
    >
      {loading
        ? <><Loader2 size={15} className="animate-spin" /> {ready ? 'Compartiendo...' : 'Generando...'}</>
        : <><Share2 size={15} /> Compartir carnet</>}
    </button>
  );
}

async function buildStoryFile(element: HTMLDivElement, lastName: string): Promise<File | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    const cardCanvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 3,
      useCORS: true,
      logging: false,
      onclone: (_doc, el) => {
        // Hide camera/delete controls marked with data-no-capture
        el.querySelectorAll('[data-no-capture]').forEach((n) => { (n as HTMLElement).style.display = 'none'; });

        // Fix player photo (html2canvas doesn't handle object-fit:cover)
        const photo = el.querySelector('[data-player-photo]') as HTMLImageElement | null;
        if (photo?.parentElement) {
          const p = photo.parentElement as HTMLElement;
          p.style.backgroundImage = `url("${photo.src}")`;
          p.style.backgroundSize = 'cover';
          p.style.backgroundPosition = 'top center';
          p.style.backgroundRepeat = 'no-repeat';
          photo.style.display = 'none';
        }

        // Fix club logo
        const clubLogo = el.querySelector('[data-club-logo]') as HTMLImageElement | null;
        if (clubLogo?.parentElement) {
          const p = clubLogo.parentElement as HTMLElement;
          p.style.backgroundImage = `url("${clubLogo.src}")`;
          p.style.backgroundSize = 'contain';
          p.style.backgroundPosition = 'center';
          p.style.backgroundRepeat = 'no-repeat';
          clubLogo.style.display = 'none';
        }

        // Fix SVG stroke inheritance
        try {
          el.querySelectorAll('svg').forEach((svg) => {
            const attrStroke = svg.getAttribute('stroke');
            const inlineColor = (svg as unknown as HTMLElement).style.color;
            const color =
              attrStroke && attrStroke !== 'currentColor' ? attrStroke :
              inlineColor ? inlineColor : null;
            if (!color) return;
            svg.querySelectorAll('path, circle, line, polyline, rect, polygon, ellipse').forEach((child) => {
              const s = child.getAttribute('stroke');
              if (!s || s === 'currentColor') child.setAttribute('stroke', color);
            });
            if (svg.getAttribute('stroke') === 'currentColor') svg.setAttribute('stroke', color);
          });
        } catch (_) { /* non-fatal */ }
      },
    });

    const story = document.createElement('canvas');
    story.width  = 1080;
    story.height = 1920;
    const ctx = story.getContext('2d')!;

    const bg = ctx.createLinearGradient(0, 0, 0, 1920);
    bg.addColorStop(0, '#0D1525');
    bg.addColorStop(1, '#111827');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1920);

    const margin = 80;
    const cardW  = story.width - margin * 2;
    const scale  = cardW / cardCanvas.width;
    const cardH  = cardCanvas.height * scale;
    ctx.drawImage(cardCanvas, margin, (story.height - cardH) / 2, cardW, cardH);

    const blob = await new Promise<Blob | null>((resolve) => story.toBlob(resolve, 'image/png'));
    if (!blob) return null;

    return new File([blob], `carnet-${lastName.toLowerCase()}.png`, { type: 'image/png' });
  } catch (e) {
    console.error('[buildStoryFile]', e);
    return null;
  }
}

export default function PlayerDashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const mobileCardRef         = useRef<HTMLDivElement>(null);
  const desktopCardRef        = useRef<HTMLDivElement>(null);
  const storyFileRef          = useRef<File | null>(null);
  const preGenRunning         = useRef(false);

  useEffect(() => {
    api.get('/players/me/dashboard')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Pre-generate the story image in background after card renders
  useEffect(() => {
    if (!data?.player || preGenRunning.current) return;
    preGenRunning.current = true;

    const run = async () => {
      // Wait for DOM to finish painting
      await new Promise((r) => setTimeout(r, 800));

      const isMobile = window.innerWidth < 1024;
      const el = isMobile ? mobileCardRef.current : desktopCardRef.current;
      if (!el) return;

      const file = await buildStoryFile(el, data.player.lastName);
      storyFileRef.current = file;
    };

    run();
  }, [data]);

  const handleAvatarFileChange = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/players/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setData((prev) => prev ? { ...prev, player: { ...prev.player!, photoUrl: res.data.data.avatarUrl } } : prev);
      // Invalidate pre-generated story so it regenerates with the new photo
      storyFileRef.current = null;
      preGenRunning.current = false;
      toast.success('Foto actualizada');
    } catch {
      toast.error('Error al subir la foto');
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await api.delete('/players/me/avatar');
      setData((prev) => prev ? { ...prev, player: { ...prev.player!, photoUrl: null } } : prev);
      storyFileRef.current = null;
      preGenRunning.current = false;
      toast.success('Foto eliminada');
    } catch {
      toast.error('Error al eliminar la foto');
    }
  };

  const handleShareStory = async () => {
    setSharing(true);
    try {
      // Use pre-generated file if available — share is called immediately within user gesture
      let file = storyFileRef.current;

      if (!file) {
        // Not ready yet — generate now (may lose user gesture on some browsers)
        const isMobile = window.innerWidth < 1024;
        const el = isMobile ? mobileCardRef.current : desktopCardRef.current;
        if (!el) return;
        file = await buildStoryFile(el, data?.player?.lastName ?? 'jugador');
        if (!file) { toast.error('No se pudo generar la imagen'); return; }
        storyFileRef.current = file;
      }

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Carnet de ${data?.player?.firstName} ${data?.player?.lastName}`,
        });
      } else {
        // Desktop fallback: download
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.download = file.name;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Imagen descargada — compartila desde tu galería');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('[ShareStory]', e);
        toast.error(`Error al compartir: ${e?.message ?? e}`);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      {/* ── MOBILE LAYOUT ── */}
      <div className="flex flex-col lg:hidden gap-3">
        <div className="pt-1">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Bienvenido</p>
          <h1 className="text-xl font-black text-white">
            {loading ? '...' : `${data?.player?.firstName} ${data?.player?.lastName}`}
          </h1>
        </div>

        {loading ? (
          <>
            <SkeletonCard h="h-52" />
            <SkeletonCard h="h-14" />
            <SkeletonCard h="h-40" />
            <SkeletonCard h="h-28" />
          </>
        ) : data?.player ? (
          <>
            <div ref={mobileCardRef}>
              <PlayerCredential player={data.player} onAvatarChange={handleAvatarFileChange} onAvatarDelete={handleAvatarDelete} paymentStatus={data.paymentStatus} season={data.season} />
            </div>
            <ShareStoryButton onClick={handleShareStory} loading={sharing} ready={!!storyFileRef.current} />
            <PaymentStatusBadge status={data.paymentStatus} fees={data.fees} />
            <UpcomingActivities events={data.upcomingEvents} />
            <SeasonSummaryBar stats={data.season} />
          </>
        ) : (
          <div className="text-white/40 text-sm text-center py-12">Error al cargar el perfil</div>
        )}
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:block">
        <div className="mb-4">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Bienvenido</p>
          <h1 className="text-2xl font-black text-white">
            {loading ? '...' : `${data?.player?.firstName} ${data?.player?.lastName}`}
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-[320px_1fr] gap-4">
            <div className="space-y-3">
              <SkeletonCard h="h-72" />
              <SkeletonCard h="h-16" />
            </div>
            <div className="space-y-3">
              <SkeletonCard h="h-24" />
              <SkeletonCard h="h-28" />
              <SkeletonCard h="h-48" />
              <SkeletonCard h="h-56" />
            </div>
          </div>
        ) : data?.player ? (
          <div className="grid grid-cols-[320px_1fr] gap-4">
            <div className="space-y-3">
              <div ref={desktopCardRef}>
                <PlayerCredential player={data.player} onAvatarChange={handleAvatarFileChange} onAvatarDelete={handleAvatarDelete} paymentStatus={data.paymentStatus} season={data.season} />
              </div>
              <ShareStoryButton onClick={handleShareStory} loading={sharing} ready={!!storyFileRef.current} />
              <PaymentStatusBadge status={data.paymentStatus} fees={data.fees} />
            </div>
            <div className="space-y-3">
              <SeasonSummaryBar stats={data.season} />
              <PerformanceSparklines stats={data.recentStats} />
              <UpcomingActivities events={data.upcomingEvents} />
              <MiniCalendar events={data.upcomingEvents} />
            </div>
          </div>
        ) : (
          <div className="text-white/40 text-sm text-center py-12">Error al cargar el perfil</div>
        )}
      </div>
    </div>
  );
}
