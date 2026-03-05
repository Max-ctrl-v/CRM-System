const cron = require('node-cron');
const prisma = require('../lib/prisma');
const notificationService = require('../services/notification.service');

const STALE_DAYS = 14;

function startStaleDealCron() {
  // Check every day at 9:30 CET
  cron.schedule('30 9 * * *', async () => {
    console.log('[StaleDealAlerts] Checking for stale deals...');
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - STALE_DAYS);

      // Find companies in active pipeline stages with no update in 14+ days
      const staleCompanies = await prisma.company.findMany({
        where: {
          pipelineStage: { in: ['FIRMA_IDENTIFIZIERT', 'FIRMA_KONTAKTIERT', 'MEETING_VEREINBART', 'VERHANDLUNG'] },
          updatedAt: { lt: cutoff },
          assignedToId: { not: null },
        },
        select: {
          id: true,
          name: true,
          pipelineStage: true,
          assignedToId: true,
          updatedAt: true,
        },
      });

      // For each stale company, check if there's any recent activity
      const notificationPromises = [];
      for (const company of staleCompanies) {
        const recentActivity = await prisma.activity.findFirst({
          where: {
            entityType: 'COMPANY',
            entityId: company.id,
            createdAt: { gte: cutoff },
          },
        });
        // Also check recent comments
        const recentComment = recentActivity ? null : await prisma.comment.findFirst({
          where: {
            entityType: 'COMPANY',
            entityId: company.id,
            createdAt: { gte: cutoff },
          },
        });

        if (!recentActivity && !recentComment) {
          const daysSinceUpdate = Math.floor((Date.now() - new Date(company.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
          notificationPromises.push(
            notificationService.create({
              type: 'OVERDUE_REMINDER',
              title: 'Deal inaktiv',
              message: `"${company.name}" hat seit ${daysSinceUpdate} Tagen keine Aktivität.`,
              link: `/company/${company.id}`,
              userId: company.assignedToId,
            }).catch((err) => console.error(`[StaleDealAlerts] Notification failed for ${company.name}:`, err.message))
          );
        }
      }

      await Promise.allSettled(notificationPromises);
      console.log(`[StaleDealAlerts] Checked ${staleCompanies.length} stale deals, sent ${notificationPromises.length} alerts.`);
    } catch (err) {
      console.error('[StaleDealAlerts] Error:', err.message);
    }
  }, { timezone: 'Europe/Berlin' });

  console.log('[StaleDealAlerts] Stale deal cron scheduled (daily 9:30 CET).');
}

module.exports = { startStaleDealCron };
