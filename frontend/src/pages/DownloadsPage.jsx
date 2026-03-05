import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { FileText, Download, ArrowRight } from 'lucide-react';

const DOWNLOADS = [
  {
    id: 'fzulg',
    title: 'Forschungszulage (FZulG)',
    subtitle: 'Whitepaper',
    description: 'Vollstandiger Leitfaden zur steuerlichen Forschungsforderung -- Forderbedingungen, Prozess und Vorteile.',
    route: '/downloads/fzulg',
    color: '#1E56B5',
    colorEnd: '#4DAEE5',
  },
];

export default function DownloadsPage() {
  const navigate = useNavigate();
  const { dark } = useTheme();

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1
          className="text-2xl font-display font-bold tracking-tight"
          style={{ color: dark ? '#fff' : '#111827', letterSpacing: '-0.03em' }}
        >
          Downloads
        </h1>
        <p
          className="text-sm font-body mt-1"
          style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280', lineHeight: 1.7 }}
        >
          Whitepaper, Leitfaden und Dokumente zum Herunterladen
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DOWNLOADS.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.route)}
            className="text-left rounded-2xl p-6 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            style={{
              background: dark
                ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
                : '#ffffff',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
              boxShadow: dark
                ? '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset'
                : '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
              transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = dark
                ? '0 2px 4px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset'
                : '0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = dark
                ? '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset'
                : '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)';
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: `linear-gradient(135deg, ${item.color}, ${item.colorEnd})`,
                boxShadow: `0 2px 8px ${item.color}40, 0 4px 16px ${item.color}25`,
              }}
            >
              <FileText className="w-5 h-5 text-white" />
            </div>

            {/* Title */}
            <div
              className="text-xs font-semibold font-body uppercase tracking-wider mb-1"
              style={{ color: item.color }}
            >
              {item.subtitle}
            </div>
            <h3
              className="text-lg font-display font-bold mb-2"
              style={{ color: dark ? '#fff' : '#111827', letterSpacing: '-0.03em' }}
            >
              {item.title}
            </h3>
            <p
              className="text-sm font-body mb-4"
              style={{ color: dark ? 'rgba(255,255,255,0.45)' : '#6b7280', lineHeight: 1.7 }}
            >
              {item.description}
            </p>

            {/* Action */}
            <div className="flex items-center gap-2 text-sm font-semibold font-body" style={{ color: item.color }}>
              <Download className="w-4 h-4" />
              <span>Ansehen & Herunterladen</span>
              <ArrowRight
                className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                style={{ transition: 'opacity 200ms ease, transform 200ms ease' }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
