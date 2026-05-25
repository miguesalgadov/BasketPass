import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const now = new Date();
const daysAgo  = (n: number) => new Date(now.getTime() - n * 86400000);
const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

async function main() {
  const hash = await bcrypt.hash('Admin1234!', 12);

  // ── Club ──────────────────────────────────────────────────────────────────
  const club = await prisma.club.upsert({
    where: { slug: 'club-demo' },
    update: {},
    create: { name: 'Club Demo Basket', slug: 'club-demo', plan: 'PRO' },
  });

  // ── Staff users ───────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: 'admin@demo.com' } },
    update: {},
    create: { clubId: club.id, email: 'admin@demo.com', passwordHash: hash, role: 'CLUB_ADMIN', firstName: 'Admin', lastName: 'Demo' },
  });

  const coach1 = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: 'coach@demo.com' } },
    update: {},
    create: { clubId: club.id, email: 'coach@demo.com', passwordHash: hash, role: 'COACH', firstName: 'Carlos', lastName: 'Entrenador', phone: '11-4500-1234' },
  });

  const coach2 = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: 'coach2@demo.com' } },
    update: {},
    create: { clubId: club.id, email: 'coach2@demo.com', passwordHash: hash, role: 'COACH', firstName: 'Miguel', lastName: 'López', phone: '11-4500-5678' },
  });

  // ── Teams ─────────────────────────────────────────────────────────────────
  const teamU18 = await prisma.team.upsert({
    where: { id: 'team-u18-demo' },
    update: {},
    create: { id: 'team-u18-demo', clubId: club.id, name: 'Los Tigres', category: 'U18', coachId: coach1.id, season: '2025/2026' },
  });

  const teamMayores = await prisma.team.upsert({
    where: { id: 'team-mayores-demo' },
    update: {},
    create: { id: 'team-mayores-demo', clubId: club.id, name: 'La Academia', category: 'Mayores', coachId: coach2.id, season: '2025/2026' },
  });

  const teamCadete = await prisma.team.upsert({
    where: { id: 'team-cadete-demo' },
    update: {},
    create: { id: 'team-cadete-demo', clubId: club.id, name: 'Los Leones', category: 'Cadete', coachId: coach1.id, season: '2025/2026' },
  });

  // ── Helper to upsert a player user + player record ────────────────────────
  async function upsertPlayer(
    email: string, first: string, last: string, phone: string,
    teamId: string, jersey: number, position: string,
    birthYear: number, height: number, weight: number,
  ) {
    const user = await prisma.user.upsert({
      where: { clubId_email: { clubId: club.id, email } },
      update: {},
      create: { clubId: club.id, email, passwordHash: hash, role: 'PLAYER', firstName: first, lastName: last, phone },
    });
    const player = await prisma.player.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id, teamId,
        jerseyNumber: jersey, position,
        birthDate: new Date(`${birthYear}-06-15`),
        height, weight,
      },
    });
    return { user, player };
  }

  // ── U18 — Los Tigres (8 jugadores) ────────────────────────────────────────
  const { player: p1 }  = await upsertPlayer('mateo.garcia@demo.com',    'Mateo',    'García',    '11-5511-0001', teamU18.id,     5, 'PG', 2008, 1.78, 72);
  const { player: p2 }  = await upsertPlayer('lucas.fernandez@demo.com', 'Lucas',    'Fernández', '11-5511-0002', teamU18.id,    10, 'SG', 2007, 1.82, 76);
  const { player: p3 }  = await upsertPlayer('nicolas.lopez@demo.com',   'Nicolás',  'López',     '11-5511-0003', teamU18.id,    14, 'SF', 2007, 1.86, 81);
  const { player: p4 }  = await upsertPlayer('santi.martinez@demo.com',  'Santiago', 'Martínez',  '11-5511-0004', teamU18.id,    23, 'PF', 2008, 1.91, 88);
  const { player: p5 }  = await upsertPlayer('benja.rodriguez@demo.com', 'Benjamín', 'Rodríguez', '11-5511-0005', teamU18.id,    33, 'C',  2007, 1.95, 96);
  const { player: p6 }  = await upsertPlayer('thiago.gonzalez@demo.com', 'Thiago',   'González',  '11-5511-0006', teamU18.id,     4, 'PG', 2009, 1.75, 68);
  const { player: p7 }  = await upsertPlayer('agustin.torres@demo.com',  'Agustín',  'Torres',    '11-5511-0007', teamU18.id,     7, 'SG', 2008, 1.80, 74);
  const { player: p8 }  = await upsertPlayer('facundo.diaz@demo.com',    'Facundo',  'Díaz',      '11-5511-0008', teamU18.id,    21, 'SF', 2007, 1.84, 79);

  // ── Mayores — La Academia (8 jugadores) ───────────────────────────────────
  const { player: p9 }  = await upsertPlayer('pablo.herrera@demo.com',   'Pablo',    'Herrera',   '11-5522-0001', teamMayores.id,  8, 'PG', 1998, 1.80, 78);
  const { player: p10 } = await upsertPlayer('diego.romero@demo.com',    'Diego',    'Romero',    '11-5522-0002', teamMayores.id, 11, 'SG', 1996, 1.84, 82);
  const { player: p11 } = await upsertPlayer('matias.sosa@demo.com',     'Matías',   'Sosa',      '11-5522-0003', teamMayores.id, 15, 'SF', 1997, 1.88, 85);
  const { player: p12 } = await upsertPlayer('andres.molina@demo.com',   'Andrés',   'Molina',    '11-5522-0004', teamMayores.id, 24, 'PF', 1995, 1.93, 93);
  const { player: p13 } = await upsertPlayer('roberto.alvarez@demo.com', 'Roberto',  'Álvarez',   '11-5522-0005', teamMayores.id, 42, 'C',  1994, 1.98, 102);
  const { player: p14 } = await upsertPlayer('javier.castro@demo.com',   'Javier',   'Castro',    '11-5522-0006', teamMayores.id,  3, 'PG', 1999, 1.77, 74);
  const { player: p15 } = await upsertPlayer('ramiro.gimenez@demo.com',  'Ramiro',   'Giménez',   '11-5522-0007', teamMayores.id, 12, 'SG', 1997, 1.83, 80);
  const { player: p16 } = await upsertPlayer('gonzalo.pereyra@demo.com', 'Gonzalo',  'Pereyra',   '11-5522-0008', teamMayores.id, 22, 'SF', 1996, 1.87, 86);

  // ── Cadete — Los Leones (6 jugadores) ────────────────────────────────────
  const { player: p17 } = await upsertPlayer('franco.ruiz@demo.com',     'Franco',   'Ruiz',      '11-5533-0001', teamCadete.id,  6, 'PG', 2011, 1.68, 58);
  const { player: p18 } = await upsertPlayer('emilio.vargas@demo.com',   'Emilio',   'Vargas',    '11-5533-0002', teamCadete.id,  9, 'SG', 2011, 1.71, 61);
  const { player: p19 } = await upsertPlayer('tomas.mora@demo.com',      'Tomás',    'Mora',      '11-5533-0003', teamCadete.id, 17, 'SF', 2010, 1.74, 65);
  const { player: p20 } = await upsertPlayer('ignacio.salinas@demo.com', 'Ignacio',  'Salinas',   '11-5533-0004', teamCadete.id, 25, 'PF', 2010, 1.79, 70);
  const { player: p21 } = await upsertPlayer('leandro.rios@demo.com',    'Leandro',  'Ríos',      '11-5533-0005', teamCadete.id, 35, 'C',  2011, 1.82, 77);
  const { player: p22 } = await upsertPlayer('braian.suarez@demo.com',   'Braian',   'Suárez',    '11-5533-0006', teamCadete.id,  2, 'PG', 2012, 1.65, 55);

  // Jugador con cuenta login para probar el rol PLAYER
  const { player: jugadorDemo } = await upsertPlayer(
    'jugador@demo.com', 'Juan', 'Jugador', '11-5500-0000',
    teamU18.id, 99, 'SG', 2007, 1.81, 75,
  );

  // ── Partidos pasados (COMPLETED) ──────────────────────────────────────────
  const match1 = await prisma.match.upsert({
    where: { id: 'match-001' },
    update: {},
    create: { id: 'match-001', teamId: teamU18.id,     opponent: 'Los Pumas BC',      date: daysAgo(28), location: 'Gimnasio Principal', isHome: true,  scoreHome: 72, scoreAway: 58, status: 'COMPLETED' },
  });
  const match2 = await prisma.match.upsert({
    where: { id: 'match-002' },
    update: {},
    create: { id: 'match-002', teamId: teamU18.id,     opponent: 'Club Atlético Sur', date: daysAgo(14), location: 'Polideportivo Sur',   isHome: false, scoreHome: 61, scoreAway: 45, status: 'COMPLETED' },
  });
  const match3 = await prisma.match.upsert({
    where: { id: 'match-003' },
    update: {},
    create: { id: 'match-003', teamId: teamMayores.id, opponent: 'Ciudad Basket',     date: daysAgo(21), location: 'Gimnasio Principal', isHome: true,  scoreHome: 85, scoreAway: 72, status: 'COMPLETED' },
  });
  const match4 = await prisma.match.upsert({
    where: { id: 'match-004' },
    update: {},
    create: { id: 'match-004', teamId: teamMayores.id, opponent: 'Ferro Básquet',     date: daysAgo(7),  location: 'Club Ferro',         isHome: false, scoreHome: 78, scoreAway: 80, status: 'COMPLETED' },
  });
  const match5 = await prisma.match.upsert({
    where: { id: 'match-005' },
    update: {},
    create: { id: 'match-005', teamId: teamCadete.id,  opponent: 'Academia Junior',   date: daysAgo(10), location: 'Gimnasio Principal', isHome: true,  scoreHome: 54, scoreAway: 48, status: 'COMPLETED' },
  });

  // ── Partidos próximos (SCHEDULED) ─────────────────────────────────────────
  await prisma.match.upsert({
    where: { id: 'match-006' },
    update: {},
    create: { id: 'match-006', teamId: teamU18.id,     opponent: 'Basket Norte',      date: daysAhead(5),  location: 'Gimnasio Principal', isHome: true  },
  });
  await prisma.match.upsert({
    where: { id: 'match-007' },
    update: {},
    create: { id: 'match-007', teamId: teamMayores.id, opponent: 'Los Cóndores',      date: daysAhead(8),  location: 'Club Los Cóndores',  isHome: false },
  });
  await prisma.match.upsert({
    where: { id: 'match-008' },
    update: {},
    create: { id: 'match-008', teamId: teamCadete.id,  opponent: 'Club Vélez Jr',     date: daysAhead(12), location: 'Gimnasio Principal', isHome: true  },
  });
  await prisma.match.upsert({
    where: { id: 'match-009' },
    update: {},
    create: { id: 'match-009', teamId: teamU18.id,     opponent: 'River Básquet U18', date: daysAhead(19), location: 'Estadio Monumental', isHome: false },
  });

  // ── Entrenamientos pasados ────────────────────────────────────────────────
  const tr1 = await prisma.training.upsert({
    where: { id: 'tr-001' },
    update: {},
    create: { id: 'tr-001', teamId: teamU18.id,     date: daysAgo(3),  duration: 90, location: 'Gimnasio Principal', plan: 'Tiro libre y 3 puntos. Fundamentos defensivos.', coachNotes: 'Buena concentración en el tiro.' },
  });
  const tr2 = await prisma.training.upsert({
    where: { id: 'tr-002' },
    update: {},
    create: { id: 'tr-002', teamId: teamU18.id,     date: daysAgo(6),  duration: 90, location: 'Gimnasio Principal', plan: 'Bloqueo y continuación. Pick & roll ofensivo.', coachNotes: 'Falló la comunicación en defensa.' },
  });
  const tr3 = await prisma.training.upsert({
    where: { id: 'tr-003' },
    update: {},
    create: { id: 'tr-003', teamId: teamMayores.id, date: daysAgo(4),  duration: 100, location: 'Gimnasio Principal', plan: 'Repaso sistema ofensivo. Sets de ataque posicional.', coachNotes: 'Excelente ritmo, equipo muy enfocado.' },
  });
  const tr4 = await prisma.training.upsert({
    where: { id: 'tr-004' },
    update: {},
    create: { id: 'tr-004', teamId: teamCadete.id,  date: daysAgo(5),  duration: 75, location: 'Gimnasio Auxiliar',  plan: 'Conducción y pase. Trabajo físico diferenciado.', coachNotes: 'Los más jóvenes necesitan mejorar el pase de pecho.' },
  });

  // ── Entrenamientos futuros ────────────────────────────────────────────────
  await prisma.training.upsert({
    where: { id: 'tr-005' },
    update: {},
    create: { id: 'tr-005', teamId: teamU18.id,     date: daysAhead(2), duration: 90,  location: 'Gimnasio Principal', plan: 'Preparación partido vs Basket Norte. Defensa zonal 2-3.' },
  });
  await prisma.training.upsert({
    where: { id: 'tr-006' },
    update: {},
    create: { id: 'tr-006', teamId: teamMayores.id, date: daysAhead(3), duration: 100, location: 'Gimnasio Principal', plan: 'Transición rápida y contra-ataque. Video análisis rival.' },
  });
  await prisma.training.upsert({
    where: { id: 'tr-007' },
    update: {},
    create: { id: 'tr-007', teamId: teamCadete.id,  date: daysAhead(4), duration: 75,  location: 'Gimnasio Auxiliar',  plan: 'Entrada con layup. Mate. Tiro en suspensión corto.' },
  });

  // ── Asistencias (partidos pasados) ────────────────────────────────────────
  const u18Players   = [p1, p2, p3, p4, p5, p6, p7, p8, jugadorDemo];
  const mayPlayers   = [p9, p10, p11, p12, p13, p14, p15, p16];
  const cadPlayers   = [p17, p18, p19, p20, p21, p22];

  async function seedMatchAttendances(matchId: string, players: typeof u18Players, absentIdx: number[] = []) {
    for (let i = 0; i < players.length; i++) {
      await prisma.attendance.upsert({
        where: { id: `att-m-${matchId}-${players[i].id}` },
        update: {},
        create: {
          id: `att-m-${matchId}-${players[i].id}`,
          playerId: players[i].id, matchId,
          status: absentIdx.includes(i) ? 'ABSENT' : i % 7 === 0 ? 'LATE' : 'PRESENT',
        },
      });
    }
  }

  async function seedTrainingAttendances(trainingId: string, players: typeof u18Players, absentIdx: number[] = []) {
    for (let i = 0; i < players.length; i++) {
      await prisma.attendance.upsert({
        where: { id: `att-t-${trainingId}-${players[i].id}` },
        update: {},
        create: {
          id: `att-t-${trainingId}-${players[i].id}`,
          playerId: players[i].id, trainingId,
          status: absentIdx.includes(i) ? 'ABSENT' : i % 9 === 0 ? 'EXCUSED' : 'PRESENT',
        },
      });
    }
  }

  await seedMatchAttendances(match1.id, u18Players, [5]);
  await seedMatchAttendances(match2.id, u18Players, [2, 7]);
  await seedMatchAttendances(match3.id, mayPlayers, [3]);
  await seedMatchAttendances(match4.id, mayPlayers, [6]);
  await seedMatchAttendances(match5.id, cadPlayers, [1]);

  await seedTrainingAttendances(tr1.id, u18Players, [3]);
  await seedTrainingAttendances(tr2.id, u18Players, []);
  await seedTrainingAttendances(tr3.id, mayPlayers, [5]);
  await seedTrainingAttendances(tr4.id, cadPlayers, [2]);

  // ── Estadísticas (partidos completados U18) ───────────────────────────────
  type StatRow = [typeof p1, number, number, number, number, number, number, number, number];
  const statsM1: StatRow[] = [
    [p1,          18, 5, 6, 2, 0, 3, 2, 28],
    [p2,          14, 3, 2, 1, 0, 2, 1, 24],
    [p3,          12, 6, 1, 0, 1, 1, 3, 26],
    [p4,           8, 8, 0, 0, 2, 2, 4, 22],
    [p5,          10, 9, 1, 0, 3, 1, 3, 25],
    [p6,           5, 2, 4, 3, 0, 2, 2, 18],
    [p7,           3, 1, 2, 1, 0, 1, 1, 15],
    [p8,           2, 2, 1, 0, 0, 0, 2, 12],
    [jugadorDemo, 11, 4, 3, 1, 0, 2, 2, 22],
  ];
  const statsM2: StatRow[] = [
    [p1,           8, 3, 4, 1, 0, 3, 3, 26],
    [p2,           9, 2, 1, 2, 0, 2, 2, 22],
    [p3,           6, 4, 0, 0, 0, 2, 3, 20],
    [p4,           5, 5, 1, 0, 1, 3, 4, 24],
    [p5,           7, 7, 0, 0, 2, 1, 2, 22],
    [p6,           4, 1, 3, 2, 0, 2, 2, 16],
    [p8,           3, 2, 0, 1, 0, 0, 1, 14],
    [jugadorDemo,  3, 2, 1, 0, 0, 2, 3, 20],
  ];

  async function seedStats(matchId: string, rows: StatRow[]) {
    for (const [player, pts, reb, ast, stl, blk, to, fouls, min] of rows) {
      await prisma.playerStat.upsert({
        where: { playerId_matchId: { playerId: player.id, matchId } },
        update: {},
        create: { playerId: player.id, matchId, points: pts, rebounds: reb, assists: ast, steals: stl, blocks: blk, turnovers: to, fouls, minutes: min },
      });
    }
  }

  await seedStats(match1.id, statsM1);
  await seedStats(match2.id, statsM2);

  // Mayores stats for match3
  const statsM3: StatRow[] = [
    [p9,  22, 4, 8, 3, 0, 2, 2, 32],
    [p10, 18, 3, 3, 1, 0, 3, 3, 30],
    [p11, 14, 6, 1, 2, 0, 1, 2, 28],
    [p12, 10, 9, 2, 0, 2, 2, 4, 25],
    [p13,  8,12, 1, 0, 4, 1, 3, 27],
    [p14,  7, 2, 5, 2, 0, 2, 1, 22],
    [p15,  4, 1, 2, 1, 0, 1, 2, 18],
    [p16,  2, 3, 1, 0, 0, 0, 2, 14],
  ];
  await seedStats(match3.id, statsM3);

  // ── Pagos ─────────────────────────────────────────────────────────────────
  type PaymentRow = [typeof p1 | null, string, number, string, string, Date | undefined, Date | undefined];
  const paymentsData: PaymentRow[] = [
    // Pagados
    [p1,          'Cuota Marzo 2026',  8500, 'ARS', 'PAID',    daysAgo(60), daysAgo(55)],
    [p2,          'Cuota Marzo 2026',  8500, 'ARS', 'PAID',    daysAgo(60), daysAgo(50)],
    [p3,          'Cuota Marzo 2026',  8500, 'ARS', 'PAID',    daysAgo(60), daysAgo(48)],
    [p9,          'Cuota Marzo 2026',  9500, 'ARS', 'PAID',    daysAgo(60), daysAgo(52)],
    [p10,         'Cuota Marzo 2026',  9500, 'ARS', 'PAID',    daysAgo(60), daysAgo(49)],
    [p1,          'Cuota Abril 2026',  8500, 'ARS', 'PAID',    daysAgo(30), daysAgo(25)],
    [p2,          'Cuota Abril 2026',  8500, 'ARS', 'PAID',    daysAgo(30), daysAgo(22)],
    [p9,          'Cuota Abril 2026',  9500, 'ARS', 'PAID',    daysAgo(30), daysAgo(28)],
    [p17,         'Cuota Abril 2026',  7000, 'ARS', 'PAID',    daysAgo(30), daysAgo(20)],
    [null,        'Seguro grupal 2026', 45000, 'ARS', 'PAID',  daysAgo(90), daysAgo(85)],
    // Pendientes
    [p3,          'Cuota Abril 2026',  8500, 'ARS', 'PENDING', daysAgo(30), undefined],
    [p4,          'Cuota Abril 2026',  8500, 'ARS', 'PENDING', daysAhead(5), undefined],
    [p5,          'Cuota Abril 2026',  8500, 'ARS', 'PENDING', daysAhead(5), undefined],
    [p10,         'Cuota Abril 2026',  9500, 'ARS', 'PENDING', daysAhead(3), undefined],
    [p11,         'Cuota Abril 2026',  9500, 'ARS', 'PENDING', daysAhead(3), undefined],
    [jugadorDemo, 'Cuota Abril 2026',  8500, 'ARS', 'PENDING', daysAhead(5), undefined],
    // Vencidos
    [p6,          'Cuota Marzo 2026',  8500, 'ARS', 'OVERDUE', daysAgo(30), undefined],
    [p7,          'Cuota Marzo 2026',  8500, 'ARS', 'OVERDUE', daysAgo(30), undefined],
    [p12,         'Cuota Febrero 2026', 9500, 'ARS', 'OVERDUE', daysAgo(60), undefined],
    [p18,         'Cuota Marzo 2026',  7000, 'ARS', 'OVERDUE', daysAgo(30), undefined],
    // Mayo (todos pendientes)
    [p1,          'Cuota Mayo 2026',   8500, 'ARS', 'PENDING', daysAhead(15), undefined],
    [p2,          'Cuota Mayo 2026',   8500, 'ARS', 'PENDING', daysAhead(15), undefined],
    [p9,          'Cuota Mayo 2026',   9500, 'ARS', 'PENDING', daysAhead(15), undefined],
  ];

  for (const [player, concept, amount, currency, status, dueDate, paidAt] of paymentsData) {
    await prisma.payment.create({
      data: {
        clubId: club.id,
        playerId: player?.id ?? undefined,
        concept, amount, currency, status,
        dueDate, paidAt,
      },
    }).catch(() => {}); // skip duplicates on re-seed
  }

  // ── Documentos ────────────────────────────────────────────────────────────
  const docs = [
    { playerId: p1.id,  title: 'DNI Mateo García',        type: 'DNI',          fileUrl: 'https://drive.google.com/file/demo1' },
    { playerId: p2.id,  title: 'DNI Lucas Fernández',     type: 'DNI',          fileUrl: 'https://drive.google.com/file/demo2' },
    { playerId: p9.id,  title: 'Ficha médica Pablo Herrera', type: 'FICHA_MEDICA', fileUrl: 'https://drive.google.com/file/demo3', expiresAt: daysAhead(180) },
    { playerId: p10.id, title: 'Ficha médica Diego Romero',  type: 'FICHA_MEDICA', fileUrl: 'https://drive.google.com/file/demo4', expiresAt: daysAhead(20)  },
    { playerId: null,   title: 'Contrato temporada 2025/26', type: 'CONTRATO',  fileUrl: 'https://drive.google.com/file/demo5', expiresAt: daysAhead(240) },
    { playerId: null,   title: 'Seguro colectivo del club',  type: 'SEGURO',    fileUrl: 'https://drive.google.com/file/demo6', expiresAt: daysAhead(10)  },
    { playerId: p4.id,  title: 'Autorización menor Santiago Martínez', type: 'AUTORIZACION', fileUrl: 'https://drive.google.com/file/demo7' },
    { playerId: p17.id, title: 'Autorización menor Franco Ruiz',       type: 'AUTORIZACION', fileUrl: 'https://drive.google.com/file/demo8' },
  ];

  for (const doc of docs) {
    await prisma.document.create({
      data: { clubId: club.id, ...doc },
    }).catch(() => {});
  }

  // ── FeeType (Club Demo) ───────────────────────────────────────────────────
  const feeType = await prisma.feeType.upsert({
    where: { id: 'feetype-cuota-mensual' },
    update: {},
    create: {
      id:            'feetype-cuota-mensual',
      clubId:        club.id,
      name:          'Cuota mensual',
      amount:        12000,
      currency:      'CLP',
      isRecurring:   true,
      dueDayOfMonth: 5,
    },
  });

  // ── Fees (Jan–May 2026 for Club Demo players) ─────────────────────────────
  const demoPlayers = await prisma.player.findMany({
    where: { user: { clubId: club.id }, isActive: true },
    select: { id: true },
  });

  const currentYear = 2026;
  const feeStatusByMonth = (playerIdx: number, month: number): string => {
    if (month <= 3)  return playerIdx % 5 === 0 ? 'OVERDUE' : 'PAID';
    if (month === 4) return playerIdx % 4 === 0 ? 'OVERDUE' : playerIdx % 3 === 0 ? 'PENDING' : 'PAID';
    if (month === 5) return playerIdx % 3 === 0 ? 'PENDING' : playerIdx % 7 === 0 ? 'OVERDUE' : 'PENDING';
    return 'PENDING';
  };

  for (let idx = 0; idx < demoPlayers.length; idx++) {
    const player = demoPlayers[idx];
    for (let month = 1; month <= 5; month++) {
      const dueDate = new Date(currentYear, month - 1, feeType.dueDayOfMonth);
      const status  = feeStatusByMonth(idx, month);
      const paidAt  = status === 'PAID' ? new Date(currentYear, month - 1, Math.floor(Math.random() * 10) + 1) : null;
      try {
        await prisma.fee.upsert({
          where: { playerId_feeTypeId_year_month: { playerId: player.id, feeTypeId: feeType.id, year: currentYear, month } },
          update: {},
          create: {
            clubId:    club.id,
            playerId:  player.id,
            feeTypeId: feeType.id,
            year:      currentYear,
            month,
            amount:    feeType.amount,
            dueDate,
            status,
            ...(paidAt && { paidAt, paidAmount: feeType.amount, paymentMethod: ['CASH','TRANSFER','MERCADOPAGO'][month % 3] }),
          },
        });
      } catch { /* skip duplicates */ }
    }
  }

  // ── CD Panteras (club propio) ─────────────────────────────────────────────
  const clubPanteras = await prisma.club.upsert({
    where: { slug: 'cd-panteras' },
    update: {},
    create: { name: 'CD Panteras', slug: 'cd-panteras', plan: 'PRO', primaryColor: '#F97316' },
  });

  const adminPanteras = await prisma.user.upsert({
    where: { clubId_email: { clubId: clubPanteras.id, email: 'admin@panteras.com' } },
    update: {},
    create: { clubId: clubPanteras.id, email: 'admin@panteras.com', passwordHash: hash, role: 'CLUB_ADMIN', firstName: 'Admin', lastName: 'Panteras' },
  });

  const coachRojas = await prisma.user.upsert({
    where: { clubId_email: { clubId: clubPanteras.id, email: 'ivan.rojas@panteras.com' } },
    update: {},
    create: { clubId: clubPanteras.id, email: 'ivan.rojas@panteras.com', passwordHash: hash, role: 'COACH', firstName: 'Ivan', lastName: 'Rojas' },
  });

  const teamPanteras = await prisma.team.upsert({
    where: { id: 'team-panteras' },
    update: {},
    create: { id: 'team-panteras', clubId: clubPanteras.id, name: 'Panteras', category: 'Mayores', coachId: coachRojas.id, season: '2025/2026' },
  });

  const panterasData = [
    // [email, firstName, lastName, jersey, birthDate]
    ['fernando.bravo@panteras.com',     'Fernando Esteban',        'Bravo Valdebenito',    19, '1983-08-22'],
    ['carlos.delgado@panteras.com',     'Carlos Ignacio',          'Delgado Sanhueza',     12, '1983-08-29'],
    ['baldomero.duran@panteras.com',    'Baldomero Antonio',       'Duran Muñoz',          17, '1978-10-11'],
    ['alvaro.gonzalez@panteras.com',    'Alvaro Camilo',           'Gonzalez Pachero',     13, '1985-03-09'],
    ['humberto.guzman@panteras.com',    'Humberto Maximiliano',    'Guzmán Sánchez',       15, '1985-08-15'],
    ['miguel.jaque@panteras.com',       'Miguel Ángel Arnaldo',    'Jaque Parra',           2, '1987-09-25'],
    ['nicolas.matthei@panteras.com',    'Nicolás Francisco',       'Matthei Salvo',        21, '1973-07-27'],
    ['felipe.pena@panteras.com',        'Felipe Andrés',           'Peña Palma',            8, '1987-11-12'],
    ['juan.pezoa@panteras.com',         'Juan Eduardo',            'Pezoa Stark',           1, '1987-08-13'],
    ['david.romero@panteras.com',       'David Ignacio',           'Romero Jara',           7, '1986-06-13'],
    ['josemiguel.salazar@panteras.com', 'José Miguel',             'Salazar Caro',          9, '1984-09-29'],
    ['miguel.salgado@panteras.com',     'Miguel René',             'Salgado Vargas',       10, '1985-07-19'],
    ['jose.sanchez@panteras.com',       'José Manuel',             'Sanchez Espinoza',     14, '1983-03-29'],
    ['pablo.sandoval@panteras.com',     'Pablo Andrés',            'Sandoval Mandujano',    5, '1983-11-10'],
    ['hugo.sansana@panteras.com',       'Hugo Patricio',           'Sansana Ormeño',       23, '1990-07-09'],
    ['roberto.valdebenito@panteras.com','Roberto Enrique',         'Valdebenito Ruiz',     11, '1985-10-17'],
  ] as const;

  const panterasPlayers: { id: string }[] = [];
  for (const [email, firstName, lastName, jersey, birthDate] of panterasData) {
    const u = await prisma.user.upsert({
      where: { clubId_email: { clubId: clubPanteras.id, email } },
      update: {},
      create: { clubId: clubPanteras.id, email, passwordHash: hash, role: 'PLAYER', firstName, lastName },
    });
    const pl = await prisma.player.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, teamId: teamPanteras.id, jerseyNumber: jersey, birthDate: new Date(birthDate) },
    });
    panterasPlayers.push(pl);
  }

  // ── FeeType para CD Panteras (solo la estructura, sin generar cuotas) ──────
  await prisma.feeType.upsert({
    where: { id: 'feetype-panteras-mensual' },
    update: {},
    create: {
      id:            'feetype-panteras-mensual',
      clubId:        clubPanteras.id,
      name:          'Cuota mensual',
      amount:        15000,
      currency:      'CLP',
      isRecurring:   true,
      dueDayOfMonth: 5,
    },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completado\n');
  console.log('── Club Demo Basket ────────────────────────────────');
  console.log('  admin@demo.com          → CLUB_ADMIN');
  console.log('  coach@demo.com          → COACH  (Los Tigres + Los Leones)');
  console.log('  coach2@demo.com         → COACH  (La Academia)');
  console.log('  jugador@demo.com        → PLAYER (Los Tigres, #99)');
  console.log('');
  console.log('── CD Panteras ─────────────────────────────────────');
  console.log('  admin@panteras.com      → CLUB_ADMIN');
  console.log('  ivan.rojas@panteras.com → COACH  (Panteras)');
  console.log('  [16 jugadores]          → PLAYER (sin datos inventados)');
  console.log('');
  console.log('  Contraseña (todos):  Admin1234!');
  console.log('');
  console.log('── Equipos ────────────────────────────────────────');
  console.log('  Los Tigres   U18      — 9 jugadores  (Club Demo)');
  console.log('  La Academia  Mayores  — 8 jugadores  (Club Demo)');
  console.log('  Los Leones   Cadete   — 6 jugadores  (Club Demo)');
  console.log('  Panteras     Mayores  — 16 jugadores (CD Panteras)');
  console.log('');
  console.log('── Datos generados ────────────────────────────────');
  console.log('  9 partidos (5 completados, 4 próximos) — solo Club Demo');
  console.log('  7 entrenamientos (4 pasados, 3 próximos) — solo Club Demo');
  console.log('  Asistencias, estadísticas y pagos incluidos');
  console.log('  8 documentos de ejemplo');
  console.log('  FeeTypes + cuotas Ene–May 2026 — solo Club Demo');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
