const cron = require('node-cron');
const prisma = require('../lib/prisma');
const notificationService = require('../services/notification.service');

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

      // Create notifications in parallel
      const notificationPromises = companies
        .filter((c) => c.assignedToId)
        .map((company) =>
          notificationService.create({
            type: 'OVERDUE_REMINDER',
            title: 'Follow-Up fällig',
            message: `Follow-Up für "${company.name}" ist fällig (Termin war am ${company.meetingDate?.toLocaleDateString('de-DE')}).`,
            link: `/company/${company.id}`,
            userId: company.assignedToId,
          }).catch((err) => console.error(`[MeetingFollowUp] Notification failed for ${company.name}:`, err.message))
        );
      await Promise.allSettled(notificationPromises);

      // Single bulk update to clear all follow-up dates
      if (companies.length > 0) {
        await prisma.company.updateMany({
          where: { id: { in: companies.map((c) => c.id) } },
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
