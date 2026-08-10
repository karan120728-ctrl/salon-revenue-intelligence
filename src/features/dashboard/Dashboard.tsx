'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import KpiCard from '@/features/dashboard/KpiCard';
import Icon from '@/components/ui/Icon';
import RiskPill from '@/components/ui/RiskPill';
import { fetchApi } from '@/lib/api';

Chart.register(...registerables);

export default function Dashboard() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiBriefing, setAiBriefing] = useState<{ greeting: string, recommendations: string[] } | null>(null);

  useEffect(() => {
    // Fire all non-AI calls in parallel — KPIs show immediately
    Promise.all([
      fetchApi('/api/analytics/overview'),
      fetchApi('/api/inventory').catch(() => ({ data: { lowStockCount: 0 } })),
    ]).then(([overviewRes, inventoryRes]) => {
      const overview = overviewRes.data;
      setData({
        todayRevenue: overview.revenue,
        appointmentCount: overview.appointments.total,
        highRiskCount: overview.appointments.noShows,
        lowStockCount: inventoryRes.data?.lowStockCount || 0,
        utilisation: overview.appointments.total > 0
          ? Math.round((overview.appointments.completed / overview.appointments.total) * 100)
          : 0,
        returnRate: Math.round(100 - overview.noShowRate),
        weeklyRevenue: [
          { d: 'Mon', actual: Math.round(overview.revenue * 0.14), expected: Math.round(overview.revenue * 0.155) },
          { d: 'Tue', actual: Math.round(overview.revenue * 0.12), expected: Math.round(overview.revenue * 0.14) },
          { d: 'Wed', actual: Math.round(overview.revenue * 0.15), expected: Math.round(overview.revenue * 0.16) },
          { d: 'Thu', actual: Math.round(overview.revenue * 0.17), expected: Math.round(overview.revenue * 0.17) },
          { d: 'Fri', actual: Math.round(overview.revenue * 0.2), expected: Math.round(overview.revenue * 0.195) },
          { d: 'Sat', actual: Math.round(overview.revenue * 0.22), expected: Math.round(overview.revenue * 0.225) },
        ],
      });
    }).catch(console.error)
      .finally(() => setLoading(false));

    // AI briefing loads independently — doesn't block the KPI cards from showing
    fetchApi('/api/analytics/briefing')
      .then(res => setAiBriefing(res.data))
      .catch(console.error);

  }, []);


  useEffect(() => {
    if (!chartRef.current || !data) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const c = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.weeklyRevenue.map((d: any) => d.d),
        datasets: [
          {
            label: 'Actual',
            data: data.weeklyRevenue.map((d: any) => d.actual),
            borderColor: '#12141F',
            backgroundColor: 'rgba(18,20,31,0.06)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#12141F',
          },
          {
            label: 'Expected',
            data: data.weeklyRevenue.map((d: any) => d.expected),
            borderColor: '#C4485A',
            borderDash: [5, 5],
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            grid: { color: '#EDEAE2' },
            ticks: { callback: (v) => '£' + v },
          },
          x: { grid: { display: false } },
        },
      },
    });

    return () => c.destroy();
  }, [data]);

  if (loading) return <div className="p-8 text-sm text-[var(--slate)]">Loading dashboard metrics...</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Failed to load dashboard</div>;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard i={0} label="Today's revenue" value={data.todayRevenue} prefix="£" delta="12% vs last Tue" deltaGood icon="chart" />
        <KpiCard i={1} label="Expected revenue" value={Math.round(data.todayRevenue * 1.15)} prefix="£" icon="trendup" />
        <KpiCard i={2} label="Low stock alerts" value={data.lowStockCount} delta="Needs attention" icon="box" />
        <KpiCard i={3} label="Appointments today" value={data.appointmentCount} icon="calendar" />
        <KpiCard i={4} label="Staff utilisation" value={data.utilisation} suffix="%" delta="3% vs last week" deltaGood icon="users" />
        <KpiCard i={5} label="Customer return rate" value={data.returnRate} suffix="%" delta="2% vs last month" icon="trenddown" />
        <KpiCard i={6} label="No-show risk today" value={data.highRiskCount} suffix=" high" icon="alert" />
        <KpiCard i={7} label="Inventory health" value={95} suffix="%" icon="box" />
      </div>

      {/* Chart + briefing row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-6 lg:col-span-2 fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">This week</p>
              <h3 className="font-display text-xl">Actual vs expected revenue</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ink)]" />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--rosewood)]" />
                Expected
              </span>
            </div>
          </div>
          <div className="h-64">
            <canvas ref={chartRef} />
          </div>
        </div>

        {/* AI Briefing */}
        <div className="card p-6 fade-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="sparkle" size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">AI Daily Briefing</p>
          </div>
          
          {!aiBriefing ? (
             <div className="mt-8 space-y-4">
               <div className="skeleton h-6 w-3/4 mb-6" />
               <div className="skeleton h-4 w-full" />
               <div className="skeleton h-4 w-5/6" />
               <div className="skeleton h-4 w-4/6" />
             </div>
          ) : (
            <>
              <h3 className="font-display text-lg mb-4 leading-snug">{aiBriefing.greeting}</h3>
              <div className="space-y-2.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-[var(--slate)]">Forecast revenue</span>
                  <span className="font-mono font-semibold">£{Math.round(data.todayRevenue * 1.15)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--slate)]">Appointments</span>
                  <span className="font-mono font-semibold">{data.appointmentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--slate)]">High-risk cancellations</span>
                  <span className="font-mono font-semibold text-[var(--rosewood)]">{data.highRiskCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--slate)]">Low stock products</span>
                  <span className="font-mono font-semibold text-[#96712A]">{data.lowStockCount}</span>
                </div>
              </div>
              <div className="stitch mb-4" />
              <p className="text-xs font-semibold uppercase text-[var(--slate)] mb-2">Recommended today</p>
              <ul className="space-y-2.5 text-sm">
                {aiBriefing.recommendations.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-[var(--sage-soft)] flex items-center justify-center flex-shrink-0">
                      <Icon name="check" size={11} className="text-[var(--sage)]" />
                    </span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
