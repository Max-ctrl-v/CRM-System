const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Rule-based next action suggestions in German
async function suggest(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      contacts: { select: { id: true } },
      tasks: {
        where: { done: false },
        orderBy: { dueDate: 'asc' },
        take: 1,
      },
    },
  });
  if (!company) return null;

  const lastActivity = await prisma.activity.findFirst({
    where: { entityType: 'COMPANY', entityId: companyId },
    orderBy: { createdAt: 'desc' },
  });

  const lastComment = await prisma.comment.findFirst({
    where: { entityType: 'COMPANY', entityId: companyId },
    orderBy: { createdAt: 'desc' },
  });

  const daysSinceActivity = lastActivity
    ? (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  const suggestions = [];

  // No contacts yet
  if (company.contacts.length === 0) {
    suggestions.push({
      priority: 'high',
      action: 'Ansprechpartner hinzufügen',
      reason: 'Kein Kontakt hinterlegt',
    });
  }

  // Stage-specific suggestions
  switch (company.pipelineStage) {
    case 'FIRMA_IDENTIFIZIERT':
      suggestions.push({
        priority: 'high',
        action: 'Erstkontakt aufnehmen',
        reason: 'Firma noch nicht kontaktiert',
      });
      if (!company.perplexityResult) {
        suggestions.push({
          priority: 'medium',
          action: 'Perplexity-Recherche durchführen',
          reason: 'Noch keine Firmenrecherche vorhanden',
        });
      }
      break;
    case 'FIRMA_KONTAKTIERT':
      if (daysSinceActivity > 7) {
        suggestions.push({
          priority: 'high',
          action: 'Follow-up Anruf planen',
          reason: `Letzte Aktivität vor ${Math.round(daysSinceActivity)} Tagen`,
        });
      }
      suggestions.push({
        priority: 'medium',
        action: 'Termin für Erstgespräch vereinbaren',
        reason: 'Nächster Schritt in der Pipeline',
      });
      break;
    case 'VERHANDLUNG':
      if (!company.expectedRevenue) {
        suggestions.push({
          priority: 'high',
          action: 'Erwarteten Umsatz eintragen',
          reason: 'Kein erwarteter Umsatz hinterlegt',
        });
      }
      if (daysSinceActivity > 5) {
        suggestions.push({
          priority: 'high',
          action: 'Status-Update einholen',
          reason: `Letzte Aktivität vor ${Math.round(daysSinceActivity)} Tagen`,
        });
      }
      break;
    case 'CLOSED_WON':
      if (daysSinceActivity > 30) {
        suggestions.push({
          priority: 'low',
          action: 'Kundenzufriedenheit prüfen',
          reason: 'Längere Zeit kein Kontakt',
        });
      }
      break;
    case 'CLOSED_LOST':
      if (daysSinceActivity > 90) {
        suggestions.push({
          priority: 'low',
          action: 'Erneute Kontaktaufnahme prüfen',
          reason: 'Mehr als 90 Tage seit letztem Kontakt',
        });
      }
      break;
  }

  // Overdue tasks
  const overdueTask = company.tasks.find(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  );
  if (overdueTask) {
    suggestions.push({
      priority: 'high',
      action: 'Überfällige Aufgabe erledigen',
      reason: `"${overdueTask.title}" ist überfällig`,
    });
  }

  // Staleness warning
  if (daysSinceActivity > 14 && !['CLOSED_WON', 'CLOSED_LOST'].includes(company.pipelineStage)) {
    suggestions.push({
      priority: 'high',
      action: 'Kontakt wiederaufnehmen',
      reason: `Keine Aktivität seit ${Math.round(daysSinceActivity)} Tagen`,
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions.length > 0 ? suggestions[0] : { priority: 'low', action: 'Keine Aktion nötig', reason: 'Alles auf dem aktuellen Stand' };
}

async function batchSuggest(companyIds) {
  const results = {};
  await Promise.all(
    companyIds.map(async (id) => {
      results[id] = await suggest(id);
    })
  );
  return results;
}

module.exports = { suggest, batchSuggest };
