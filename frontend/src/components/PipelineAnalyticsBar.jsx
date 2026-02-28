import { Euro } from 'lucide-react';
import { formatEuro } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function PipelineAnalyticsBar({ companies, stages }) {
  const { dark } = useTheme();
  const stageCounts = {};
  const stageRevenues = {};
  stages.forEach((s) => {
    const sc = companies.filter((c) => c.pipelineStage === s.key);
    stageCounts[s.key] = sc.length;
    stageRevenues[s.key] = sc.reduce((sum, c) => sum + (c.expectedRevenue || 0), 0);
  });

  const maxRevenue = Math.max(...Object.values(stageRevenues), 1);
  const mainStages = stages.filter((s) => !['CLOSED_WON', 'CLOSED_LOST'].includes(s.key));

  return (
    <div className="px-5 pb-2">
      <div className="flex gap-3">
        {stages.map((stage) => (
          <div key={stage.key} className="flex-1 min-w-0">
            <div
              className="bg-white rounded-lg border border-border-light p-2.5"
              style={{ boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-gray-500 font-body">
                  {stageCounts[stage.key]} Firmen
                </span>
                {stageRevenues[stage.key] > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold font-body" style={{ color: stage.color }}>
                    <Euro className="w-2.5 h-2.5" />
                    {formatEuro(stageRevenues[stage.key])}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(stageRevenues[stage.key] / maxRevenue) * 100}%`,
                    background: `linear-gradient(90deg, ${stage.color}, ${stage.colorEnd || stage.color})`,
                    transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Conversion rates between main stages */}
      <div className="flex gap-3 mt-1">
        {mainStages.map((stage, i) => {
          if (i === mainStages.length - 1) return <div key={stage.key} className="flex-1" />;
          const current = stageCounts[stage.key] || 0;
          const next = stageCounts[mainStages[i + 1].key] || 0;
          const rate = current > 0 ? Math.round((next / current) * 100) : 0;
          return (
            <div key={stage.key} className="flex-1 flex items-center justify-end pr-2">
              <span className="text-[10px] font-bold text-gray-400 font-body">{rate}% &rarr;</span>
            </div>
          );
        })}
        {/* Spacer for closed stages */}
        <div className="flex-1" />
        <div className="flex-1" />
      </div>
    </div>
  );
}
