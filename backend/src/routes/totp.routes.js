const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth');
const { generateSecret, generateURI, verifySync } = require('../utils/totp');
const qrcode = require('qrcode');
const prisma = require('../lib/prisma');

const ISSUER = process.env.TOTP_ISSUER || 'CRM Pipeline';

router.use(authenticate);

// POST /api/totp/setup — generate TOTP secret + QR
router.post('/setup', asyncHandler(async (req, res) => {
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: ISSUER, label: req.user.email, secret });
  const qrDataUrl = await qrcode.toDataURL(otpauth);

  // Save secret temporarily (not enabled yet)
  await prisma.user.update({
    where: { id: req.user.id },
    data: { totpSecret: secret },
  });

  res.json({ qrDataUrl, secret });
}));

// POST /api/totp/verify — verify code and enable 2FA
router.post('/verify', asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code erforderlich.' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.totpSecret) {
    return res.status(400).json({ error: 'Bitte zuerst 2FA einrichten.' });
  }

  const valid = verifySync(code, user.totpSecret);
  if (!valid) {
    return res.status(400).json({ error: 'Ungültiger Code.' });
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { totpEnabled: true },
  });

  res.json({ message: '2FA erfolgreich aktiviert.' });
}));

// POST /api/totp/disable — disable 2FA
router.post('/disable', asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { totpEnabled: false, totpSecret: null },
  });
  res.json({ message: '2FA deaktiviert.' });
}));

module.exports = router;
