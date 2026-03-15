import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3,
  Users,
  UserPlus,
  MousePointerClick,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

const RANGE_OPTIONS = [
  { key: 7, label: '7 Tage' },
  { key: 14, label: '14 Tage' },
  { key: 30, label: '30 Tage' },
  { key: 90, label: '90 Tage' },
];

function formatDate(dateStr) {
  // dateStr = "20260315"
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return `${d}.${m}.`;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPercent(val) {
  return `${(val * 100).toFixed(1)}%`;
}

// ─── Mini sparkline chart ───
function SparkLine({ data, dataKey, color, height = 40, width = 120 }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
    </svg>
  );
}

// ─── Area chart ───
function AreaChart({ data, dataKey, color, height = 200, label }) {
  const { dark } = useTheme();
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) return null;

  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values, 1);
  const padding = { top: 20, right: 16, bottom: 30, left: 50 };
  const chartW = 100; // percent
  const chartH = height - padding.top - padding.bottom;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 800 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={`area-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = padding.top + chartH * (1 - frac);
          return (
            <g key={i}>
              <line
                x1={padding.left} y1={y} x2={800 - padding.right} y2={y}
                stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8} y={y + 4}
                textAnchor="end"
                fill={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
                fontSize="11"
                fontFamily="DM Sans, sans-serif"
              >
                {Math.round(max * frac)}
              </text>
            </g>
          );
        })}

        {/* Area + Line */}
        {(() => {
          const w = 800 - padding.left - padding.right;
          const pts = values.map((v, i) => {
            const x = padding.left + (i / (values.length - 1)) * w;
            const y = padding.top + chartH - (v / max) * chartH;
            return { x, y };
          });
          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          const areaPath = `${linePath} L${pts[pts.length - 1].x},${padding.top + chartH} L${pts[0].x},${padding.top + chartH} Z`;

          return (
            <>
              <path d={areaPath} fill={`url(#area-${dataKey})`} />
              <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x} cy={p.y} r={hovered === i ? 5 : 0}
                  fill={color}
                  stroke="white" strokeWidth="2"
                />
              ))}
              {/* Hit areas */}
              {pts.map((p, i) => (
                <rect
                  key={`h-${i}`}
                  x={p.x - w / values.length / 2}
                  y={padding.top}
                  width={w / values.length}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                />
              ))}
            </>
          );
        })()}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (data.length > 14 && i % Math.ceil(data.length / 10) !== 0) return null;
          const w = 800 - padding.left - padding.right;
          const x = padding.left + (i / (data.length - 1)) * w;
          return (
            <text
              key={i}
              x={x}
              y={height - 6}
              textAnchor="middle"
              fill={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
              fontSize="11"
              fontFamily="DM Sans, sans-serif"
            >
              {formatDate(d.date)}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && data[hovered] && (
        <div
          className="absolute pointer-events-none px-3 py-2 rounded-lg text-xs font-body"
          style={{
            left: `${((hovered / (data.length - 1)) * 100)}%`,
            top: 0,
            transform: 'translateX(-50%)',
            background: dark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            color: dark ? '#fff' : '#1a1a1a',
          }}
        >
          <div className="font-semibold" style={{ color }}>{data[hovered][dataKey]}</div>
          <div className="opacity-50">{formatDate(data[hovered].date)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Horizontal bar chart ───
function HorizontalBar({ items, valueKey, labelKey, color, maxItems = 10 }) {
  const { dark } = useTheme();
  const sliced = items.slice(0, maxItems);
  const maxVal = Math.max(...sliced.map(i => i[valueKey]), 1);

  return (
    <div className="space-y-2">
      {sliced.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span
            className="text-xs font-body shrink-0 truncate"
            style={{ width: 140, color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
            title={item[labelKey]}
          >
            {item[labelKey] || '(direkt)'}
          </span>
          <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <div
              className="h-full rounded-md flex items-center px-2"
              style={{
                width: `${Math.max((item[valueKey] / maxVal) * 100, 2)}%`,
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span className="text-[10px] font-bold text-white whitespace-nowrap">{item[valueKey]}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Device icon helper ───
function DeviceIcon({ type }) {
  const lower = (type || '').toLowerCase();
  if (lower === 'mobile') return <Smartphone className="w-4 h-4" />;
  if (lower === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

// ─── Stat card ───
function StatCard({ icon: Icon, label, value, sub, color, sparkData, sparkKey }) {
  const { dark } = useTheme();
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: dark
          ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
        boxShadow: dark
          ? '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset'
          : '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03) inset',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${color}18` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-xs font-body font-medium" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              {label}
            </span>
          </div>
          <div className="text-2xl font-display font-bold tracking-display" style={{ color: dark ? '#fff' : '#1a1a1a' }}>
            {value}
          </div>
          {sub && (
            <div className="text-xs font-body mt-1" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              {sub}
            </div>
          )}
        </div>
        {sparkData && sparkKey && (
          <SparkLine data={sparkData} dataKey={sparkKey} color={color} height={40} width={100} />
        )}
      </div>
    </div>
  );
}

// ─── Section card ───
function SectionCard({ title, icon: Icon, children, className = '' }) {
  const { dark } = useTheme();
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: dark
          ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
        boxShadow: dark
          ? '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset'
          : '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03) inset',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4" style={{ color: '#0D7377' }} />
        <h3 className="text-sm font-display font-bold tracking-display" style={{ color: dark ? '#fff' : '#1a1a1a' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const { dark } = useTheme();
  const [range, setRange] = useState(30);
  const [overview, setOverview] = useState(null);
  const [pages, setPages] = useState(null);
  const [geo, setGeo] = useState(null);
  const [sources, setSources] = useState(null);
  const [devices, setDevices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, pgRes, geoRes, srcRes, devRes] = await Promise.all([
        api.get(`/analytics/overview?range=${range}`),
        api.get(`/analytics/pages?range=${range}`),
        api.get(`/analytics/geo?range=${range}`),
        api.get(`/analytics/sources?range=${range}`),
        api.get(`/analytics/devices?range=${range}`),
      ]);
      setOverview(ovRes.data);
      setPages(pgRes.data);
      setGeo(geoRes.data);
      setSources(srcRes.data);
      setDevices(devRes.data);
    } catch (err) {
      setError('Analytics-Daten konnten nicht geladen werden.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group devices by category
  const deviceSummary = devices?.devices?.reduce((acc, d) => {
    acc[d.device] = (acc[d.device] || 0) + d.users;
    return acc;
  }, {}) || {};

  const totalDeviceUsers = Object.values(deviceSummary).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #0D7377, #094e51)',
              boxShadow: '0 2px 8px rgba(13,115,119,0.4)',
            }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-display" style={{ color: dark ? '#fff' : '#1a1a1a' }}>
              Website Analytics
            </h1>
            <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              Google Analytics — novaris-consulting.de
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div
            className="flex rounded-xl overflow-hidden"
            style={{
              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className="px-4 py-2 text-xs font-body font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95"
                style={{
                  background: range === opt.key
                    ? 'linear-gradient(135deg, #0D7377, #094e51)'
                    : 'transparent',
                  color: range === opt.key ? '#fff' : dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  transition: 'background 150ms ease, color 150ms ease, transform 100ms ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAll}
            className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95"
            style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', transition: 'transform 100ms ease' }}
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm font-body" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {loading && !overview ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : overview && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Aktive Nutzer"
              value={overview.totals.activeUsers.toLocaleString('de-DE')}
              sub={`Ø ${Math.round(overview.totals.activeUsers / (overview.rows.length || 1))} / Tag`}
              color="#0D7377"
              sparkData={overview.rows}
              sparkKey="activeUsers"
            />
            <StatCard
              icon={UserPlus}
              label="Neue Nutzer"
              value={overview.totals.newUsers.toLocaleString('de-DE')}
              sub={`${((overview.totals.newUsers / (overview.totals.activeUsers || 1)) * 100).toFixed(0)}% aller Nutzer`}
              color="#10b981"
              sparkData={overview.rows}
              sparkKey="newUsers"
            />
            <StatCard
              icon={MousePointerClick}
              label="Seitenaufrufe"
              value={overview.totals.pageViews.toLocaleString('de-DE')}
              sub={`Ø ${Math.round(overview.totals.pageViews / (overview.totals.sessions || 1))} / Sitzung`}
              color="#6366f1"
              sparkData={overview.rows}
              sparkKey="pageViews"
            />
            <StatCard
              icon={Clock}
              label="Ø Sitzungsdauer"
              value={formatDuration(overview.totals.avgSessionDuration)}
              sub={`Absprungrate: ${formatPercent(overview.totals.avgBounceRate)}`}
              color="#f59e0b"
              sparkData={overview.rows}
              sparkKey="sessions"
            />
          </div>

          {/* Users over time chart */}
          <SectionCard title="Nutzer-Verlauf" icon={TrendingUp} className="mb-6">
            <AreaChart data={overview.rows} dataKey="activeUsers" color="#0D7377" height={220} />
          </SectionCard>

          {/* Page views chart */}
          <SectionCard title="Seitenaufrufe" icon={MousePointerClick} className="mb-6">
            <AreaChart data={overview.rows} dataKey="pageViews" color="#6366f1" height={180} />
          </SectionCard>

          {/* Three columns: Top pages, Geo, Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Top pages */}
            <SectionCard title="Top Seiten" icon={ExternalLink}>
              {pages?.pages?.length > 0 ? (
                <div className="space-y-3">
                  {pages.pages.slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs font-body font-medium truncate"
                          style={{ color: dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                          title={p.path}
                        >
                          {p.title || p.path}
                        </div>
                        <div className="text-[10px] font-body truncate" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                          {p.path}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-body font-semibold" style={{ color: '#0D7377' }}>{p.views}</span>
                        <span className="text-[10px] font-body" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                          {p.users} Nutzer
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</p>
              )}
            </SectionCard>

            {/* Geo / Countries */}
            <SectionCard title="Standorte" icon={Globe}>
              {geo?.locations?.length > 0 ? (
                <div className="space-y-3">
                  {geo.locations.slice(0, 8).map((loc, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs font-body font-medium truncate"
                          style={{ color: dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                        >
                          {loc.city !== '(not set)' ? loc.city : loc.region !== '(not set)' ? loc.region : loc.country}
                        </div>
                        <div className="text-[10px] font-body" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                          {loc.country}{loc.region !== '(not set)' ? `, ${loc.region}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-body font-semibold" style={{ color: '#10b981' }}>{loc.users}</span>
                        <span className="text-[10px] font-body" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                          {loc.sessions} Sitz.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</p>
              )}
            </SectionCard>

            {/* Sources */}
            <SectionCard title="Traffic-Quellen" icon={TrendingUp}>
              {sources?.sources?.length > 0 ? (
                <HorizontalBar
                  items={sources.sources}
                  valueKey="sessions"
                  labelKey="source"
                  color="#6366f1"
                  maxItems={8}
                />
              ) : (
                <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</p>
              )}
            </SectionCard>
          </div>

          {/* Devices section */}
          <SectionCard title="Geräte & Browser" icon={Monitor} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Device categories */}
              <div>
                <h4 className="text-xs font-body font-semibold mb-4" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                  Gerätekategorien
                </h4>
                <div className="space-y-3">
                  {Object.entries(deviceSummary)
                    .sort(([, a], [, b]) => b - a)
                    .map(([device, count]) => {
                      const pct = (count / totalDeviceUsers) * 100;
                      return (
                        <div key={device} className="flex items-center gap-3">
                          <DeviceIcon type={device} />
                          <span className="text-xs font-body font-medium capitalize w-16" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                            {device}
                          </span>
                          <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            <div
                              className="h-full rounded-md flex items-center px-2"
                              style={{
                                width: `${Math.max(pct, 3)}%`,
                                background: 'linear-gradient(90deg, #0D7377, #0D7377cc)',
                                transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                            >
                              <span className="text-[10px] font-bold text-white whitespace-nowrap">{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                          <span className="text-xs font-body tabular-nums" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Browsers */}
              <div>
                <h4 className="text-xs font-body font-semibold mb-4" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                  Browser
                </h4>
                <HorizontalBar
                  items={devices?.devices?.reduce((acc, d) => {
                    const existing = acc.find(a => a.browser === d.browser);
                    if (existing) existing.users += d.users;
                    else acc.push({ browser: d.browser, users: d.users });
                    return acc;
                  }, [])?.sort((a, b) => b.users - a.users) || []}
                  valueKey="users"
                  labelKey="browser"
                  color="#f59e0b"
                  maxItems={6}
                />
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
