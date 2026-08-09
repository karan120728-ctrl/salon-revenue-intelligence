'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/features/dashboard/KpiCard';
import Icon from '@/components/ui/Icon';
import RiskPill from '@/components/ui/RiskPill';
import { money } from '@/lib/utils';
import { fetchApi } from '@/lib/api';

function MessagePanel({ customer, onClose }: { customer: any; onClose: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(
      () =>
        setMsg(
          `Hi ${customer.name.split(' ')[0]}, it's Marlowe & Rose — we've missed you! It's been a while since your last visit and we'd love to get you back in the chair. As a thank-you, here's 15% off your next colour or cut this month. Reply to book, or call us on 020 7946 0958.`
        ),
      1100
    );
    return () => clearTimeout(t);
  }, [customer]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="sparkle" size={16} />
            <h3 className="font-display text-xl">Message for {customer.name}</h3>
          </div>
          <button onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {!msg ? (
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-4/6" />
            <p className="text-xs text-[var(--slate)] mt-3">Generating a personalised message…</p>
          </div>
        ) : (
          <>
            <div className="bg-[var(--paper)] rounded-xl p-4 text-sm leading-relaxed">{msg}</div>
            <div className="flex gap-3 mt-5">
              <button className="btn-primary flex-1 justify-center text-sm !py-2.5">
                <Icon name="send" size={14} />
                Send message
              </button>
              <button onClick={onClose} className="btn-secondary flex-1 text-sm !py-2.5">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Retention() {
  const [sel, setSel] = useState<any | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/analytics/churn')
      .then((res: any) => {
        const customers = res.data;
        setData({
          customers: customers.map((c: any) => ({
            ...c,
            suggestedAction: c.daysOverdue > 60
              ? 'Personal call — VIP going cold'
              : c.daysOverdue > 30
              ? 'Send win-back offer'
              : 'Send SMS reminder',
          })),
          totalAtRisk: customers.length,
          avgLtv: customers.length > 0
            ? Math.round(customers.reduce((s: number, c: any) => s + c.ltv, 0) / customers.length)
            : 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-[var(--slate)]">Loading retention data...</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Failed to load data</div>;

  return (
    <div className="p-5 lg:p-8 space-y-6 fade-up">
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard i={0} label="At risk of churn" value={data.totalAtRisk} icon="users" />
        <KpiCard i={1} label="Avg. lifetime value" value={data.avgLtv} prefix="£" icon="chart" />
        <KpiCard i={2} label="Win-backs sent this month" value={31} icon="send" />
      </div>

      <div className="card p-6">
        <h3 className="font-display text-xl mb-1">Customers likely to never return</h3>
        <p className="text-sm text-[var(--slate)] mb-5">Ranked by churn risk, based on booking cadence and history.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--slate)] border-b border-[var(--line)]">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Last visit</th>
                <th className="py-2 pr-4">Expected return</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">LTV</th>
                <th className="py-2 pr-4">Suggested action</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c: any, i: number) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]">
                  <td className="py-3 pr-4 font-medium">{c.name}</td>
                  <td className="py-3 pr-4 text-[var(--slate)]">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : 'Never'}</td>
                  <td className="py-3 pr-4 text-[var(--slate)]">{c.expectedVisit ? new Date(c.expectedVisit).toLocaleDateString() : '-'}</td>
                  <td className="py-3 pr-4">
                    <RiskPill risk={c.risk} />
                  </td>
                  <td className="py-3 pr-4 font-mono">{money(c.ltv)}</td>
                  <td className="py-3 pr-4 text-[var(--slate)]">{c.suggestedAction}</td>
                  <td className="py-3">
                    <button
                      onClick={() => setSel(c)}
                      className="text-xs font-semibold border border-[var(--line)] rounded-full px-3 py-1.5 hover:bg-[var(--ink)] hover:text-white transition-colors whitespace-nowrap"
                    >
                      Generate message
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel && <MessagePanel customer={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
