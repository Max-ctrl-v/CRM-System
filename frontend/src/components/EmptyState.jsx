import { Building2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({ icon: Icon = Building2, title, description, actionLabel, onAction }) {
  const { dark } = useTheme();
  return (
    <div className="text-center py-12 px-4">
      <div
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{
          background: dark ? 'linear-gradient(135deg, #252838 0%, #1e2130 100%)' : 'linear-gradient(135deg, #f3f4f8 0%, #e8eaef 100%)',
          boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <Icon className="w-6 h-6 text-gray-300" />
      </div>
      <p className="text-sm font-display font-semibold text-gray-500 mb-1 tracking-display">{title}</p>
      {description && (
        <p className="text-[12px] text-gray-400 font-body max-w-[200px] mx-auto">{description}</p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary text-sm mt-4">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
