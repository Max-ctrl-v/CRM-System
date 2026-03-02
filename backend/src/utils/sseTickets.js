const crypto = require('crypto');

// In-memory store for short-lived SSE tickets
const tickets = new Map();
const TICKET_TTL = 30_000; // 30 seconds

// Clean up expired tickets every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [ticket, data] of tickets) {
    if (now > data.expiresAt) tickets.delete(ticket);
  }
}, 60_000).unref();

function createTicket(userId) {
  const ticket = crypto.randomBytes(32).toString('hex');
  tickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL });
  return ticket;
}

/**
 * Validate and consume a ticket (one-time use).
 * Returns the userId if valid, null otherwise.
 */
function validateTicket(ticket) {
  if (!ticket) return null;
  const data = tickets.get(ticket);
  if (!data) return null;
  tickets.delete(ticket); // One-time use
  if (Date.now() > data.expiresAt) return null;
  return data.userId;
}

module.exports = { createTicket, validateTicket };
