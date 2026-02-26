const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PORT, CORS_ORIGIN, NODE_ENV } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const contactRoutes = require('./routes/contact.routes');
const commentRoutes = require('./routes/comment.routes');
const perplexityRoutes = require('./routes/perplexity.routes');
const bundesanzeigerRoutes = require('./routes/bundesanzeiger.routes');
const taskRoutes = require('./routes/task.routes');

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting for login only (not all auth routes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' },
  keyGenerator: (req) => req.ip,
  skip: (req) => req.path !== '/login',
});

// Routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/perplexity', perplexityRoutes);
app.use('/api/bundesanzeiger', bundesanzeigerRoutes);
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CRM Backend läuft auf http://localhost:${PORT} (${NODE_ENV})`);
});

module.exports = app;
