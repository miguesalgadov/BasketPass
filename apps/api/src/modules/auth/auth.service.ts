import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { authRepository } from './auth.repository';
import { LoginDto, RegisterClubDto } from './auth.schema';

const SALT_ROUNDS = 12;

function generateTokens(payload: { sub: string; email: string; role: string; clubId: string }) {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });

  const refreshToken = jwt.sign({ sub: payload.sub }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async login(dto: LoginDto) {
    const user = await authRepository.findUserByEmailGlobal(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      const err = new Error('Invalid email or password');
      (err as any).statusCode = 401;
      throw Object.assign(err, { code: 'INVALID_CREDENTIALS' });
    }

    if (!user.isActive) {
      const err = new Error('Account is deactivated');
      (err as any).statusCode = 403;
      throw Object.assign(err, { code: 'ACCOUNT_DEACTIVATED' });
    }

    const tokens = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId,
    });

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken(user.id, tokens.refreshToken, refreshExpiresAt);
    await authRepository.updateLastLogin(user.id);

    const { passwordHash: _p, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  },

  async registerClub(dto: RegisterClubDto) {
    const existingClub = await authRepository.findClubBySlug(dto.clubSlug);
    if (existingClub) {
      const err = new Error('Club slug is already taken');
      (err as any).statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, SALT_ROUNDS);

    const { club, user } = await authRepository.createClubWithAdmin({
      clubName: dto.clubName,
      clubSlug: dto.clubSlug,
      adminEmail: dto.adminEmail,
      passwordHash,
      adminFirstName: dto.adminFirstName,
      adminLastName: dto.adminLastName,
      adminPhone: dto.adminPhone,
    });

    const tokens = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      clubId: club.id,
    });

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken(user.id, tokens.refreshToken, refreshExpiresAt);

    const { passwordHash: _p, ...safeUser } = user;
    return { club, user: safeUser, ...tokens };
  },

  async refreshTokens(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
      const err = new Error('Invalid refresh token');
      (err as any).statusCode = 401;
      throw err;
    }

    const stored = await authRepository.findRefreshToken(refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      const err = new Error('Refresh token expired or not found');
      (err as any).statusCode = 401;
      throw err;
    }

    await authRepository.deleteRefreshToken(refreshToken);

    const { user } = stored;
    const tokens = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId,
    });

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken(user.id, tokens.refreshToken, refreshExpiresAt);

    return tokens;
  },

  async logout(refreshToken: string) {
    try {
      await authRepository.deleteRefreshToken(refreshToken);
    } catch {
      // already deleted
    }
  },
};
