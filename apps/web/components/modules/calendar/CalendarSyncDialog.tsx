'use client';

import { useState } from 'react';
import { CalendarDays, Copy, Check, ExternalLink, Download, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Team { id: string; name: string; category: string }

interface Props {
  open: boolean;
  onClose: () => void;
  teams?: Team[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function CalendarSyncDialog({ open, onClose, teams = [] }: Props) {
  const [teamId, setTeamId]   = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const params = teamId ? `?teamId=${teamId}` : '';
      const res = await api.get(`/calendar/token${params}`);
      const token = res.data.data.token as string;
      const url = `${API_BASE}/calendar/feed.ics?token=${token}`;
      setFeedUrl(url);
    } catch {
      toast.error('Error al generar el enlace');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGoogle = () => {
    const webcal = feedUrl.replace(/^https?:\/\//, 'webcal://');
    const url = `https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(webcal)}`;
    window.open(url, '_blank', 'noopener');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = feedUrl;
    a.download = 'basketpass.ics';
    a.click();
  };

  const handleClose = () => {
    setFeedUrl('');
    setTeamId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays size={18} /> Sincronizar con Google Calendar
          </DialogTitle>
          <DialogDescription>
            Suscribite al calendario del equipo para ver partidos y entrenamientos directamente en Google Calendar, Apple Calendar u Outlook.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Team filter */}
          {teams.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Equipo (opcional)
              </label>
              <select
                value={teamId}
                onChange={(e) => { setTeamId(e.target.value); setFeedUrl(''); }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
              >
                <option value="">Todos los equipos</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.category}</option>
                ))}
              </select>
            </div>
          )}

          {/* Generate button */}
          {!feedUrl && (
            <button
              onClick={generate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
            >
              {loading
                ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4" />
                : <CalendarDays size={15} />}
              Generar enlace de suscripción
            </button>
          )}

          {/* Feed URL + actions */}
          {feedUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={feedUrl.replace(/^https?:\/\//, 'webcal://')}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted text-xs text-muted-foreground font-mono overflow-x-auto focus:outline-none"
                />
                <button
                  onClick={copy}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition text-secondary"
                  title="Copiar URL"
                >
                  {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                </button>
              </div>

              <button
                onClick={openInGoogle}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-sm font-semibold rounded-lg transition"
              >
                <ExternalLink size={14} />
                Abrir en Google Calendar
              </button>

              <button
                onClick={download}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border hover:bg-muted text-secondary text-sm font-medium rounded-lg transition"
              >
                <Download size={14} />
                Descargar .ics (importación única)
              </button>

              <p className="text-xs text-muted-foreground text-center">
                El calendario se actualiza automáticamente. Válido por 1 año.
              </p>

              <button
                onClick={() => setFeedUrl('')}
                className="w-full text-xs text-muted-foreground hover:text-secondary transition"
              >
                Generar nuevo enlace
              </button>
            </div>
          )}

          {/* How-to hint */}
          {feedUrl && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1 border border-border">
              <p className="font-medium text-secondary">¿Cómo agregar a Google Calendar?</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Haz clic en <strong>Abrir en Google Calendar</strong></li>
                <li>Google te pedirá confirmar — hacé clic en <strong>Agregar calendario</strong></li>
                <li>Los eventos se actualizan automáticamente</li>
              </ol>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
