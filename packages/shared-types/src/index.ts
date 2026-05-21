// Enums
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLUB_ADMIN = 'CLUB_ADMIN',
  COACH = 'COACH',
  PLAYER = 'PLAYER',
  PARENT = 'PARENT',
}

export enum Plan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Entity types
export interface Club {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  plan: Plan;
  planExpiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  clubId: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser extends User {
  club: Club;
}

export interface Player {
  id: string;
  userId: string;
  teamId?: string;
  jerseyNumber?: number;
  position?: string;
  birthDate?: Date;
  height?: number;
  weight?: number;
  documentUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  team?: Team;
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  category: string;
  coachId?: string;
  season: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  coach?: User;
  players?: Player[];
}

export interface Match {
  id: string;
  teamId: string;
  opponent: string;
  date: Date;
  location?: string;
  isHome: boolean;
  scoreHome?: number;
  scoreAway?: number;
  status: MatchStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  team?: Team;
}

export interface Training {
  id: string;
  teamId: string;
  date: Date;
  duration: number;
  location?: string;
  plan?: string;
  coachNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  team?: Team;
}

export interface Attendance {
  id: string;
  playerId: string;
  matchId?: string;
  trainingId?: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  player?: Player;
}

export interface PlayerStat {
  id: string;
  playerId: string;
  matchId: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes: number;
  createdAt: Date;
  updatedAt: Date;
  player?: Player;
  match?: Match;
}

export interface Payment {
  id: string;
  clubId: string;
  playerId?: string;
  amount: number;
  currency: string;
  concept: string;
  status: PaymentStatus;
  mpPaymentId?: string;
  mpOrderId?: string;
  dueDate?: Date;
  paidAt?: Date;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  player?: Player;
}

export interface Subscription {
  id: string;
  clubId: string;
  plan: Plan;
  status: SubscriptionStatus;
  mpSubId?: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Injury {
  id: string;
  playerId: string;
  description: string;
  injuredAt: Date;
  returnDate?: Date;
  severity?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  player?: Player;
}

export interface Document {
  id: string;
  clubId: string;
  playerId?: string;
  title: string;
  fileUrl: string;
  type: string;
  uploadedAt: Date;
  expiresAt?: Date;
}

export interface Equipment {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  quantity: number;
  assignedTo?: string;
  condition?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  teamId?: string;
  content: string;
  createdAt: Date;
  sender?: User;
}

// Auth DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterClubDto {
  clubName: string;
  clubSlug: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  clubId: string;
}

// Plan limits
export const PLAN_LIMITS: Record<Plan, { teams: number; players: number }> = {
  [Plan.FREE]: { teams: 1, players: 15 },
  [Plan.STARTER]: { teams: 3, players: 50 },
  [Plan.PRO]: { teams: 10, players: 200 },
  [Plan.ENTERPRISE]: { teams: -1, players: -1 }, // unlimited
};

export const PLAN_PRICES: Record<Plan, { monthly: number; annual: number; currency: string }> = {
  [Plan.FREE]: { monthly: 0, annual: 0, currency: 'ARS' },
  [Plan.STARTER]: { monthly: 5000, annual: 50000, currency: 'ARS' },
  [Plan.PRO]: { monthly: 15000, annual: 150000, currency: 'ARS' },
  [Plan.ENTERPRISE]: { monthly: 40000, annual: 400000, currency: 'ARS' },
};
