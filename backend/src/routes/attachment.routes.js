const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const attachmentService = require('../services/attachment.service');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// Multer config
const storage = multer.diskStorage({
  destination: attachmentService.UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const blocked = [
      '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.com', '.scr',
      '.pif', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.dll',
      '.jar', '.cpl', '.reg', '.inf', '.hta', '.lnk',
    ];
    const name = file.originalname.toLowerCase();
    const ext = path.extname(name);
    // Block dangerous extensions and double extensions like .pdf.exe
    const parts = name.split('.');
    const hasBlockedExt = parts.slice(1).some(p => blocked.includes(`.${p}`));
    if (blocked.includes(ext) || hasBlockedExt) {
      return cb(new Error('Dateityp nicht erlaubt.'));
    }
    cb(null, true);
  },
});

// GET /api/attachments/company/:companyId
router.get('/company/:companyId', asyncHandler(async (req, res) => {
  const attachments = await attachmentService.list(req.params.companyId);
  res.json(attachments);
}));

// POST /api/attachments/company/:companyId
router.post('/company/:companyId', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  }
  const attachment = await attachmentService.upload(req.file, req.params.companyId, req.user.id);
  res.status(201).json(attachment);
}));

// GET /api/attachments/:id/download
router.get('/:id/download', asyncHandler(async (req, res) => {
  const attachment = await attachmentService.getById(req.params.id);
  if (!attachment) return res.status(404).json({ error: 'Datei nicht gefunden.' });

  const filePath = path.join(attachmentService.UPLOADS_DIR, attachment.path);
  res.download(filePath, attachment.fileName);
}));

// DELETE /api/attachments/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await attachmentService.remove(req.params.id, req.user.id, req.user.role);
  res.json({ message: 'Datei gelöscht.' });
}));

module.exports = router;
