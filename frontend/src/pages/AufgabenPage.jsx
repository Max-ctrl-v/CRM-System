import { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  ChevronDown,
  Search,
  ListChecks,
  AlertCircle,
  Clock,
  CircleCheck,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanies } from '../context/CompaniesContext';
import TaskList from '../components/TaskList';

export default function AufgabenPage() {
  const { user } = useAuth();
  const { allUsers } = useCompanies();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('open'); // 'open' | 'done' | 'all'

  useEffect(() => {
    if (user?.id && !selectedUserId) setSelectedUserId(user.id);
  }, [user?.id, selectedUserId]);

  const assignedToId = selectedUserId === 'ALL' ? undefined : selectedUserId;

  const TABS = [
    { key: 'open', label: 'Offen', icon: ListChecks },
    { key: 'overdue', label: 'Überfällig', icon: AlertCircle },
    { key: 'done', label: 'Erledigt', icon: CircleCheck },
    { key: 'all', label: 'Alle', icon: Filter },
  ];

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Sticky toolbar — matching PipelinePage pattern */}
      <div
        className="px-6 py-3.5 bg-white border-b border-border flex items-center justify-between gap-4"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)' }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-base font-display font-bold text-gray-900 tracking-display">Aufgaben</h2>

          {/* User filter dropdown */}
          <div className="relative">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input-field py-2 text-sm pr-8 pl-3 w-48 appearance-none cursor-pointer font-medium"
            >
              <option value={user?.id}>Meine Aufgaben</option>
              <option value="ALL">Alle Mitarbeiter</option>
              {allUsers.filter((u) => u.id !== user?.id).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Aufgabe suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-56"
            />
          </div>
        </div>

        {/* Tabs — open / done / all */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-semibold font-body
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
                  ${isActive
                    ? 'bg-white text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                style={{
                  boxShadow: isActive
                    ? '0 1px 2px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)'
                    : 'none',
                  transition: 'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
                }}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-surface-base">
        <div className="max-w-[860px] mx-auto px-6 py-5">
          <TaskList
            showLinks
            assignedToId={assignedToId}
            search={search}
            doneFilter={tab}
            onTabChange={setTab}
          />
        </div>
      </div>
    </div>
  );
}
