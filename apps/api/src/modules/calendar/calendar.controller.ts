import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { env } from '@/config/env';
import { trainingsRepository } from '@/modules/trainings/trainings.repository';
import { matchesRepository } from '@/modules/matches/matches.repository';

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

function esc(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function fold(line: string): string {
  // RFC 5545: fold lines longer than 75 octets
  const out: string[] = [];
  while (line.length > 75) {
    out.push(line.slice(0, 75));
    line = ' ' + line.slice(75);
  }
  out.push(line);
  return out.join('\r\n');
}

export const calendarController = {
  // Authenticated — returns a long-lived token for the ICS feed
  async getToken(req: AuthenticatedRequest, res: Response) {
    const teamId = req.query.teamId as string | undefined;
    const token = jwt.sign(
      { clubId: req.user!.clubId, ...(teamId && { teamId }), purpose: 'calendar-feed' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '365d' },
    );
    res.json({ success: true, data: { token } });
  },

  // Public — verify query token, return iCalendar (.ics) feed
  async getFeed(req: Request, res: Response) {
    const { token, teamId } = req.query as { token?: string; teamId?: string };
    if (!token) return res.status(401).send('Token required');

    let payload: { clubId: string; teamId?: string; purpose: string };
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as typeof payload;
      if (payload.purpose !== 'calendar-feed') throw new Error('bad purpose');
    } catch {
      return res.status(401).send('Invalid or expired token');
    }

    const clubId = payload.clubId;
    const resolvedTeamId = teamId || payload.teamId;

    const [trainings, matches] = await Promise.all([
      trainingsRepository.findAll(clubId, resolvedTeamId),
      matchesRepository.findAll(clubId, resolvedTeamId),
    ]);

    const calName = resolvedTeamId
      ? (trainings[0]?.team?.name ?? 'BasketPass')
      : 'BasketPass';

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BasketPass//Calendar//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc(calName)}`,
      'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
    ];

    const now = toIcsDate(new Date());

    for (const t of trainings) {
      const start = new Date(t.date);
      const end   = new Date(start.getTime() + t.duration * 60_000);
      const summary = `💪 Entrenamiento — ${t.team?.name ?? 'Equipo'}`;
      const desc = [
        t.team?.category,
        t.plan,
        t.coachNotes,
      ].filter(Boolean).join(' | ');

      lines.push('BEGIN:VEVENT');
      lines.push(fold(`UID:training-${t.id}@basketpass`));
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${toIcsDate(start)}`);
      lines.push(`DTEND:${toIcsDate(end)}`);
      lines.push(fold(`SUMMARY:${esc(summary)}`));
      if (t.location) lines.push(fold(`LOCATION:${esc(t.location)}`));
      if (desc)       lines.push(fold(`DESCRIPTION:${esc(desc)}`));
      lines.push('END:VEVENT');
    }

    for (const m of matches) {
      const start = new Date(m.date);
      const end   = new Date(start.getTime() + 90 * 60_000);
      const summary = `🏀 ${m.team?.name ?? ''} vs. ${m.opponent}`;
      const desc = [
        m.isHome ? 'Local' : 'Visitante',
        m.status === 'COMPLETED' && m.scoreHome != null
          ? `Resultado: ${m.scoreHome}-${m.scoreAway}`
          : m.status,
      ].filter(Boolean).join(' | ');

      lines.push('BEGIN:VEVENT');
      lines.push(fold(`UID:match-${m.id}@basketpass`));
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${toIcsDate(start)}`);
      lines.push(`DTEND:${toIcsDate(end)}`);
      lines.push(fold(`SUMMARY:${esc(summary)}`));
      if (m.location) lines.push(fold(`LOCATION:${esc(m.location)}`));
      lines.push(fold(`DESCRIPTION:${esc(desc)}`));
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="basketpass.ics"');
    res.send(lines.join('\r\n'));
  },
};
