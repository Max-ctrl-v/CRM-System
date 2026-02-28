function auditLog(action, userId, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ...details,
  };
  console.log('[AUDIT]', JSON.stringify(entry));
}

module.exports = { auditLog };
