'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/features/dashboard/KpiCard';
import Icon from '@/components/ui/Icon';
import { money } from '@/lib/utils';
import { fetchApi } from '@/lib/api';

export default function Staff() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/analytics/staff')
      .then((res: any) => {
        const staff = res.data || [];
        const teamRevenue = staff.reduce((a: number, s: any) => a + s.generatedRevenue, 0);
        const avgRebook = staff.length > 0
          ? Math.round(staff.reduce((a: number, s: any) => a + s.rebookRate, 0) / staff.length)
          : 0;
        const avgRating = staff.length > 0
          ? (staff.reduce((a: number, s: any) => a + s.rating, 0) / staff.length).toFixed(1)
          : 0;
        setData({ staff, teamRevenue, avgRebook, avgRating });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-[var(--slate)]">Loading staff data...</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Failed to load data</div>;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard i={0} label="Team revenue" value={data.teamRevenue} prefix="£" icon="chart" />
        <KpiCard i={1} label="Avg. rebooking rate" value={data.avgRebook} suffix="%" icon="users" />
        <KpiCard i={2} label="Avg. rating" value={data.avgRating} icon="star" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {data.staff.map((s: any, i: number) => (
          <div key={i} className="card p-6 card-hover fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-full bg-[var(--ink)] text-white flex items-center justify-center font-mono font-semibold">
                {s.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <p className="font-display text-lg">{s.name}</p>
                <p className="text-xs text-[var(--slate)]">{s.role}</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-sm font-semibold">
                <Icon name="star" size={14} className="text-[var(--gold)]" />
                {s.rating}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-5">
              <div>
                <p className="font-mono text-lg">{money(s.generatedRevenue)}</p>
                <p className="text-[10px] uppercase text-[var(--slate)]">Revenue</p>
              </div>
              <div>
                <p className="font-mono text-lg">{s.rebookRate}%</p>
                <p className="text-[10px] uppercase text-[var(--slate)]">Rebook</p>
              </div>
              <div>
                <p className="font-mono text-lg">{s.rating}</p>
                <p className="text-[10px] uppercase text-[var(--slate)]">Rating</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
