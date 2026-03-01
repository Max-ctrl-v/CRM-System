const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { compileDigest, buildDigestHtml } = require('../services/digest.service');
const { sendMail } = require('../services/email.service');

// Every Monday at 8:00 CET
function startDigestCron() {
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Digest] Starting weekly digest...');
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
      });

      // Process in batches of 5 for parallel sending
      const BATCH_SIZE = 5;
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (u) => {
            const digest = await compileDigest(u.id);
            const html = buildDigestHtml(digest, u.name);
            await sendMail({
              to: u.email,
              subject: 'CRM Pipeline — Wochenübersicht',
              html,
            });
            return u.email;
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') console.log(`[Digest] Sent to ${r.value}`);
          else console.error(`[Digest] Failed:`, r.reason?.message);
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
