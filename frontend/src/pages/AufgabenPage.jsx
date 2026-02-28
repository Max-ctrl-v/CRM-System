import { useState, useEffect } from 'react';
import { CheckSquare, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanies } from '../context/CompaniesContext';
import TaskList from '../components/TaskList';

export default function AufgabenPage() {
  const { user } = useAuth();
  const { allUsers } = useCompanies();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.id && !selectedUserId) setSelectedUserId(user.id);
  }, [user?.id, selectedUserId]);

  // Pass assignedToId filter — 'ALL' means no filter (show all tasks)
  const assignedToId = selectedUserId === 'ALL' ? undefined : selectedUserId;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #e8fafb, #c5f2f3)' }}
          >
            <CheckSquare className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-gray-900 tracking-display">Aufgaben</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-body">Alle Aufgaben aller Firmen und Kontakte</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input-field py-2 text-sm pr-8 pl-3 w-52 appearance-none cursor-pointer font-medium"
            >
              <option value={user?.id}>Meine Aufgaben</option>
              <option value="ALL">Alle Mitarbeiter</option>
              {allUsers.filter((u) => u.id !== user?.id).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div
        className="bg-white rounded-xl p-6 border border-border-light"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
      >
        <TaskList showLinks assignedToId={assignedToId} />
      </div>
    </div>
  );
}
