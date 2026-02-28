import { useState, useEffect } from 'react';
import api from '../services/api';
import { timeAgo } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowRightLeft,
  Building2,
  Pencil,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Clock,
} from 'lucide-react';

const ACTION_CONFIG = {
  STAGE_CHANGE: { icon: ArrowRightLeft, color: '#6366f1', bg: '#eef2ff', bgDark: 'rgba(99,102,241,0.12)', label: 'hat die Stufe geändert' },
  COMPANY_CREATED: { icon: Building2, color: '#10b981', bg: '#ecfdf5', bgDark: 'rgba(16,185,129,0.12)', label: 'hat die Firma erstellt' },
  COMPANY_UPDATED: { icon: Pencil, color: '#3b82f6', bg: '#eff6ff', bgDark: 'rgba(59,130,246,0.12)', label: 'hat die Firmendaten aktualisiert' },
  TASK_COMPLETED: { icon: CheckCircle, color: '#0D7377', bg: '#e8fafb', bgDark: 'rgba(13,115,119,0.12)', label: 'hat eine Aufgabe abgeschlossen' },
  COMMENT_ADDED: { icon: MessageSquare, color: '#f59e0b', bg: '#fffbeb', bgDark: 'rgba(245,158,11,0.12)', label: 'hat einen Kommentar hinzugefügt' },
  CONTACT_ADDED: { icon: UserPlus, color: '#8b5cf6', bg: '#f5f3ff', bgDark: 'rgba(139,92,246,0.12)', label: 'hat einen Kontakt hinzugefügt' },
};

const STAGE_LABELS = {
  FIRMA_IDENTIFIZIERT: 'Identifiziert',
  FIRMA_KONTAKTIERT: 'Kontaktiert',
  VERHANDLUNG: 'Verhandlung',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

export default function ActivityTimeline({ entityType, entityId }) {
  const { dark } = useTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityType || !entityId) return;
    api.get(`/activities?entityType=${entityType}&entityId=${entityId}&limit=50`)
      .then(({ data }) => setActivities(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: dark ? 'linear-gradient(135deg, #252838, #1e2130)' : 'linear-gradient(135deg, #f3f4f8, #e8eaef)' }}
        >
          <Clock className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-sm font-display font-semibold text-gray-400">Noch keine Aktivitäten</p>
        <p className="text-[12px] text-gray-400 font-body mt-1">Aktionen werden hier protokolliert.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8 py-2">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-border-light via-border-light to-transparent rounded-full" />

      <div className="space-y-4">
        {activities.map((activity) => {
          const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.COMPANY_UPDATED;
          const Icon = config.icon;
          const meta = activity.metadata || {};

          let detail = '';
          if (activity.action === 'STAGE_CHANGE') {
            const from = STAGE_LABELS[meta.oldStage] || meta.oldStage || '—';
            const to = STAGE_LABELS[meta.newStage] || meta.newStage || '—';
            detail = `${from} → ${to}`;
          } else if (activity.action === 'TASK_COMPLETED' && meta.taskTitle) {
            detail = `"${meta.taskTitle}"`;
          } else if (activity.action === 'CONTACT_ADDED' && meta.contactName) {
            detail = meta.contactName;
          }

          return (
            <div key={activity.id} className="relative flex items-start gap-3">
              {/* Dot on timeline */}
              <div
                className="absolute -left-8 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: dark ? config.bgDark : config.bg, boxShadow: `0 1px 3px ${config.color}${dark ? '25' : '15'}` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-body text-gray-700 leading-snug">
                  <span className="font-semibold text-gray-900">{activity.user?.name || 'System'}</span>{' '}
                  {config.label}
                </p>
                {detail && (
                  <p className="text-[12px] text-gray-500 font-body mt-0.5">{detail}</p>
                )}
                <p className="text-[11px] text-gray-400 font-body mt-1">{timeAgo(activity.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
