import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3, Users, UserPlus, MousePointerClick, Globe, Monitor, Smartphone, Tablet,
  Clock, TrendingUp, ExternalLink, RefreshCw, Zap, AlertTriangle, ArrowUpRight,
  ArrowDownRight, LogIn, LogOut as LogOutIcon, Activity, Languages, Maximize,
  Link2, Megaphone, Search, UserCheck, UserX, Eye,
} from 'lucide-react';

const RANGE_OPTIONS = [
  { key: 7, label: '7 Tage' },
  { key: 14, label: '14 Tage' },
  { key: 30, label: '30 Tage' },
  { key: 90, label: '90 Tage' },
];

function formatDate(dateStr) {
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

// ─── Pulse dot for realtime ───
function PulseDot({ color = '#10b981' }) {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color, animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
      <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: color }} />
    </span>
  );
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
        <linearGradient id={`spark-${color.replace('#', '')}-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#spark-${color.replace('#', '')}-${dataKey})`} />
    </svg>
  );
}

// ─── Area chart ───
function AreaChart({ data, dataKey, color, height = 200, secondDataKey, secondColor }) {
  const { dark } = useTheme();
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) return null;

  const values = data.map(d => d[dataKey]);
  const values2 = secondDataKey ? data.map(d => d[secondDataKey] || 0) : null;
  const allVals = values2 ? [...values, ...values2] : values;
  const max = Math.max(...allVals, 1);
  const padding = { top: 20, right: 16, bottom: 30, left: 50 };
  const chartH = height - padding.top - padding.bottom;

  const makePoints = (vals) => vals.map((v, i) => ({
    x: padding.left + (i / (vals.length - 1)) * (800 - padding.left - padding.right),
    y: padding.top + chartH - (v / max) * chartH,
  }));

  const pts = makePoints(values);
  const pts2 = values2 ? makePoints(values2) : null;

  const toPath = (points) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const toArea = (points) => `${toPath(points)} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 800 ${height}`} preserveAspectRatio="none" className="w-full h-full" onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id={`area-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          {secondDataKey && (
            <linearGradient id={`area-${secondDataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={secondColor} stopOpacity="0.02" />
            </linearGradient>
          )}
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = padding.top + chartH * (1 - frac);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={800 - padding.right} y2={y} stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4 4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'} fontSize="11" fontFamily="DM Sans, sans-serif">
                {Math.round(max * frac)}
              </text>
            </g>
          );
        })}

        {/* Second series (behind) */}
        {pts2 && (
          <>
            <path d={toArea(pts2)} fill={`url(#area-${secondDataKey})`} />
            <path d={toPath(pts2)} fill="none" stroke={secondColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
          </>
        )}

        <path d={toArea(pts)} fill={`url(#area-${dataKey})`} />
        <path d={toPath(pts)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hovered === i ? 5 : 0} fill={color} stroke="white" strokeWidth="2" />
        ))}
        {pts.map((p, i) => (
          <rect key={`h-${i}`} x={p.x - (800 - padding.left - padding.right) / values.length / 2} y={padding.top} width={(800 - padding.left - padding.right) / values.length} height={chartH} fill="transparent" onMouseEnter={() => setHovered(i)} />
        ))}

        {data.map((d, i) => {
          if (data.length > 14 && i % Math.ceil(data.length / 10) !== 0) return null;
          const x = padding.left + (i / (data.length - 1)) * (800 - padding.left - padding.right);
          return (
            <text key={i} x={x} y={height - 6} textAnchor="middle" fill={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'} fontSize="11" fontFamily="DM Sans, sans-serif">
              {formatDate(d.date)}
            </text>
          );
        })}
      </svg>

      {hovered !== null && data[hovered] && (
        <div className="absolute pointer-events-none px-3 py-2 rounded-lg text-xs font-body z-10" style={{ left: `${(hovered / (data.length - 1)) * 100}%`, top: 0, transform: 'translateX(-50%)', background: dark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, color: dark ? '#fff' : '#1a1a1a' }}>
          <div className="font-semibold" style={{ color }}>{data[hovered][dataKey]}</div>
          {secondDataKey && <div className="font-semibold" style={{ color: secondColor }}>{data[hovered][secondDataKey] || 0}</div>}
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
          <span className="text-xs font-body shrink-0 truncate" style={{ width: 140, color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }} title={item[labelKey]}>
            {item[labelKey] || '(direkt)'}
          </span>
          <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <div className="h-full rounded-md flex items-center px-2" style={{ width: `${Math.max((item[valueKey] / maxVal) * 100, 2)}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <span className="text-[10px] font-bold text-white whitespace-nowrap">{item[valueKey]}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart ───
function DonutChart({ items, colors, size = 120 }) {
  const { dark } = useTheme();
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        {items.map((item, i) => {
          const pct = item.value / total;
          const dash = pct * circumference;
          const seg = (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors[i % colors.length]} strokeWidth="16" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.16, 1, 0.3, 1)' }} />
          );
          offset += dash;
          return seg;
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" fill={dark ? '#fff' : '#1a1a1a'} fontSize="18" fontWeight="bold" fontFamily="Plus Jakarta Sans, sans-serif">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
              {item.label}: <span className="font-semibold">{item.value}</span> ({((item.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceIcon({ type }) {
  const lower = (type || '').toLowerCase();
  if (lower === 'mobile') return <Smartphone className="w-4 h-4" />;
  if (lower === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function StatCard({ icon: Icon, label, value, sub, color, sparkData, sparkKey }) {
  const { dark } = useTheme();
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: dark ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))', boxShadow: dark ? '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset' : '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03) inset' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-xs font-body font-medium" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{label}</span>
          </div>
          <div className="text-2xl font-display font-bold tracking-display" style={{ color: dark ? '#fff' : '#1a1a1a' }}>{value}</div>
          {sub && <div className="text-xs font-body mt-1" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{sub}</div>}
        </div>
        {sparkData && sparkKey && <SparkLine data={sparkData} dataKey={sparkKey} color={color} height={40} width={100} />}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = '', badge }) {
  const { dark } = useTheme();
  return (
    <div className={`rounded-2xl p-6 ${className}`} style={{ background: dark ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))', boxShadow: dark ? '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset' : '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03) inset' }}>
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4" style={{ color: '#0D7377' }} />
        <h3 className="text-sm font-display font-bold tracking-display" style={{ color: dark ? '#fff' : '#1a1a1a' }}>{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Table component ───
function DataTable({ columns, rows, dark }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-body">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="text-left pb-3 font-semibold" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
              {columns.map((col, j) => (
                <td key={j} className="py-2.5" style={{ color: col.color || (dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)') }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabs component ───
function Tabs({ tabs, active, onChange }) {
  const { dark } = useTheme();
  return (
    <div className="flex gap-1 mb-4 rounded-lg p-1" style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)} className="px-3 py-1.5 rounded-md text-xs font-body font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95" style={{ background: active === tab.key ? (dark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent', color: active === tab.key ? (dark ? '#fff' : '#1a1a1a') : (dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), boxShadow: active === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'background 150ms ease, color 150ms ease, transform 100ms ease' }}>
          {tab.label}
        </button>
      ))}
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
  const [realtime, setRealtime] = useState(null);
  const [userflow, setUserflow] = useState(null);
  const [events, setEvents] = useState(null);
  const [acquisition, setAcquisition] = useState(null);
  const [audience, setAudience] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acqTab, setAcqTab] = useState('channels');
  const realtimeTimer = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, pgRes, geoRes, srcRes, devRes, flowRes, evtRes, acqRes, audRes, alertRes] = await Promise.all([
        api.get(`/analytics/overview?range=${range}`),
        api.get(`/analytics/pages?range=${range}`),
        api.get(`/analytics/geo?range=${range}`),
        api.get(`/analytics/sources?range=${range}`),
        api.get(`/analytics/devices?range=${range}`),
        api.get(`/analytics/userflow?range=${range}`),
        api.get(`/analytics/events?range=${range}`),
        api.get(`/analytics/acquisition?range=${range}`),
        api.get(`/analytics/audience?range=${range}`),
        api.get('/analytics/alerts'),
      ]);
      setOverview(ovRes.data);
      setPages(pgRes.data);
      setGeo(geoRes.data);
      setSources(srcRes.data);
      setDevices(devRes.data);
      setUserflow(flowRes.data);
      setEvents(evtRes.data);
      setAcquisition(acqRes.data);
      setAudience(audRes.data);
      setAlerts(alertRes.data);
    } catch (err) {
      setError('Analytics-Daten konnten nicht geladen werden.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Fetch realtime separately with auto-refresh
  const fetchRealtime = useCallback(async () => {
    try {
      const res = await api.get('/analytics/realtime');
      setRealtime(res.data);
    } catch (err) {
      console.error('Realtime fetch error:', err);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetchRealtime();
    realtimeTimer.current = setInterval(fetchRealtime, 30000); // refresh every 30s
    return () => clearInterval(realtimeTimer.current);
  }, [fetchRealtime]);

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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D7377, #094e51)', boxShadow: '0 2px 8px rgba(13,115,119,0.4)' }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-display" style={{ color: dark ? '#fff' : '#1a1a1a' }}>Website Analytics</h1>
            <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Google Analytics — novaris-consulting.de</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => setRange(opt.key)} className="px-4 py-2 text-xs font-body font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95" style={{ background: range === opt.key ? 'linear-gradient(135deg, #0D7377, #094e51)' : 'transparent', color: range === opt.key ? '#fff' : dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', transition: 'background 150ms ease, color 150ms ease, transform 100ms ease' }}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', transition: 'transform 100ms ease' }} title="Aktualisieren">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts && (alerts.alerts?.length > 0 || alerts.pageAlerts?.length > 0) && (
        <div className="rounded-xl px-5 py-4 mb-6" style={{ background: dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', border: `1px solid ${dark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'}` }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-display font-bold" style={{ color: '#f59e0b' }}>Traffic-Benachrichtigungen</span>
          </div>
          <div className="space-y-1.5">
            {alerts.alerts?.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                {a.type === 'spike' ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                <span><strong>{a.metric}</strong>: {a.current} (vorher {a.previous}) — <span style={{ color: a.type === 'spike' ? '#10b981' : '#ef4444' }}>{a.changePercent > 0 ? '+' : ''}{a.changePercent.toFixed(0)}%</span></span>
              </div>
            ))}
            {alerts.pageAlerts?.map((a, i) => (
              <div key={`p-${i}`} className="flex items-center gap-2 text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span><strong>{a.page}</strong>: {a.todayViews} Aufrufe heute (Ø {a.avgViews}/Tag, {a.multiplier}x)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm font-body" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
      )}

      {loading && !overview ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : overview && (
        <>
          {/* ═══ Realtime banner ═══ */}
          <SectionCard title="Echtzeit" icon={Activity} className="mb-6" badge={<PulseDot />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-4xl font-display font-bold tracking-display mb-1" style={{ color: '#10b981' }}>
                  {realtime?.activeNow ?? '—'}
                </div>
                <div className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Nutzer gerade online</div>
                {realtime?.geo?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {realtime.geo.slice(0, 4).map((g, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-body">
                        <span style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>{g.city !== '(not set)' ? g.city : g.country}</span>
                        <span className="font-semibold" style={{ color: '#10b981' }}>{g.users}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-body font-semibold mb-2" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Aktive Seiten</div>
                <div className="space-y-1.5">
                  {(realtime?.pages || []).slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-body">
                      <span className="truncate mr-3" style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>{p.page || '(Startseite)'}</span>
                      <span className="font-semibold shrink-0" style={{ color: '#0D7377' }}>{p.users}</span>
                    </div>
                  ))}
                  {(!realtime?.pages || realtime.pages.length === 0) && (
                    <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Keine aktiven Nutzer</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-body font-semibold mb-2" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Quellen (Echtzeit)</div>
                <div className="space-y-1.5">
                  {(realtime?.sources || []).slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-body">
                      <span style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>{s.source || '(direkt)'}</span>
                      <span className="font-semibold" style={{ color: '#6366f1' }}>{s.users}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ═══ Stat cards ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Aktive Nutzer" value={overview.totals.activeUsers.toLocaleString('de-DE')} sub={`Ø ${Math.round(overview.totals.activeUsers / (overview.rows.length || 1))} / Tag`} color="#0D7377" sparkData={overview.rows} sparkKey="activeUsers" />
            <StatCard icon={UserPlus} label="Neue Nutzer" value={overview.totals.newUsers.toLocaleString('de-DE')} sub={`${((overview.totals.newUsers / (overview.totals.activeUsers || 1)) * 100).toFixed(0)}% aller Nutzer`} color="#10b981" sparkData={overview.rows} sparkKey="newUsers" />
            <StatCard icon={MousePointerClick} label="Seitenaufrufe" value={overview.totals.pageViews.toLocaleString('de-DE')} sub={`Ø ${overview.totals.avgPagesPerSession?.toFixed(1) || '—'} / Sitzung`} color="#6366f1" sparkData={overview.rows} sparkKey="pageViews" />
            <StatCard icon={Clock} label="Ø Sitzungsdauer" value={formatDuration(overview.totals.avgSessionDuration)} sub={`Absprungrate: ${formatPercent(overview.totals.avgBounceRate)}`} color="#f59e0b" sparkData={overview.rows} sparkKey="sessions" />
          </div>

          {/* ═══ New vs Returning users chart ═══ */}
          {audience?.newVsReturningOverTime?.length > 0 && (
            <SectionCard title="Neue vs. Wiederkehrende Nutzer" icon={UserCheck} className="mb-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-body"><div className="w-3 h-1 rounded" style={{ background: '#10b981' }} /> Neu</div>
                <div className="flex items-center gap-1.5 text-xs font-body"><div className="w-3 h-1 rounded" style={{ background: '#6366f1' }} /> Wiederkehrend</div>
              </div>
              <AreaChart data={audience.newVsReturningOverTime} dataKey="new" color="#10b981" secondDataKey="returning" secondColor="#6366f1" height={200} />
              {audience.newVsReturning?.length > 0 && (
                <div className="flex gap-6 mt-4">
                  {audience.newVsReturning.map((nvr, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {nvr.type === 'new' ? <UserPlus className="w-4 h-4" style={{ color: '#10b981' }} /> : <UserCheck className="w-4 h-4" style={{ color: '#6366f1' }} />}
                      <div>
                        <div className="text-xs font-body font-semibold" style={{ color: dark ? '#fff' : '#1a1a1a' }}>{nvr.users} {nvr.type === 'new' ? 'Neue' : 'Wiederkehrende'}</div>
                        <div className="text-[10px] font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{nvr.sessions} Sitzungen · Ø {formatDuration(nvr.avgDuration)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* ═══ Users over time ═══ */}
          <SectionCard title="Nutzer-Verlauf" icon={TrendingUp} className="mb-6">
            <AreaChart data={overview.rows} dataKey="activeUsers" color="#0D7377" height={220} />
          </SectionCard>

          {/* ═══ Page views chart ═══ */}
          <SectionCard title="Seitenaufrufe" icon={MousePointerClick} className="mb-6">
            <AreaChart data={overview.rows} dataKey="pageViews" color="#6366f1" height={180} />
          </SectionCard>

          {/* ═══ User Flow: Landing + Exit pages ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SectionCard title="Einstiegsseiten" icon={LogIn}>
              {userflow?.landingPages?.length > 0 ? (
                <DataTable dark={dark} columns={[
                  { label: 'Seite', key: 'path', render: (r) => <span className="truncate block max-w-[200px]" title={r.path}>{r.path}</span> },
                  { label: 'Sitzungen', key: 'sessions', color: '#0D7377' },
                  { label: 'Nutzer', key: 'users' },
                  { label: 'Absprung', render: (r) => formatPercent(r.bounceRate) },
                ]} rows={userflow.landingPages.slice(0, 8)} />
              ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</span>}
            </SectionCard>

            <SectionCard title="Ausstiegsseiten" icon={LogOutIcon}>
              {userflow?.exitPages?.length > 0 ? (
                <DataTable dark={dark} columns={[
                  { label: 'Seite', key: 'path', render: (r) => <span className="truncate block max-w-[200px]" title={r.path}>{r.path}</span> },
                  { label: 'Aufrufe', key: 'views', color: '#ef4444' },
                  { label: 'Nutzer', key: 'users' },
                ]} rows={userflow.exitPages.slice(0, 8)} />
              ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</span>}
            </SectionCard>
          </div>

          {/* ═══ Events & Conversions ═══ */}
          <SectionCard title="Events & Conversions" icon={Zap} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-body font-semibold mb-3" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Top Events</div>
                <HorizontalBar items={events?.events || []} valueKey="count" labelKey="name" color="#8b5cf6" maxItems={10} />
              </div>
              <div>
                <div className="text-xs font-body font-semibold mb-3" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Events nach Nutzern</div>
                {events?.events?.length > 0 ? (
                  <DataTable dark={dark} columns={[
                    { label: 'Event', key: 'name' },
                    { label: 'Anzahl', key: 'count', color: '#8b5cf6' },
                    { label: 'Nutzer', key: 'users' },
                  ]} rows={events.events.slice(0, 10)} />
                ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Events</span>}
              </div>
            </div>
          </SectionCard>

          {/* ═══ Three columns: Top pages, Geo, Sources ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <SectionCard title="Top Seiten" icon={ExternalLink}>
              {pages?.pages?.length > 0 ? (
                <div className="space-y-3">
                  {pages.pages.slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-body font-medium truncate" style={{ color: dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }} title={p.path}>{p.title || p.path}</div>
                        <div className="text-[10px] font-body truncate" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>{p.path}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-body font-semibold" style={{ color: '#0D7377' }}>{p.views}</span>
                        <span className="text-[10px] font-body" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>{p.users} Nutzer</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</p>}
            </SectionCard>

            <SectionCard title="Standorte" icon={Globe}>
              {geo?.locations?.length > 0 ? (
                <div className="space-y-3">
                  {geo.locations.slice(0, 8).map((loc, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-body font-medium truncate" style={{ color: dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}>
                          {loc.city !== '(not set)' ? loc.city : loc.region !== '(not set)' ? loc.region : loc.country}
                        </div>
                        <div className="text-[10px] font-body" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                          {loc.country}{loc.region !== '(not set)' ? `, ${loc.region}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-body font-semibold" style={{ color: '#10b981' }}>{loc.users}</span>
                        <span className="text-[10px] font-body" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>{loc.sessions} Sitz.</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</p>}
            </SectionCard>

            <SectionCard title="Traffic-Quellen" icon={TrendingUp}>
              {sources?.sources?.length > 0 ? (
                <HorizontalBar items={sources.sources} valueKey="sessions" labelKey="source" color="#6366f1" maxItems={8} />
              ) : <p className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</p>}
            </SectionCard>
          </div>

          {/* ═══ Acquisition: Channels, Referrals, Campaigns ═══ */}
          <SectionCard title="Akquisition" icon={Megaphone} className="mb-6">
            <Tabs tabs={[
              { key: 'channels', label: 'Kanäle' },
              { key: 'referrals', label: 'Verweise' },
              { key: 'campaigns', label: 'Kampagnen' },
            ]} active={acqTab} onChange={setAcqTab} />

            {acqTab === 'channels' && acquisition?.channels?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <HorizontalBar items={acquisition.channels} valueKey="sessions" labelKey="channel" color="#0D7377" maxItems={8} />
                <DataTable dark={dark} columns={[
                  { label: 'Kanal', key: 'channel' },
                  { label: 'Sitzungen', key: 'sessions', color: '#0D7377' },
                  { label: 'Nutzer', key: 'users' },
                  { label: 'Neue', key: 'newUsers', color: '#10b981' },
                ]} rows={acquisition.channels.slice(0, 8)} />
              </div>
            )}

            {acqTab === 'referrals' && (
              acquisition?.referrals?.length > 0 ? (
                <HorizontalBar items={acquisition.referrals} valueKey="sessions" labelKey="source" color="#8b5cf6" maxItems={10} />
              ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Verweise gefunden</span>
            )}

            {acqTab === 'campaigns' && (
              acquisition?.campaigns?.length > 0 ? (
                <DataTable dark={dark} columns={[
                  { label: 'Kampagne', key: 'campaign' },
                  { label: 'Quelle', key: 'source' },
                  { label: 'Medium', key: 'medium' },
                  { label: 'Sitzungen', key: 'sessions', color: '#f59e0b' },
                  { label: 'Neue', key: 'newUsers', color: '#10b981' },
                ]} rows={acquisition.campaigns} />
              ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Kampagnen-Daten</span>
            )}
          </SectionCard>

          {/* ═══ Audience Insights ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* New vs Returning donut */}
            <SectionCard title="Nutzertypen" icon={Users}>
              {audience?.newVsReturning?.length > 0 ? (
                <DonutChart items={audience.newVsReturning.map(n => ({ label: n.type === 'new' ? 'Neu' : 'Wiederkehrend', value: n.users }))} colors={['#10b981', '#6366f1']} />
              ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</span>}
            </SectionCard>

            {/* Languages */}
            <SectionCard title="Sprachen" icon={Languages}>
              {audience?.languages?.length > 0 ? (
                <HorizontalBar items={audience.languages} valueKey="users" labelKey="language" color="#0D7377" maxItems={6} />
              ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</span>}
            </SectionCard>

            {/* Screen resolutions */}
            <SectionCard title="Bildschirmauflösungen" icon={Maximize}>
              {audience?.screenResolutions?.length > 0 ? (
                <HorizontalBar items={audience.screenResolutions} valueKey="users" labelKey="resolution" color="#f59e0b" maxItems={6} />
              ) : <span className="text-xs font-body" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Keine Daten</span>}
            </SectionCard>
          </div>

          {/* ═══ Devices section ═══ */}
          <SectionCard title="Geräte & Browser" icon={Monitor} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-body font-semibold mb-4" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Gerätekategorien</h4>
                <div className="space-y-3">
                  {Object.entries(deviceSummary).sort(([, a], [, b]) => b - a).map(([device, count]) => {
                    const pct = (count / totalDeviceUsers) * 100;
                    return (
                      <div key={device} className="flex items-center gap-3">
                        <DeviceIcon type={device} />
                        <span className="text-xs font-body font-medium capitalize w-16" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>{device}</span>
                        <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                          <div className="h-full rounded-md flex items-center px-2" style={{ width: `${Math.max(pct, 3)}%`, background: 'linear-gradient(90deg, #0D7377, #0D7377cc)', transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <span className="text-[10px] font-bold text-white whitespace-nowrap">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <span className="text-xs font-body tabular-nums" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-body font-semibold mb-4" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Browser</h4>
                <HorizontalBar items={devices?.devices?.reduce((acc, d) => { const e = acc.find(a => a.browser === d.browser); if (e) e.users += d.users; else acc.push({ browser: d.browser, users: d.users }); return acc; }, [])?.sort((a, b) => b.users - a.users) || []} valueKey="users" labelKey="browser" color="#f59e0b" maxItems={6} />
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
