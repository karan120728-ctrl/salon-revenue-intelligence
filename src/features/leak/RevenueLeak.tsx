'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import KpiCard from '@/features/dashboard/KpiCard';
import Icon from '@/components/ui/Icon';
import { revenueLeakData } from '@/data/mock';
import { money } from '@/lib/utils';

Chart.register(...registerables);

const recommendations = [
  { t: 'Tighten no-show policy', d: 'Require card guarantees for first-time bookings — could recover ~£1,120/wk.', tag: 'No-shows' },
  { t: 'Add checkout prompts for stylists', d: 'Jack and Marcus have the lowest retail attach — a simple prompt script could lift sales 15%.', tag: 'Retail' },
  { t: 'Fill Wednesday afternoons', d: 'Consistently 40% empty — a loyalty flash offer could convert 6–8 extra bookings a week.', tag: 'Empty chairs' },
  { t: 'Automate late-arrival buffers', d: 'Adding a 10-minute buffer to peak slots reduces knock-on delays without cutting capacity.', tag: 'Late arrivals' },
];

export default function RevenueLeak() {
  const ref = useRef<HTMLCanvasElement>(null);
  const totalAmt = revenueLeakData.reduce((a, d) => a + d.amt, 0);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    const c = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: revenueLeakData.map((d) => d.label),
        datasets: [
          {
            data: revenueLeakData.map((d) => d.value),
            backgroundColor: revenueLeakData.map((d) => d.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } },
      },
    });

    return () => c.destroy();
  }, []);

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard i={0} label="Total revenue lost / wk" value={totalAmt} prefix="£" icon="droplet" />
        <KpiCard i={1} label="Largest cause" value={32} suffix="%" icon="alert" />
        <KpiCard i={2} label="Recoverable this month" value={2100} prefix="£" delta="AI estimate" deltaGood icon="trendup" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Doughnut chart */}
        <div className="card p-6">
          <h3 className="font-display text-xl mb-5">Where revenue is leaking</h3>
          <div className="h-64 relative">
            <canvas ref={ref} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display text-2xl">{money(totalAmt)}</p>
              <p className="text-xs text-[var(--slate)]">lost per week</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {revenueLeakData.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <span className="font-medium">{r.label}</span>
                <span className="ml-auto font-mono text-[var(--slate)]">{r.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI recommendations */}
        <div className="card p-6">
          <h3 className="font-display text-xl mb-5">AI recommendations</h3>
          <ul className="space-y-4">
            {recommendations.map((r, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--paper)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name="sparkle" size={14} />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {r.t}{' '}
                    <span className="ml-1 text-[10px] font-semibold uppercase text-[var(--rosewood-deep)] bg-[#FBE7E9] px-2 py-0.5 rounded-full align-middle">
                      {r.tag}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--slate)] mt-1 leading-relaxed">{r.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
