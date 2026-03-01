import { useState, useEffect } from 'react';
import api from '../services/api';

export default function RevenueChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    api.get('/dashboard/revenue-forecast')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6 animate-pulse h-64" />
    );
  }

  const maxVal = Math.max(...data.map((d) => d.won + d.pipeline), 1);

  return (
    <div className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6"
      style={{
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      <h3 className="text-sm font-display font-bold text-text-primary dark:text-dark-text-primary mb-4">
        Umsatzprognose (6 Monate)
      </h3>

      <div className="flex items-end gap-3 h-44">
        {data.map((month, i) => {
          const total = month.won + month.pipeline;
          const height = (total / maxVal) * 100;
          const wonHeight = total > 0 ? (month.won / total) * height : 0;
          const pipelineHeight = height - wonHeight;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 relative"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {hoveredIdx === i && (
                <div className="absolute -top-12 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 font-body"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                >
                  <div>Won: {(month.won / 1000).toFixed(0)}k €</div>
                  <div>Pipeline: {(month.pipeline / 1000).toFixed(0)}k €</div>
                </div>
              )}

              <div className="w-full flex flex-col items-stretch" style={{ height: '140px' }}>
                <div className="flex-1" />
                {pipelineHeight > 0 && (
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${pipelineHeight}%`,
                      background: 'linear-gradient(180deg, rgba(13,115,119,0.3), rgba(13,115,119,0.15))',
                      transition: 'height 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                )}
                {wonHeight > 0 && (
                  <div
                    className="w-full"
                    style={{
                      height: `${wonHeight}%`,
                      background: 'linear-gradient(180deg, #0D7377, #094e51)',
                      borderRadius: pipelineHeight > 0 ? '0' : '6px 6px 0 0',
                      transition: 'height 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                )}
              </div>
              <span className="text-[10px] font-body text-text-secondary dark:text-dark-text-secondary mt-1">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border dark:border-dark-border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: '#0D7377' }} />
          <span className="text-[11px] text-text-secondary dark:text-dark-text-secondary font-body">Abgeschlossen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'rgba(13,115,119,0.3)' }} />
          <span className="text-[11px] text-text-secondary dark:text-dark-text-secondary font-body">Pipeline</span>
        </div>
      </div>
    </div>
  );
}
