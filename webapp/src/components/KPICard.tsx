import clsx from 'clsx';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'positive' | 'negative' | 'highlight';
  icon?: React.ReactNode;
}

export default function KPICard({
  label,
  value,
  subtitle,
  variant = 'default',
  icon,
}: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p
            className={clsx('text-2xl font-bold mt-1', {
              'text-slate-800': variant === 'default',
              'text-emerald-600': variant === 'positive',
              'text-red-600': variant === 'negative',
              'text-brand-600': variant === 'highlight',
            })}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className={clsx('p-2 rounded-lg', {
              'bg-slate-100': variant === 'default',
              'bg-emerald-50': variant === 'positive',
              'bg-red-50': variant === 'negative',
              'bg-brand-50': variant === 'highlight',
            })}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
