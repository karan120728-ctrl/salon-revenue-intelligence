'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/features/dashboard/KpiCard';
import RiskPill from '@/components/ui/RiskPill';
import { fetchApi } from '@/lib/api';

export default function NoShow() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/appointments')
      .then((res: any) => {
        const appointments = res.data || [];
        // Filter to scheduled/upcoming appointments with risk > 0
        const risky = appointments.filter((a: any) => a.status === 'SCHEDULED' && a.risk > 0);
        const totalRiskRevenue = risky.reduce((sum: number, a: any) => {
          return sum + (a.services?.reduce((s: number, as: any) => s + as.priceAtBooking, 0) || 0);
        }, 0);

        setData({
          highRiskCount: risky.filter((a: any) => a.risk >= 70).length,
          avgRisk: risky.length > 0 ? Math.round(risky.reduce((s: number, a: any) => s + a.risk, 0) / risky.length) : 0,
          totalRiskRevenue,
          appointments: risky.map((a: any) => ({
            id: a.id,
            customer: a.customer?.name || 'Unknown',
            time: new Date(a.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            risk: a.risk,
            reason: a.riskReason || 'No specific reason flagged',
            action: a.risk >= 80 ? 'Call to confirm before appointment' : a.risk >= 60 ? 'Send SMS reminder' : 'Courtesy reminder',
          }))
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-[var(--slate)]">Loading no-show data...</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Failed to load data</div>;

  return (
    <div className="p-5 lg:p-8 space-y-6 fade-up">
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard i={0} label="High-risk appointments" value={data.highRiskCount} icon="alert" />
        <KpiCard i={1} label="Avg. risk score" value={data.avgRisk} suffix="%" icon="chart" />
        <KpiCard i={2} label="Revenue at risk today" value={data.totalRiskRevenue} prefix="£" icon="droplet" />
      </div>

      <div className="card p-6">
        <h3 className="font-display text-xl mb-1">No-show prediction</h3>
        <p className="text-sm text-[var(--slate)] mb-5">Every booking today, scored and explained.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--slate)] border-b border-[var(--line)]">
                <th className="py-2 pr-4">Appointment</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2">Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {data.appointments.map((n: any, i: number) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]">
                  <td className="py-3 pr-4 font-mono text-xs text-[var(--slate)]">{n.id.split('-')[0]}</td>
                  <td className="py-3 pr-4 font-medium">{n.customer}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{n.time}</td>
                  <td className="py-3 pr-4">
                    <RiskPill risk={n.risk} />
                  </td>
                  <td className="py-3 pr-4 text-[var(--slate)] max-w-xs">{n.reason}</td>
                  <td className="py-3 font-medium">{n.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
