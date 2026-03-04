import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatEuro, timeAgo } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import {
  Building2,
  TrendingUp,
  Euro,
  AlertCircle,
  ArrowRightLeft,
  Pencil,
  CheckCircle,
  MessageSquare,
  UserPlus,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import RevenueChart from '../components/RevenueChart';
import ActivityHeatmap from '../components/ActivityHeatmap';
import ConversionFunnel from '../components/ConversionFunnel';

const STAGE_META = {
  FIRMA_IDENTIFIZIERT: { label: 'Identifiziert', color: '#6366f1', colorEnd: '#818cf8' },
  FIRMA_KONTAKTIERT: { label: 'Kontaktiert', color: '#3b82f6', colorEnd: '#60a5fa' },
  VERHANDLUNG: { label: 'Verhandlung', color: '#f59e0b', colorEnd: '#fbbf24' },
  CLOSED_WON: { label: 'Closed Won', color: '#10b981', colorEnd: '#34d399' },
  CLOSED_LOST: { label: 'Closed Lost', color: '#ef4444', colorEnd: '#f87171' },
};

const ACTION_CONFIG = {
  STAGE_CHANGE: { icon: ArrowRightLeft, color: '#6366f1', bg: '#eef2ff', bgDark: 'rgba(99,102,241,0.12)', label: 'hat die Stufe geändert' },
  COMPANY_CREATED: { icon: Building2, color: '#10b981', bg: '#ecfdf5', bgDark: 'rgba(16,185,129,0.12)', label: 'hat die Firma erstellt' },
  COMPANY_UPDATED: { icon: Pencil, color: '#3b82f6', bg: '#eff6ff', bgDark: 'rgba(59,130,246,0.12)', label: 'hat die Firmendaten aktualisiert' },
  TASK_COMPLETED: { icon: CheckCircle, color: '#0D7377', bg: '#e8fafb', bgDark: 'rgba(13,115,119,0.12)', label: 'hat eine Aufgabe abgeschlossen' },
  COMMENT_ADDED: { icon: MessageSquare, color: '#f59e0b', bg: '#fffbeb', bgDark: 'rgba(245,158,11,0.12)', label: 'hat einen Kommentar hinzugefügt' },
  CONTACT_ADDED: { icon: UserPlus, color: '#8b5cf6', bg: '#f5f3ff', bgDark: 'rgba(139,92,246,0.12)', label: 'hat einen Kontakt hinzugefügt' },
};

const RANGE_OPTIONS = [
  { key: '7d', label: '7 Tage' },
  { key: '30d', label: '30 Tage' },
  { key: '90d', label: '90 Tage' },
  { key: 'all', label: 'Gesamt' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const fetchStats = useCallback((r) => {
    setLoading(true);
    api.get(`/dashboard/stats?range=${r}`)
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats(range);
  }, [range, fetchStats]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="h-7 bg-gray-100 rounded w-40 mb-6 animate-pulse" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border-light p-5 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-border-light p-5 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-gray-50 rounded" />)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border-light p-5 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-50 rounded" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    {
      label: 'Firmen Gesamt',
      value: stats.totalCompanies,
      icon: Building2,
      color: '#0D7377',
      gradient: dark ? 'linear-gradient(135deg, rgba(13,115,119,0.15), rgba(13,115,119,0.08))' : 'linear-gradient(135deg, #e8fafb, #c5f2f3)',
    },
    {
      label: 'Offene Deals',
      value: stats.openDeals,
      icon: TrendingUp,
      color: '#6366f1',
      gradient: dark ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))' : 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
    },
    {
      label: 'Umsatzprognose',
      value: formatEuro(stats.totalRevenueForecast),
      subValue: stats.weightedRevenueForecast > 0 ? `Gewichtet: ${formatEuro(stats.weightedRevenueForecast)}` : null,
      icon: Euro,
      color: '#10b981',
      gradient: dark ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))' : 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    },
    {
      label: 'Überfällige Aufgaben',
      value: stats.overdueTasks,
      icon: AlertCircle,
      color: stats.overdueTasks > 0 ? '#ef4444' : '#94a3b8',
      gradient: stats.overdueTasks > 0
        ? (dark ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))' : 'linear-gradient(135deg, #fef2f2, #fecaca)')
        : (dark ? 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(148,163,184,0.05))' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)'),
    },
  ];

  // Pipeline funnel data (only main stages)
  const funnelStages = ['FIRMA_IDENTIFIZIERT', 'FIRMA_KONTAKTIERT', 'VERHANDLUNG', 'CLOSED_WON', 'CLOSED_LOST'];
  const stageMap = {};
  (stats.stageBreakdown || []).forEach((s) => { stageMap[s.stage] = s; });
  const maxCount = Math.max(...funnelStages.map((k) => stageMap[k]?.count || 0), 1);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-display font-bold text-gray-900 tracking-display">Dashboard</h1>
        {/* Time range filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100" style={{ boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
          <Calendar className="w-3.5 h-3.5 text-gray-400 mx-1.5" />
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`text-[11px] font-semibold font-body px-3 py-1.5 rounded-md ${
                range === opt.key
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ transition: 'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl border border-border-light p-5"
              style={{
                boxShadow: dark
                  ? '0 1px 2px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)'
                  : '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-body">{kpi.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: kpi.gradient, boxShadow: `0 2px 6px ${kpi.color}${dark ? '25' : '15'}` }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="text-2xl font-display font-bold text-gray-900 tracking-display">{kpi.value}</span>
              {kpi.subValue && (
                <p className="text-[10px] text-gray-400 font-body mt-1">{kpi.subValue}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Pipeline Funnel */}
        <div
          className="col-span-2 bg-white rounded-xl border border-border-light p-5"
          style={{ boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-display font-bold text-gray-900 tracking-display">Pipeline-Übersicht</h2>
            <button
              onClick={() => navigate('/pipeline')}
              className="flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-700 font-semibold font-body rounded px-2 py-1 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
              style={{ transition: 'background-color 150ms ease, color 150ms ease' }}
            >
              Zur Pipeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {funnelStages.map((key) => {
              const meta = STAGE_META[key];
              const data = stageMap[key] || { count: 0, revenue: 0 };
              if (!meta) return null;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-gray-600 font-body w-24 shrink-0">{meta.label}</span>
                  <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg flex items-center px-2.5"
                      style={{
                        width: `${Math.max((data.count / maxCount) * 100, data.count > 0 ? 8 : 0)}%`,
                        background: `linear-gradient(90deg, ${meta.color}, ${meta.colorEnd})`,
                        transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                        minWidth: data.count > 0 ? '32px' : '0',
                      }}
                    >
                      {data.count > 0 && (
                        <span className="text-[11px] font-bold text-white font-body whitespace-nowrap">{data.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 font-body w-24 text-right shrink-0">
                    {data.revenue > 0 ? formatEuro(data.revenue) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="bg-white rounded-xl border border-border-light p-5"
          style={{ boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
        >
          <h2 className="text-sm font-display font-bold text-gray-900 tracking-display mb-4">Letzte Aktivitäten</h2>
          {stats.recentActivities?.length > 0 ? (
            <div className="space-y-3">
              {(stats.recentActivities || []).slice(0, 10).map((activity) => {
                const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.COMPANY_UPDATED;
                const Icon = config.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 cursor-pointer hover:bg-surface-base"
                    style={{ transition: 'background-color 150ms ease' }}
                    onClick={() => {
                      if (activity.entityType === 'COMPANY' && activity.entityId) {
                        navigate(`/company/${activity.entityId}`);
                      }
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: dark ? config.bgDark : config.bg, boxShadow: `0 1px 3px ${config.color}${dark ? '25' : '15'}` }}
                    >
                      <Icon className="w-3 h-3" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-body text-gray-600 leading-snug">
                        <span className="font-semibold text-gray-800">{activity.user?.name || 'System'}</span>{' '}
                        {config.label}
                      </p>
                      <p className="text-[10px] text-gray-400 font-body mt-0.5">{timeAgo(activity.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-gray-400 font-body text-center py-6">Noch keine Aktivitäten</p>
          )}
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <RevenueChart />
        <ConversionFunnel />
      </div>

      {/* Activity Heatmap */}
      <div className="mt-4">
        <ActivityHeatmap />
      </div>
    </div>
  );
}
