const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.message);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ein Eintrag mit diesen Daten existiert bereits.' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Interner Serverfehler.';

  res.status(statusCode).json({ error: message });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, AppError };
