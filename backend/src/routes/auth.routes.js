const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
  }
  const result = await authService.login(email, password);
  res.json(result);
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.json(result);
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json(req.user);
}));

// GET /api/auth/users - list all users
router.get('/users', authenticate, asyncHandler(async (req, res) => {
  const users = await authService.getAllUsers();
  res.json(users);
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

module.exports = router;
