'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import KpiCard from '@/features/dashboard/KpiCard';
import { fetchApi } from '@/lib/api';

Chart.register(...registerables);

export default function Analytics() {
  const revRef  = useRef<HTMLCanvasElement>(null);
  const custRef = useRef<HTMLCanvasElement>(null);
  const retRef  = useRef<HTMLCanvasElement>(null);
  const catRef  = useRef<HTMLCanvasElement>(null);

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/analytics/monthly')
      .then((res: any) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data || !revRef.current) return;
    const charts: Chart[] = [];

    // ── Monthly Revenue chart — from real data ──
    if (revRef.current) {
      charts.push(
        new Chart(revRef.current, {
          type: 'bar',
          data: {
            labels: data.monthlyRevenueChart?.labels ?? [],
            datasets: [{ data: data.monthlyRevenueChart?.values ?? [], backgroundColor: '#12141F', borderRadius: 6 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: '#EDEAE2' }, ticks: { callback: (v) => '£' + v } },
              x: { grid: { display: false } },
            },
          },
        })
      );
    }

    // ── Customer growth — placeholder until customer DB snapshots exist ──
    if (custRef.current) {
      charts.push(
        new Chart(custRef.current, {
          type: 'line',
          data: {
            labels: data.monthlyRevenueChart?.labels ?? [],
            datasets: [{
              data: data.monthlyRevenueChart?.labels?.map(() => null) ?? [],
              borderColor: '#4F8871', backgroundColor: 'rgba(79,136,113,.1)',
              fill: true, tension: 0.4, pointRadius: 0,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: () => 'Historical growth data not yet available' } },
            },
            scales: { y: { grid: { color: '#EDEAE2' } }, x: { grid: { display: false } } },
          },
        })
      );
    }

    // ── Weekly retention — placeholder until session-level data exists ──
    if (retRef.current) {
      charts.push(
        new Chart(retRef.current, {
          type: 'bar',
          data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{ data: [null, null, null, null] as any[], backgroundColor: '#C99A45', borderRadius: 6 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#EDEAE2' }, max: 100 }, x: { grid: { display: false } } },
          },
        })
      );
    }

    // ── Revenue by category — placeholder until service-category mapping exists ──
    if (catRef.current) {
      charts.push(
        new Chart(catRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Data not yet available'],
            datasets: [{ data: [1], backgroundColor: ['#EDEAE2'], borderWidth: 0 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
          },
        })
      );
    }

    return () => charts.forEach((c) => c.destroy());
  }, [data]);

  if (loading) return <div className="p-8 text-sm text-[var(--slate)]">Loading analytics...</div>;
  if (!data)   return <div className="p-8 text-sm text-red-500">Failed to load analytics</div>;

  const noShowDeltaLabel = data.noShowRateDelta != null
    ? `${data.noShowRateDelta >= 0 ? '+' : ''}${data.noShowRateDelta}% vs last month`
    : undefined;
  const noShowDeltaGood = (data.noShowRateDelta ?? 0) <= 0; // lower no-show = good

  const newCustDeltaLabel = data.newCustomersDelta != null
    ? `${data.newCustomersDelta >= 0 ? '+' : ''}${data.newCustomersDelta}% vs last month`
    : undefined;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="grid sm:grid-cols-4 gap-4">
        <KpiCard i={0} label="Bookings this month" value={data.bookingsThisMonth} icon="calendar" />
        <KpiCard i={1} label="No-show rate" value={data.noShowRate} suffix="%" delta={noShowDeltaLabel} deltaGood={noShowDeltaGood} icon="alert" />
        <KpiCard i={2} label="New customers" value={data.newCustomers} delta={newCustDeltaLabel} deltaGood={(data.newCustomersDelta ?? 0) >= 0} icon="users" />
        {data.retailSales != null
          ? <KpiCard i={3} label="Retail sales" value={data.retailSales} prefix="£" icon="box" />
          : <KpiCard i={3} label="Retail sales" value="—" icon="box" />
        }
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-display text-xl mb-1">Monthly revenue</h3>
          <p className="text-xs text-[var(--slate)] mb-4">
            Last 6 months — from your imported data
          </p>
          <div className="h-56"><canvas ref={revRef} /></div>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-xl mb-1">Customer growth</h3>
          <p className="text-xs text-[var(--slate)] mb-4">Historical snapshot data not yet available</p>
          <div className="h-56"><canvas ref={custRef} /></div>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-xl mb-1">Weekly retention rate</h3>
          <p className="text-xs text-[var(--slate)] mb-4">Session-level data not yet available</p>
          <div className="h-56"><canvas ref={retRef} /></div>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-xl mb-1">Revenue by category</h3>
          <p className="text-xs text-[var(--slate)] mb-4">Service category mapping not yet available</p>
          <div className="h-56"><canvas ref={catRef} /></div>
        </div>
      </div>
    </div>
  );
}
