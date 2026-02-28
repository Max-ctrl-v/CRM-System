import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

const STAGE_LABELS = {
  FIRMA_IDENTIFIZIERT: { label: 'Identifiziert', color: '#6366f1', bg: '#eef2ff' },
  FIRMA_KONTAKTIERT: { label: 'Kontaktiert', color: '#3b82f6', bg: '#eff6ff' },
  VERHANDLUNG: { label: 'Verhandlung', color: '#f59e0b', bg: '#fffbeb' },
  CLOSED_WON: { label: 'Won', color: '#10b981', bg: '#ecfdf5' },
  CLOSED_LOST: { label: 'Lost', color: '#ef4444', bg: '#fef2f2' },
};

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

export default function CompanyListPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadCompanies(); }, []);

  function loadCompanies() {
    api.get('/companies')
      .then(({ data }) => setCompanies(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleCompanyCreated(company) {
    setCompanies((prev) => [company, ...prev]);
    setShowCreate(false);
  }

  function toggleSort(field) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  }

  const filtered = companies
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const contactMatch = c.contacts?.some((ct) =>
        (ct.firstName && ct.firstName.toLowerCase().includes(q)) ||
        (ct.lastName && ct.lastName.toLowerCase().includes(q))
      );
      return (
        c.name.toLowerCase().includes(q) ||
        c.website?.toLowerCase().includes(q) ||
        c.assignedTo?.name?.toLowerCase().includes(q) ||
        (c.pipelineStage && STAGE_LABELS[c.pipelineStage]?.label.toLowerCase().includes(q)) ||
        (!c.pipelineStage && 'keine pipeline'.includes(q)) ||
        contactMatch
      );
    })
    .sort((a, b) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

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
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Neue Firma
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl overflow-hidden border border-border-light"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border" style={{ background: '#f8f9fc' }}>
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
              return (
                <tr
                  key={company.id}
                  onClick={() => navigate(`/company/${company.id}`)}
                  className="cursor-pointer group"
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid #e5e7ee' : 'none',
                    transition: 'background-color 150ms ease',
                    backgroundColor: company.doNotCall ? '#fef2f2' : '',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = company.doNotCall ? '#fee2e2' : '#f8f9fc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = company.doNotCall ? '#fef2f2' : ''}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}
                        style={{ background: company.doNotCall ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, #e8fafb, #c5f2f3)' }}
                      >
                        {company.doNotCall ? <PhoneOff className="w-4 h-4 text-red-600" /> : <Building2 className="w-4 h-4 text-brand-600" />}
                      </div>
                      <div className="min-w-0">
                        <span className={`font-display font-semibold text-[13px] block ${company.doNotCall ? 'text-red-800' : 'text-gray-900'}`}>{company.name}</span>
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
                        style={{ background: stage.bg, color: stage.color }}
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
                      {company.contacts?.length || 0}
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
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-body">
              {search ? `Keine Firmen gefunden für "${search}"` : 'Noch keine Firmen erstellt.'}
            </p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={handleCompanyCreated} showPipelineOption />
      )}
    </div>
  );
}
