const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const notificationService = require('../services/notification.service');

const prisma = new PrismaClient();

function startMeetingFollowUpCron() {
  // Check every day at 9:00 CET
  cron.schedule('0 9 * * *', async () => {
    console.log('[MeetingFollowUp] Checking follow-ups...');
    try {
      const now = new Date();
      const companies = await prisma.company.findMany({
        where: {
          meetingStatus: 'MEETING_DONE',
          meetingFollowUpAt: { lte: now },
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      });

      for (const company of companies) {
        if (company.assignedToId) {
          await notificationService.create({
            type: 'OVERDUE_REMINDER',
            title: 'Follow-Up fällig',
            message: `Follow-Up für "${company.name}" ist fällig (Termin war am ${company.meetingDate?.toLocaleDateString('de-DE')}).`,
            link: `/company/${company.id}`,
            userId: company.assignedToId,
          });
        }
        // Clear follow-up date so we don't re-notify
        await prisma.company.update({
          where: { id: company.id },
          data: { meetingFollowUpAt: null },
        });
      }
      console.log(`[MeetingFollowUp] Processed ${companies.length} follow-ups.`);
    } catch (err) {
      console.error('[MeetingFollowUp] Error:', err.message);
    }
  }, { timezone: 'Europe/Berlin' });

  console.log('[MeetingFollowUp] Follow-up cron scheduled (daily 9:00 CET).');
}

module.exports = { startMeetingFollowUpCron };
