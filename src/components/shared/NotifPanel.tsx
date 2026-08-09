'use client';

import Icon from '@/components/ui/Icon';
import { notifications } from '@/data/mock';

interface NotifPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotifPanel({ open, onClose }: NotifPanelProps) {
  return (
    <div
      className={`fixed top-0 right-0 h-screen w-full sm:w-96 bg-white z-50 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--line)]">
        <h2 className="font-display text-xl">Notifications</h2>
        <button onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-72px)]">
        {notifications.map((n, i) => (
          <div key={i} className="flex gap-3 px-5 py-4 border-b border-[var(--line)] hover:bg-[var(--paper)]">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                n.tone === 'high'
                  ? 'risk-high'
                  : n.tone === 'med'
                  ? 'risk-med'
                  : n.tone === 'good'
                  ? 'risk-low'
                  : 'bg-[var(--paper)] text-[var(--slate)]'
              }`}
            >
              <Icon name={n.icon} size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-[var(--slate)] mt-0.5">{n.body}</p>
              <p className="text-[11px] text-[var(--slate)] mt-1.5 font-mono">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
