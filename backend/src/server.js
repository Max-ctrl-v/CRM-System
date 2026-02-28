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
const activityRoutes = require('./routes/activity.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const searchRoutes = require('./routes/search.routes');

const app = express();

// Security
app.use(helmet());
const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting for login and refresh endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
  keyGenerator: (req) => req.ip,
  skip: (req) => req.path !== '/login' && req.path !== '/refresh',
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/perplexity', perplexityRoutes);
app.use('/api/bundesanzeiger', bundesanzeigerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);

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
