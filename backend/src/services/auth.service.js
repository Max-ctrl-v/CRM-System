const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** SHA-256 hash a token for safe DB storage */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/** Create a new session (refresh token row) for the user */
async function createSession(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }),
    // Clean up expired tokens for this user
    prisma.refreshToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Ungültige Anmeldedaten.', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Ungültige Anmeldedaten.', 401);

  // If 2FA is enabled, return a temp token instead
  if (user.totpEnabled) {
    const tempToken = jwt.sign(
      { id: user.id, purpose: '2fa' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return { requires2FA: true, tempToken };
  }

  return createSession(user);
}

async function verify2FA(tempToken, code) {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, JWT_SECRET);
  } catch {
    throw new AppError('Token abgelaufen. Bitte erneut anmelden.', 401);
  }
  if (decoded.purpose !== '2fa') throw new AppError('Ungültiges Token.', 401);

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.totpSecret) throw new AppError('2FA nicht konfiguriert.', 400);

  const { verifySync } = require('../utils/totp');
  const valid = verifySync(code, user.totpSecret);
  if (!valid) throw new AppError('Ungültiger 2FA-Code.', 401);

  return createSession(user);
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new AppError('Kein Refresh-Token.', 401);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Ungültiges Refresh-Token.', 401);
  }

  const hashed = hashToken(refreshToken);

  // Look up session in RefreshToken table
  const session = await prisma.refreshToken.findUnique({ where: { tokenHash: hashed } });

  if (session) {
    // Multi-device session found — issue new access token, keep same refresh token
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new AppError('Ungültiges Refresh-Token.', 401);
    const newAccessToken = generateAccessToken(user);
    return { accessToken: newAccessToken, refreshToken };
  }

  // Fallback: check legacy single-token field on User (for existing sessions before migration)
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (user && user.refreshToken && (user.refreshToken === hashed || user.refreshToken === refreshToken)) {
    // Migrate this legacy session to the new table
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          tokenHash: hashed,
          userId: user.id,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      }),
    ]);
    const newAccessToken = generateAccessToken(user);
    return { accessToken: newAccessToken, refreshToken };
  }

  throw new AppError('Ungültiges Refresh-Token.', 401);
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new AppError('Passwort muss mindestens 8 Zeichen lang sein.', 400);
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppError('Passwort muss mindestens einen Großbuchstaben enthalten.', 400);
  }
  if (!/[a-z]/.test(password)) {
    throw new AppError('Passwort muss mindestens einen Kleinbuchstaben enthalten.', 400);
  }
  if (!/[0-9]/.test(password)) {
    throw new AppError('Passwort muss mindestens eine Zahl enthalten.', 400);
  }
}

async function createUser(email, password, name, role = 'USER') {
  validatePassword(password);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: { email, passwordHash, name, role },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

async function logout(userId, refreshToken) {
  if (refreshToken) {
    // Delete only this session
    const hashed = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashed } }).catch(() => {});
  }
  // Also clear legacy field if still set
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  }).catch(() => {});
}

async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, lastLogin: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
}

module.exports = { login, verify2FA, refresh, logout, createUser, getAllUsers, validatePassword };
