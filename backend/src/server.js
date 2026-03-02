const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { PORT, CORS_ORIGIN, NODE_ENV, SENTRY_DSN } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

// Sentry init (optional)
if (SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: SENTRY_DSN, environment: NODE_ENV });
}

const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const contactRoutes = require('./routes/contact.routes');
const commentRoutes = require('./routes/comment.routes');
const perplexityRoutes = require('./routes/perplexity.routes');
const bundesanzeigerRoutes = require('./routes/bundesanzeiger.routes');
const taskRoutes = require('./routes/task.routes');
const activityRoutes = require('./routes/activity.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const searchRoutes = require('./routes/search.routes');
const notificationRoutes = require('./routes/notification.routes');
const attachmentRoutes = require('./routes/attachment.routes');
const savedViewRoutes = require('./routes/savedView.routes');
const totpRoutes = require('./routes/totp.routes');
const contractRoutes = require('./routes/contract.routes');

const app = express();

// Trust proxy (Railway, Vercel, etc.) for correct req.ip in rate limiters
app.set('trust proxy', 1);

// Security
app.use(helmet());
const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

// Serve uploaded files (require authentication)
const authMiddleware = require('./middleware/auth');
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, '../uploads')));

// Rate limiting for login, 2FA, and refresh endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.' },
  keyGenerator: (req) => req.ip,
  skip: (req) => !['/login', '/login/2fa', '/refresh'].includes(req.path),
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
  keyGenerator: (req) => req.ip,
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', apiLimiter, companyRoutes);
app.use('/api/contacts', apiLimiter, contactRoutes);
app.use('/api/comments', apiLimiter, commentRoutes);
app.use('/api/perplexity', apiLimiter, perplexityRoutes);
app.use('/api/bundesanzeiger', apiLimiter, bundesanzeigerRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/activities', apiLimiter, activityRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/search', apiLimiter, searchRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/attachments', apiLimiter, attachmentRoutes);
app.use('/api/saved-views', apiLimiter, savedViewRoutes);
app.use('/api/totp', apiLimiter, totpRoutes);
app.use('/api/contracts', apiLimiter, contractRoutes);

// Health check with DB verification
app.get('/api/health', async (req, res) => {
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CRM Backend läuft auf http://localhost:${PORT} (${NODE_ENV})`);

  // Start weekly digest cron job
  const { startDigestCron } = require('./jobs/weeklyDigest');
  startDigestCron();

  // Start meeting follow-up cron job
  const { startMeetingFollowUpCron } = require('./jobs/meetingFollowUp');
  startMeetingFollowUpCron();
});

module.exports = app;
