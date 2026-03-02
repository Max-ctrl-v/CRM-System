const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

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

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(refreshToken), lastLogin: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
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

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(refreshToken), lastLogin: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new AppError('Kein Refresh-Token.', 401);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Ungültiges Refresh-Token.', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.refreshToken) {
    throw new AppError('Ungültiges Refresh-Token.', 401);
  }

  // Compare hashed token (with backward compat for plaintext migration)
  const hashed = hashToken(refreshToken);
  if (user.refreshToken !== hashed && user.refreshToken !== refreshToken) {
    throw new AppError('Ungültiges Refresh-Token.', 401);
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(newRefreshToken) },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
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

async function logout(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, lastLogin: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
}

module.exports = { login, verify2FA, refresh, logout, createUser, getAllUsers, validatePassword };
