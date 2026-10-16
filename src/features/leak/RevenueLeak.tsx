'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import KpiCard from '@/features/dashboard/KpiCard';
import Icon from '@/components/ui/Icon';
import { fetchApi } from '@/lib/api';
import { money } from '@/lib/utils';

Chart.register(...registerables);

interface LeakItem {
  label: string;
  value: number;
  amt: number;
  color: string;
}

interface LeakRecommendation {
  t: string;
  d: string;
  tag: string;
}

interface LeakResponse {
  totalLostWeekly: number;
  totalLostMonthly: number;
  largestCausePercent: number;
  largestCauseLabel: string;
  recoverableMonthly: number;
  breakdown: LeakItem[];
  recommendations: LeakRecommendation[];
}

export default function RevenueLeak() {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [data, setData] = useState<LeakResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/analytics/leak')
      .then((res) => {
        if (res?.data) {
          setData(res.data);
        }
      })
      .catch((err) => console.error('[RevenueLeak] fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!ref.current || !data?.breakdown?.length) return;
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.breakdown.map((d) => d.label),
        datasets: [
          {
            data: data.breakdown.map((d) => d.value),
            backgroundColor: data.breakdown.map((d) => d.color),
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

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (loading) {
    return <div className="p-8 text-sm text-[var(--slate)]">Calculating revenue leak analysis...</div>;
  }

  if (!data) {
    return <div className="p-8 text-sm text-red-500">Failed to load revenue leak analysis.</div>;
  }

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard i={0} label="Total revenue lost / wk" value={data.totalLostWeekly} prefix="£" icon="droplet" />
        <KpiCard i={1} label={`Largest cause (${data.largestCauseLabel})`} value={data.largestCausePercent} suffix="%" icon="alert" />
        <KpiCard i={2} label="Recoverable this month" value={data.recoverableMonthly} prefix="£" delta="AI estimate" deltaGood icon="trendup" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Doughnut chart */}
        <div className="card p-6">
          <h3 className="font-display text-xl mb-5">Where revenue is leaking</h3>
          <div className="h-64 relative">
            <canvas ref={ref} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display text-2xl">{money(data.totalLostWeekly)}</p>
              <p className="text-xs text-[var(--slate)]">lost per week</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {data.breakdown.map((r, i) => (
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
            {data.recommendations.map((r, i) => (
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
