'use client';

import AnimatedNumber from '@/components/ui/AnimatedNumber';
import Icon from '@/components/ui/Icon';

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: string;
  deltaGood?: boolean;
  icon: string;
  i: number;
}

export default function KpiCard({ label, value, prefix = '', suffix = '', delta, deltaGood, icon, i }: KpiCardProps) {
  return (
    <div className="card card-hover p-5 fade-up" style={{ animationDelay: `${i * 70}ms` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-[var(--slate)]">{label}</p>
          <p className="font-display text-3xl mt-2 tracking-tight">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[var(--paper)] flex items-center justify-center text-[var(--ink)]">
          <Icon name={icon} size={16} />
        </div>
      </div>
      {delta && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${deltaGood ? 'text-[var(--sage)]' : 'text-[var(--rosewood)]'}`}>
          <Icon name={deltaGood ? 'trendup' : 'trenddown'} size={13} />
          {delta}
        </div>
      )}
    </div>
  );
}
