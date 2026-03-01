import { useState, useEffect } from 'react';
import api from '../services/api';

const STAGE_LABELS = {
  FIRMA_IDENTIFIZIERT: 'Identifiziert',
  FIRMA_KONTAKTIERT: 'Kontaktiert',
  VERHANDLUNG: 'Verhandlung',
  CLOSED_WON: 'Gewonnen',
};

const STAGE_COLORS = [
  'rgba(13,115,119,0.2)',
  'rgba(13,115,119,0.4)',
  'rgba(13,115,119,0.65)',
  '#0D7377',
];

export default function ConversionFunnel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/funnel')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6 animate-pulse h-48" />
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6"
      style={{
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      <h3 className="text-sm font-display font-bold text-text-primary dark:text-dark-text-primary mb-4">
        Conversion-Funnel
      </h3>

      <div className="space-y-3">
        {data.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <div className="w-24 text-right">
                <span className="text-[11px] font-body font-medium text-text-secondary dark:text-dark-text-secondary">
                  {STAGE_LABELS[stage.stage] || stage.stage}
                </span>
              </div>
              <div className="flex-1 relative">
                <div
                  className="h-8 rounded-lg flex items-center px-3"
                  style={{
                    width: `${widthPct}%`,
                    background: STAGE_COLORS[i] || STAGE_COLORS[0],
                    transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <span className={`text-[12px] font-display font-bold ${i >= 2 ? 'text-white' : 'text-text-primary dark:text-dark-text-primary'}`}>
                    {stage.count}
                  </span>
                </div>
              </div>
              {i > 0 && (
                <div className="w-12 text-right">
                  <span className={`text-[11px] font-body font-semibold ${
                    stage.conversionRate >= 50 ? 'text-green-600 dark:text-green-400' :
                    stage.conversionRate >= 25 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-500 dark:text-red-400'
                  }`}>
                    {stage.conversionRate}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
