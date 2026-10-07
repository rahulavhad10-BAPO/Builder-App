import { ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  badge?: string;
  badgeColor?: string;
  icon?: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  drillDownLabel?: string;
  alertLevel?: 'normal' | 'warning' | 'critical';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subValue,
  badge,
  badgeColor = 'bg-slate-800 text-slate-300',
  icon: Icon,
  iconColor = 'text-sky-400',
  onClick,
  drillDownLabel = 'View Records',
  alertLevel = 'normal',
}) => {
  const borderClass =
    alertLevel === 'critical'
      ? 'border-rose-500/50 hover:border-rose-400 bg-rose-950/10'
      : alertLevel === 'warning'
      ? 'border-amber-500/50 hover:border-amber-400 bg-amber-950/10'
      : 'border-slate-800 hover:border-sky-500/60 bg-slate-900/90';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={`group relative p-4 rounded-xl border ${borderClass} transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
            {title}
          </span>
          {Icon && (
            <div className={`p-1.5 rounded-lg bg-slate-800/80 ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <div className="text-xl font-bold text-white tracking-tight">{value}</div>
          {badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>

        {subValue && (
          <div className="text-[11px] text-slate-400 mt-1 font-medium">{subValue}</div>
        )}
      </div>

      {onClick && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
          <span>{drillDownLabel}</span>
          <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      )}
    </div>
  );
};
