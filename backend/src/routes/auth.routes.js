const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { createTicket } = require('../utils/sseTickets');
const { NODE_ENV } = require('../config/env');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
  });
}

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
  }
  const result = await authService.login(email, password);

  if (result.requires2FA) {
    return res.json({ requires2FA: true, tempToken: result.tempToken });
  }

  setRefreshCookie(res, result.refreshToken);
  res.json({ accessToken: result.accessToken, user: result.user });
}));

// POST /api/auth/login/2fa
router.post('/login/2fa', asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ error: 'Token und Code erforderlich.' });
  }
  const result = await authService.verify2FA(tempToken, code);

  setRefreshCookie(res, result.refreshToken);
  res.json({ accessToken: result.accessToken, user: result.user });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  // Read refresh token from httpOnly cookie (primary) or body (legacy fallback)
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refresh(refreshToken);

  setRefreshCookie(res, result.refreshToken);
  res.json({ accessToken: result.accessToken });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json(req.user);
}));

// GET /api/auth/users - list all users (returns only safe fields: id, name, email, role)
router.get('/users', authenticate, asyncHandler(async (req, res) => {
  const users = await authService.getAllUsers();
  res.json(users);
}));

// POST /api/auth/logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  await authService.logout(req.user.id, refreshToken);
  clearRefreshCookie(res);
  res.json({ message: 'Erfolgreich abgemeldet.' });
}));

// POST /api/auth/users - create a new user (admin only)
router.post('/users', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'E-Mail, Passwort und Name erforderlich.' });
  }
  const user = await authService.createUser(email, password, name, role);
  res.status(201).json(user);
}));

// POST /api/auth/sse-ticket — generate a short-lived one-time ticket for SSE
router.post('/sse-ticket', authenticate, asyncHandler(async (req, res) => {
  const ticket = createTicket(req.user.id);
  res.json({ ticket });
}));

module.exports = router;
