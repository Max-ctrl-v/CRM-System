import { X } from 'lucide-react';

const SHORTCUTS = [
  { section: 'Navigation', items: [
    { keys: ['G', 'D'], desc: 'Dashboard öffnen' },
    { keys: ['G', 'P'], desc: 'Pipeline öffnen' },
    { keys: ['G', 'C'], desc: 'Alle Firmen öffnen' },
    { keys: ['G', 'A'], desc: 'Aufgaben öffnen' },
  ]},
  { section: 'Aktionen', items: [
    { keys: ['N'], desc: 'Neue Firma erstellen' },
    { keys: ['/'], desc: 'Suche öffnen' },
    { keys: ['?'], desc: 'Tastenkürzel anzeigen' },
    { keys: ['Esc'], desc: 'Modal schließen' },
  ]},
];

export default function ShortcutHelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-raised dark:bg-dark-raised rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 24px 64px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border">
          <h2 className="text-lg font-display font-bold text-text-primary dark:text-dark-text-primary">
            Tastenkürzel
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-surface-elevated dark:hover:bg-dark-elevated
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <h3 className="text-xs font-semibold uppercase text-text-secondary dark:text-dark-text-secondary tracking-wider mb-2 font-body">
                {section.section}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.desc} className="flex items-center justify-between">
                    <span className="text-sm text-text-primary dark:text-dark-text-primary font-body">
                      {item.desc}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono font-semibold
                            bg-surface-elevated dark:bg-dark-elevated text-text-secondary dark:text-dark-text-secondary
                            border border-border dark:border-dark-border rounded-md"
                          >
                            {key}
                          </kbd>
                          {i < item.keys.length - 1 && (
                            <span className="text-text-tertiary dark:text-dark-text-tertiary text-xs mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
