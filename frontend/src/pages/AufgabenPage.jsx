import { CheckSquare } from 'lucide-react';
import TaskList from '../components/TaskList';

export default function AufgabenPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-6">
      <div className="mb-6">
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
      </div>

      <div
        className="bg-white rounded-xl p-6 border border-border-light"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
      >
        <TaskList showLinks />
      </div>
    </div>
  );
}
