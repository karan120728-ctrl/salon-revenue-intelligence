'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/features/dashboard/KpiCard';
import RiskPill from '@/components/ui/RiskPill';
import { fetchApi } from '@/lib/api';

export default function NoShow() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/analytics/noshow-prediction')
      .then((res: any) => {
        const prediction = res.data;
        setData({
          highRiskCount:    prediction.highRiskCount,
          avgRisk:          prediction.avgRisk,
          totalRiskRevenue: prediction.revenueAtRisk,
          anchorDate:       prediction.anchorDate,
          appointments: (prediction.appointments ?? []).map((a: any) => ({
            id:       a.id,
            customer: a.customer?.name || 'Unknown',
            staff:    a.staff?.name    || 'Unknown',
            time:     new Date(a.date).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            }),
            status:   a.status,
            risk:     a.risk,
            reason:   a.riskReason || 'No specific reason flagged',
            action:   a.risk >= 80 ? 'Call to confirm' : a.risk >= 60 ? 'Send SMS reminder' : 'Courtesy reminder',
          })),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-[var(--slate)]">Loading no-show data...</div>;
  if (!data)   return <div className="p-8 text-sm text-red-500">Failed to load data</div>;

  const periodNote = data.anchorDate
    ? `Based on appointments within 30 days of ${new Date(data.anchorDate).toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`
    : 'Based on upcoming appointments';

  return (
    <div className="p-5 lg:p-8 space-y-6 fade-up">
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard i={0} label="High-risk appointments" value={data.highRiskCount} icon="alert" />
        <KpiCard i={1} label="Avg. risk score"        value={data.avgRisk}       suffix="%" icon="chart" />
        <KpiCard i={2} label="Revenue at risk"        value={data.totalRiskRevenue} prefix="£" icon="droplet" />
      </div>

      <div className="card p-6">
        <h3 className="font-display text-xl mb-1">No-show prediction</h3>
        <p className="text-sm text-[var(--slate)] mb-5">{periodNote}</p>

        {data.appointments.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--slate)]">
            <p className="mb-1 font-medium">No appointments found in the prediction window.</p>
            <p>This is normal for historical CSV imports where all appointments are in the past.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--slate)] border-b border-[var(--line)]">
                  <th className="py-2 pr-4">Date / Time</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Stylist</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Risk</th>
                  <th className="py-2 pr-4">Reason</th>
                  <th className="py-2">Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.map((n: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]">
                    <td className="py-3 pr-4 font-mono text-xs text-[var(--slate)]">{n.time}</td>
                    <td className="py-3 pr-4 font-medium">{n.customer}</td>
                    <td className="py-3 pr-4 text-[var(--slate)]">{n.staff}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        n.status === 'NO_SHOW'   ? 'bg-red-100 text-red-700' :
                        n.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{n.status}</span>
                    </td>
                    <td className="py-3 pr-4"><RiskPill risk={n.risk} /></td>
                    <td className="py-3 pr-4 text-[var(--slate)] max-w-xs">{n.reason}</td>
                    <td className="py-3 font-medium">{n.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
