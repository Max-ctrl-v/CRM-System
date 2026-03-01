const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { compileDigest, buildDigestHtml } = require('../services/digest.service');
const { sendMail } = require('../services/email.service');

const prisma = new PrismaClient();

// Every Monday at 8:00 CET
function startDigestCron() {
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Digest] Starting weekly digest...');
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
      });

      for (const user of users) {
        try {
          const digest = await compileDigest(user.id);
          const html = buildDigestHtml(digest, user.name);
          await sendMail({
            to: user.email,
            subject: 'CRM Pipeline — Wochenübersicht',
            html,
          });
          console.log(`[Digest] Sent to ${user.email}`);
        } catch (err) {
          console.error(`[Digest] Failed for ${user.email}:`, err.message);
        }
      }
      console.log('[Digest] Weekly digest complete.');
    } catch (err) {
      console.error('[Digest] Error:', err.message);
    }
  }, {
    timezone: 'Europe/Berlin',
  });

  console.log('[Digest] Weekly digest cron scheduled (Monday 8:00 CET).');
}

module.exports = { startDigestCron };
