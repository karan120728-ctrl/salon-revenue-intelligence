'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import KpiCard from '@/features/dashboard/KpiCard';
import { weeklyRevenue } from '@/data/mock';

Chart.register(...registerables);

export default function Analytics() {
  const revRef = useRef<HTMLCanvasElement>(null);
  const custRef = useRef<HTMLCanvasElement>(null);
  const retRef = useRef<HTMLCanvasElement>(null);
  const catRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const charts: Chart[] = [];

    if (revRef.current) {
      charts.push(
        new Chart(revRef.current, {
          type: 'bar',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{ data: [11200, 11800, 12100, 13400, 12900, 14200, 13100], backgroundColor: '#12141F', borderRadius: 6 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#EDEAE2' } }, x: { grid: { display: false } } },
          },
        })
      );
    }

    if (custRef.current) {
      charts.push(
        new Chart(custRef.current, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{ data: [420, 438, 451, 469, 478, 492, 510], borderColor: '#4F8871', backgroundColor: 'rgba(79,136,113,.1)', fill: true, tension: 0.4, pointRadius: 0 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#EDEAE2' } }, x: { grid: { display: false } } },
          },
        })
      );
    }

    if (retRef.current) {
      charts.push(
        new Chart(retRef.current, {
          type: 'bar',
          data: {
            labels: weeklyRevenue.map((d) => d.d),
            datasets: [{ data: [68, 64, 61, 66, 70, 73, 59], backgroundColor: '#C99A45', borderRadius: 6 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#EDEAE2' }, max: 100 }, x: { grid: { display: false } } },
          },
        })
      );
    }

    if (catRef.current) {
      charts.push(
        new Chart(catRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Colour', 'Cut & style', 'Retail', 'Treatments'],
            datasets: [{ data: [42, 28, 18, 12], backgroundColor: ['#12141F', '#C4485A', '#C99A45', '#4F8871'], borderWidth: 0 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
          },
        })
      );
    }

    return () => charts.forEach((c) => c.destroy());
  }, []);

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="grid sm:grid-cols-4 gap-4">
        <KpiCard i={0} label="Bookings this month" value={612} icon="calendar" />
        <KpiCard i={1} label="No-show rate" value={7.4} suffix="%" delta="1.1% vs last month" icon="alert" />
        <KpiCard i={2} label="New customers" value={38} delta="18% vs last month" deltaGood icon="users" />
        <KpiCard i={3} label="Retail sales" value={4210} prefix="£" delta="18% down" icon="box" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-display text-xl mb-5">Monthly revenue</h3>
          <div className="h-56"><canvas ref={revRef} /></div>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-xl mb-5">Customer growth</h3>
          <div className="h-56"><canvas ref={custRef} /></div>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-xl mb-5">Weekly retention rate</h3>
          <div className="h-56"><canvas ref={retRef} /></div>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-xl mb-5">Revenue by category</h3>
          <div className="h-56"><canvas ref={catRef} /></div>
        </div>
      </div>
    </div>
  );
}
