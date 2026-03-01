import { useState, useEffect } from 'react';
import api from '../services/api';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getColor(count, dark) {
  if (count === 0) return dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  if (count <= 2) return 'rgba(13,115,119,0.2)';
  if (count <= 5) return 'rgba(13,115,119,0.4)';
  if (count <= 10) return 'rgba(13,115,119,0.6)';
  return 'rgba(13,115,119,0.85)';
}

export default function ActivityHeatmap() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    api.get('/dashboard/heatmap')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6 animate-pulse h-48" />
    );
  }

  // Generate 90 days of cells
  const today = new Date();
  const cells = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    cells.push({ date: key, count: data[key] || 0, dayOfWeek: d.getDay() });
  }

  // Group into weeks
  const weeks = [];
  let currentWeek = [];
  for (const cell of cells) {
    const adjustedDay = cell.dayOfWeek === 0 ? 6 : cell.dayOfWeek - 1; // Mon=0
    if (adjustedDay === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push({ ...cell, row: adjustedDay });
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const dark = document.documentElement.classList.contains('dark');

  return (
    <div className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6"
      style={{
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      <h3 className="text-sm font-display font-bold text-text-primary dark:text-dark-text-primary mb-4">
        Aktivitäts-Heatmap (90 Tage)
      </h3>

      <div className="flex gap-1">
        {/* Weekday labels */}
        <div className="flex flex-col gap-1 mr-1">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className="h-3 flex items-center">
              {i % 2 === 0 && (
                <span className="text-[9px] text-text-tertiary dark:text-dark-text-tertiary font-body">{day}</span>
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, row) => {
              const cell = week.find((c) => c.row === row);
              if (!cell) return <div key={row} className="w-3 h-3" />;
              return (
                <div
                  key={row}
                  className="w-3 h-3 rounded-sm relative cursor-default"
                  style={{
                    background: getColor(cell.count, dark),
                    transition: 'background-color 200ms ease',
                  }}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {hoveredCell?.date === cell.date && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 font-body">
                      {cell.date}: {cell.count} Aktivität{cell.count !== 1 ? 'en' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border dark:border-dark-border">
        <span className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary font-body">Weniger</span>
        {[0, 2, 5, 10, 15].map((v) => (
          <div key={v} className="w-3 h-3 rounded-sm" style={{ background: getColor(v, dark) }} />
        ))}
        <span className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary font-body">Mehr</span>
      </div>
    </div>
  );
}
