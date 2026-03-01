const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compileDigest(userId) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [newCompanies, stageChanges, completedTasks, overdueTasks, totalOpen] = await Promise.all([
    prisma.company.count({
      where: { createdAt: { gte: oneWeekAgo } },
    }),
    prisma.activity.count({
      where: {
        action: 'STAGE_CHANGE',
        createdAt: { gte: oneWeekAgo },
      },
    }),
    prisma.task.count({
      where: {
        done: true,
        doneAt: { gte: oneWeekAgo },
      },
    }),
    prisma.task.count({
      where: {
        done: false,
        dueDate: { lt: new Date() },
        OR: [{ assignedToId: userId }, { createdById: userId }],
      },
    }),
    prisma.company.count({
      where: {
        pipelineStage: { in: ['FIRMA_IDENTIFIZIERT', 'FIRMA_KONTAKTIERT', 'VERHANDLUNG'] },
      },
    }),
  ]);

  return {
    newCompanies,
    stageChanges,
    completedTasks,
    overdueTasks,
    totalOpen,
    period: { from: oneWeekAgo, to: new Date() },
  };
}

function buildDigestHtml(digest, userName) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0D7377, #094e51); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">CRM Pipeline — Wochenübersicht</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Hallo ${userName}!</p>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #0D7377;">${digest.newCompanies}</div>
          <div style="color: #666; font-size: 13px;">Neue Firmen</div>
        </div>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #0D7377;">${digest.stageChanges}</div>
          <div style="color: #666; font-size: 13px;">Pipeline-Bewegungen</div>
        </div>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #22c55e;">${digest.completedTasks}</div>
          <div style="color: #666; font-size: 13px;">Erledigte Aufgaben</div>
        </div>
        <div style="background: ${digest.overdueTasks > 0 ? '#fef2f2' : '#f8f9fa'}; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: ${digest.overdueTasks > 0 ? '#ef4444' : '#0D7377'};">${digest.overdueTasks}</div>
          <div style="color: #666; font-size: 13px;">Überfällige Aufgaben</div>
        </div>
      </div>
      <p style="color: #888; font-size: 12px; text-align: center;">Offene Deals: ${digest.totalOpen} — CRM Pipeline by Novaris Consulting</p>
    </div>
  `;
}

module.exports = { compileDigest, buildDigestHtml };
