'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Users, MessageSquare } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  teamId: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
}

interface Team { id: string; name: string; category: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? '';

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

export default function CoachChatPage() {
  const [teams, setTeams]         = useState<Team[]>([]);
  const [teamId, setTeamId]       = useState<string | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [myId, setMyId]           = useState<string | null>(null);
  const socketRef                 = useRef<Socket | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  // Fetch teams and current user id on mount
  useEffect(() => {
    api.get('/teams').then((r) => {
      const list: Team[] = r.data.data ?? [];
      setTeams(list);
      if (list.length > 0) setTeamId(list[0].id);
    }).catch(() => {});

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setMyId(payload.userId ?? payload.sub ?? null);
      } catch {}
    }
  }, []);

  // Load messages when teamId changes
  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get('/chat', { params: { teamId: teamId ?? undefined } });
      setMessages(res.data.data ?? []);
    } catch {
      toast.error('Error al cargar mensajes');
    }
  }, [teamId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Socket.io setup (only when a dedicated API server is available)
  useEffect(() => {
    if (!API_URL) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (teamId) socket.emit('join:team', teamId);
      else socket.emit('join:club', 'club');
    });

    socket.on('message:new', (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => { socket.disconnect(); };
  }, [teamId]);

  // Re-join the correct room when teamId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    if (teamId) socket.emit('join:team', teamId);
    else socket.emit('join:club', 'club');
  }, [teamId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await api.post('/chat', { content, teamId: teamId ?? undefined });
      setText('');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al enviar');
    } finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const currentTeam = teams.find((t) => t.id === teamId);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-t-xl">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-primary" />
          <div>
            <h1 className="text-base font-semibold text-secondary">Chat</h1>
            <p className="text-xs text-muted-foreground">
              {currentTeam ? `${currentTeam.name} · ${currentTeam.category}` : 'Club general'}
            </p>
          </div>
        </div>

        {/* Team selector */}
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <select
            value={teamId ?? ''}
            onChange={(e) => setTeamId(e.target.value || null)}
            className="text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Club general</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/20 border-x border-border space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare size={36} className="mb-2 opacity-40" />
            <p className="text-sm">No hay mensajes aún. ¡Sé el primero!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.id === myId;
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                {/* Avatar */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  isMe ? 'bg-primary text-white' : 'bg-accent/20 text-accent'
                )}>
                  {initials(msg.sender.firstName, msg.sender.lastName)}
                </div>

                <div className={cn('flex flex-col gap-0.5 max-w-[70%]', isMe && 'items-end')}>
                  <span className="text-xs text-muted-foreground">
                    {isMe ? 'Tú' : `${msg.sender.firstName} ${msg.sender.lastName}`}
                    {' · '}{timeLabel(msg.createdAt)}
                  </span>
                  <div className={cn(
                    'px-3 py-2 rounded-2xl text-sm leading-relaxed',
                    isMe
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-surface border border-border text-secondary rounded-tl-sm'
                  )}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 bg-surface border border-border rounded-b-xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje… (Enter para enviar)"
          rows={1}
          className="flex-1 resize-none px-3 py-2 border border-border rounded-lg bg-background text-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition max-h-32"
          style={{ minHeight: '40px' }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-50 shrink-0"
          title="Enviar"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
