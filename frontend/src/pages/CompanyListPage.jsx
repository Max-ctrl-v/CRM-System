import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '../context/CompaniesContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import CreateCompanyModal from '../components/CreateCompanyModal';
import {
  Search,
  Building2,
  Users,
  Globe,
  ChevronRight,
  ArrowUpDown,
  Plus,
  CircleOff,
  Clock,
  PhoneOff,
  Trash2,
  ChevronDown,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  Star,
  CalendarClock,
  CalendarCheck,
} from 'lucide-react';
import SkeletonRow from '../components/skeletons/SkeletonRow';
import EmptyState from '../components/EmptyState';
import FilterPanel from '../components/FilterPanel';
import SavedViewSelector from '../components/SavedViewSelector';
import ImportModal from '../components/ImportModal';

const STAGE_LABELS = {
  FIRMA_IDENTIFIZIERT: { label: 'Identifiziert', color: '#6366f1', bg: '#eef2ff', bgDark: 'rgba(99,102,241,0.12)' },
  FIRMA_KONTAKTIERT: { label: 'Kontaktiert', color: '#3b82f6', bg: '#eff6ff', bgDark: 'rgba(59,130,246,0.12)' },
  VERHANDLUNG: { label: 'Verhandlung', color: '#f59e0b', bg: '#fffbeb', bgDark: 'rgba(245,158,11,0.12)' },
  CLOSED_WON: { label: 'Won', color: '#10b981', bg: '#ecfdf5', bgDark: 'rgba(16,185,129,0.12)' },
  CLOSED_LOST: { label: 'Lost', color: '#ef4444', bg: '#fef2f2', bgDark: 'rgba(239,68,68,0.12)' },
};

