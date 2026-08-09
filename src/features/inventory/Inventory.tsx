'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/features/dashboard/KpiCard';
import { fetchApi } from '@/lib/api';

export default function Inventory() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/inventory')
      .then((res: any) => {
        setData({
          products: res.data.items.map((i: any) => ({
             ...i,
             ai: i.days <= 7 ? 'High risk of outage' : 'Stock level healthy'
          })),
          lowStockCount: res.data.lowStockCount,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-[var(--slate)]">Loading inventory...</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Failed to load data</div>;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard i={0} label="Products tracked" value={data.products.length} icon="box" />
        <KpiCard i={1} label="Low stock alerts" value={data.lowStockCount} icon="alert" />
        <KpiCard i={2} label="Inventory health" value={82} suffix="%" icon="check" />
      </div>

      <div className="card p-6">
        <h3 className="font-display text-xl mb-1">Inventory</h3>
        <p className="text-sm text-[var(--slate)] mb-5">Stock levels tied to actual booking demand.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--slate)] border-b border-[var(--line)]">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Days remaining</th>
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Reorder</th>
                <th className="py-2">AI recommendation</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p: any, i: number) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]">
                  <td className="py-3 pr-4 font-medium">{p.name}</td>
                  <td className="py-3 pr-4 font-mono">{p.stock}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                      p.days <= 3 ? 'risk-high' : p.days <= 7 ? 'risk-med' : 'risk-low'
                    }`}>
                      {p.days}d
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[var(--slate)]">{p.supplier}</td>
                  <td className="py-3 pr-4 font-medium">{p.reorder}</td>
                  <td className="py-3 text-[var(--slate)] max-w-xs">{p.ai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