const STAGE_OPTIONS = [
  { key: 'FIRMA_IDENTIFIZIERT', label: 'Identifiziert' },
  { key: 'FIRMA_KONTAKTIERT', label: 'Kontaktiert' },
  { key: 'VERHANDLUNG', label: 'Verhandlung' },
  { key: 'CLOSED_WON', label: 'Closed Won' },
  { key: 'CLOSED_LOST', label: 'Closed Lost' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} T.`;
  const weeks = Math.floor(days / 7);
  return `vor ${weeks} Wo.`;
}

function exportCSV(companies) {
  const headers = ['Name', 'Website', 'Stadt', 'Pipeline-Stufe', 'Zugewiesen', 'Kontakte', 'Erstellt', 'Zuletzt aktualisiert'];
  const rows = companies.map((c) => [
    c.name,
    c.website || '',
    c.city || '',
    c.pipelineStage ? (STAGE_LABELS[c.pipelineStage]?.label || c.pipelineStage) : 'Keine Pipeline',
    c.assignedTo?.name || '',
    c._count?.contacts || 0,
    new Date(c.createdAt).toLocaleDateString('de-DE'),
    c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('de-DE') : '',
  ]);
  const csv = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
  ).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `firmen-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CompanyListPage() {
  const navigate = useNavigate();
  const { companies, allUsers, loading, addCompany, updateCompany, refresh } = useCompanies();
  const { addToast } = useToast();
  const { dark } = useTheme();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ stages: [], assignedToId: '', city: '', dateFrom: '', dateTo: '', uisOnly: false });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [starAnimatingId, setStarAnimatingId] = useState(null);

  async function toggleFavorite(e, companyId) {
    e.stopPropagation();
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) return;
    const newVal = !comp.isFavorite;
    updateCompany({ ...comp, isFavorite: newVal });
    if (newVal) {
      setStarAnimatingId(companyId);
      setTimeout(() => setStarAnimatingId(null), 650);
    }
    try { await api.patch(`/companies/${companyId}/favorite`); }
    catch { refresh(); }
  }

  function handleCompanyCreated(company) {
    addCompany(company);
    setShowCreate(false);
  }

  function toggleSort(field) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    const searched = companies.filter((c) => {
      // Text search
      if (search) {
        const q = search.toLowerCase();
        const contactMatch = c.contacts?.some((ct) =>
          (ct.firstName && ct.firstName.toLowerCase().includes(q)) ||
          (ct.lastName && ct.lastName.toLowerCase().includes(q))
        );
        const textMatch =
          c.name.toLowerCase().includes(q) ||
          c.website?.toLowerCase().includes(q) ||
          c.assignedTo?.name?.toLowerCase().includes(q) ||
          (c.pipelineStage && STAGE_LABELS[c.pipelineStage]?.label.toLowerCase().includes(q)) ||
          (!c.pipelineStage && 'keine pipeline'.includes(q)) ||
          contactMatch;
        if (!textMatch) return false;
      }

      // Advanced filters
      if (advancedFilters.stages?.length > 0) {
        if (!c.pipelineStage || !advancedFilters.stages.includes(c.pipelineStage)) return false;
      }
      if (advancedFilters.assignedToId) {
        if (advancedFilters.assignedToId === 'UNASSIGNED') {
          if (c.assignedToId || c.assignedTo) return false;
        } else if (c.assignedTo?.id !== advancedFilters.assignedToId) return false;
      }
      if (advancedFilters.city) {
        if (!c.city || !c.city.toLowerCase().includes(advancedFilters.city.toLowerCase())) return false;
      }
      if (advancedFilters.dateFrom) {
        if (c.createdAt < advancedFilters.dateFrom) return false;
      }
      if (advancedFilters.dateTo) {
        if (c.createdAt > advancedFilters.dateTo + 'T23:59:59') return false;
      }
      if (advancedFilters.uisOnly) {
        if (!c.uisSchwierigkeiten) return false;
      }

      return true;
    });
    return searched.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
      else if (sortBy === 'stage') { valA = a.pipelineStage || 'zzz'; valB = b.pipelineStage || 'zzz'; }
      else if (sortBy === 'date') { valA = a.createdAt; valB = b.createdAt; }
      else if (sortBy === 'assigned') { valA = a.assignedTo?.name?.toLowerCase() || 'zzz'; valB = b.assignedTo?.name?.toLowerCase() || 'zzz'; }
      else if (sortBy === 'updated') { valA = a.updatedAt || ''; valB = b.updatedAt || ''; }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [companies, search, sortBy, sortDir, advancedFilters]);

  const toggleSelect = useCallback((id, e) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }, [filtered, selected.size]);

  async function executeBulkAction(action, extra = {}) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await api.post('/companies/bulk', { ids: [...selected], action, ...extra });
      addToast(`${selected.size} Firmen aktualisiert`, 'success');
      setSelected(new Set());
      setBulkAction('');
      refresh();
    } catch {
      addToast('Fehler bei Massenaktion', 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-24" />
          </div>
        </div>
        <div className="bg-white rounded-xl overflow-hidden border border-border-light" style={{ boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border" style={{ background: dark ? '#1e2130' : '#f8f9fc' }}>
                {['Firma', 'Website', 'Stufe', 'Zugewiesen', 'Kontakte', 'Erstellt', 'Zuletzt'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider font-body">{h}</th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && selected.size < filtered.length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-gray-900 tracking-display">Alle Firmen</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-body">{companies.length} Firmen insgesamt</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Name, Kontakt, Website, Stufe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 py-2 text-sm w-80"
              autoFocus
            />
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            className="btn-secondary flex items-center gap-2"
            title="Als CSV exportieren"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body font-medium
              bg-surface-elevated dark:bg-dark-elevated text-text-secondary dark:text-dark-text-secondary
              hover:text-text-primary dark:hover:text-dark-text-primary border border-border dark:border-dark-border
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <Plus className="w-4 h-4" /> Import
          </button>
          <FilterPanel
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            expanded={filtersExpanded}
            onToggle={() => setFiltersExpanded(!filtersExpanded)}
          />
          <SavedViewSelector
            currentFilters={advancedFilters}
            onLoadView={setAdvancedFilters}
          />
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Neue Firma
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div
          className="mb-4 flex items-center gap-3 px-5 py-3 rounded-xl border border-brand-200 bg-brand-50"
          style={{ boxShadow: dark ? '0 1px 3px rgba(13,115,119,0.2)' : '0 1px 3px rgba(13,115,119,0.08)' }}
        >
          <span className="text-[13px] font-display font-bold text-brand-700">
            {selected.size} ausgewählt
          </span>
          <div className="w-px h-5 bg-brand-200" />

          {/* Stage change */}
          <div className="relative">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) executeBulkAction('stage', { stage: e.target.value });
              }}
              disabled={bulkLoading}
              className="text-[12px] font-semibold font-body px-3 py-1.5 rounded-lg border border-brand-200 bg-white text-brand-700 cursor-pointer appearance-none pr-7"
            >
              <option value="">Stufe ändern...</option>
              {STAGE_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
              <option value="null">Pipeline entfernen</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-400 pointer-events-none" />
          </div>

          {/* Assign */}
          <div className="relative">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) executeBulkAction('assign', { assignedToId: e.target.value === 'none' ? null : e.target.value });
              }}
              disabled={bulkLoading}
              className="text-[12px] font-semibold font-body px-3 py-1.5 rounded-lg border border-brand-200 bg-white text-brand-700 cursor-pointer appearance-none pr-7"
            >
              <option value="">Zuweisen an...</option>
              <option value="none">Niemand</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-400 pointer-events-none" />
          </div>

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm(`${selected.size} Firmen wirklich löschen?`)) {
                executeBulkAction('delete');
              }
            }}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 text-[12px] font-semibold font-body px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
            style={{ transition: 'background-color 150ms ease' }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Löschen
          </button>

          <div className="flex-1" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] text-brand-500 hover:text-brand-700 font-semibold font-body"
            style={{ transition: 'color 150ms ease' }}
          >
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* Table */}
      <div
        className="bg-white rounded-xl overflow-hidden border border-border-light"
        style={{ boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border" style={{ background: dark ? '#1e2130' : '#f8f9fc' }}>
              <th className="w-12 px-4 py-3.5">
                <button
                  onClick={toggleSelectAll}
                  className="text-gray-400 hover:text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-300 rounded"
                  style={{ transition: 'color 150ms ease' }}
                >
                  {allSelected ? <CheckSquare className="w-4 h-4 text-brand-500" /> : someSelected ? <MinusSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              {[
                { key: 'name', label: 'Firma' },
                { key: null, label: 'Website' },
                { key: 'stage', label: 'Stufe' },
                { key: 'assigned', label: 'Zugewiesen' },
                { key: null, label: 'Kontakte' },
                { key: 'date', label: 'Erstellt' },
                { key: 'updated', label: 'Zuletzt' },
              ].map((col, i) => (
                <th
                  key={i}
                  className={`text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-body ${
                    col.key ? 'cursor-pointer hover:text-gray-700 select-none' : ''
                  }`}
                  onClick={col.key ? () => toggleSort(col.key) : undefined}
                  style={col.key ? { transition: 'color 150ms ease' } : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortBy === col.key && <ArrowUpDown className="w-3 h-3" />}
                  </span>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((company, idx) => {
              const stage = company.pipelineStage ? STAGE_LABELS[company.pipelineStage] : null;
              const isSelected = selected.has(company.id);
              return (
                <tr
                  key={company.id}
                  onClick={() => navigate(`/company/${company.id}`)}
                  className="cursor-pointer group"
                  style={{
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${dark ? '#2a2d3d' : '#e5e7ee'}` : 'none',
                    transition: 'background-color 150ms ease',
                    backgroundColor: isSelected
                      ? (dark ? 'rgba(13,115,119,0.12)' : '#e8fafb')
                      : company.doNotCall
                      ? (dark ? 'rgba(239,68,68,0.08)' : '#fef2f2')
                      : '',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected
                    ? (dark ? 'rgba(13,115,119,0.18)' : '#c5f2f3')
                    : company.doNotCall
                    ? (dark ? 'rgba(239,68,68,0.12)' : '#fee2e2')
                    : (dark ? '#252838' : '#f8f9fc')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected
                    ? (dark ? 'rgba(13,115,119,0.12)' : '#e8fafb')
                    : company.doNotCall
                    ? (dark ? 'rgba(239,68,68,0.08)' : '#fef2f2')
                    : ''}
                >
                  <td className="w-12 px-4 py-3.5" onClick={(e) => toggleSelect(company.id, e)}>
                    <button className="text-gray-400 hover:text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-300 rounded" style={{ transition: 'color 150ms ease' }}>
                      {isSelected ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => toggleFavorite(e, company.id)}
                        className={`shrink-0 rounded focus-visible:ring-2 focus-visible:ring-amber-400 ${starAnimatingId === company.id ? 'star-animate' : ''}`}
                        title={company.isFavorite ? 'Aus Scope entfernen' : 'In Scope setzen'}
                        style={{ transition: 'transform 150ms ease' }}
                      >
                        <Star className={`w-4 h-4 ${company.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'}`} style={{ transition: 'color 150ms ease' }} />
                      </button>
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: company.doNotCall
                          ? (dark ? 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.1))' : 'linear-gradient(135deg, #fee2e2, #fecaca)')
                          : (dark ? 'linear-gradient(135deg, rgba(13,115,119,0.18), rgba(13,115,119,0.1))' : 'linear-gradient(135deg, #e8fafb, #c5f2f3)') }}
                      >
                        {company.doNotCall ? <PhoneOff className="w-4 h-4 text-red-600" /> : <Building2 className="w-4 h-4 text-brand-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-display font-semibold text-[13px] ${company.doNotCall ? 'text-red-800' : 'text-gray-900'}`}>{company.name}</span>
                          {company.meetingStatus === 'MEETING_SET' && (
                            <CalendarClock className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Meeting geplant" />
                          )}
                          {company.meetingStatus === 'MEETING_DONE' && (
                            <CalendarCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Meeting erledigt" />
                          )}
                        </div>
                        {company.doNotCall && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 font-body mt-0.5">
                            <PhoneOff className="w-2.5 h-2.5" /> Nicht mehr anrufen!
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {company.website ? (
                      <span className="flex items-center gap-1.5 text-[13px] text-gray-500 font-body">
                        <Globe className="w-3.5 h-3.5 text-gray-400" />{company.website}
                      </span>
                    ) : (
                      <span className="text-[13px] text-gray-300 font-body">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {stage ? (
                      <span
                        className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold"
                        style={{ background: dark ? stage.bgDark : stage.bg, color: stage.color }}
                      >
                        {stage.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-500">
                        <CircleOff className="w-3 h-3" />
                        Keine Pipeline
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {company.assignedTo ? (
                      <span className="text-[13px] text-gray-700 font-body">{company.assignedTo.name}</span>
                    ) : (
                      <span className="text-[13px] text-gray-300 font-body">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-[13px] text-gray-500 font-body">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {company._count?.contacts || 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-500 font-body">
                    {new Date(company.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-[13px] text-gray-500 font-body">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {timeAgo(company.updatedAt)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500" style={{ transition: 'color 150ms ease' }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <EmptyState
            icon={Building2}
            title={search ? 'Keine Ergebnisse' : 'Noch keine Firmen'}
            description={search ? `Keine Firmen gefunden für "${search}"` : 'Erstellen Sie die erste Firma.'}
            actionLabel={!search ? 'Neue Firma' : undefined}
            onAction={!search ? () => setShowCreate(true) : undefined}
          />
        )}
      </div>

      {showCreate && (
        <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={handleCompanyCreated} showPipelineOption />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onComplete={() => { setShowImport(false); refresh(); }} />
      )}
    </div>
  );
}
