'use client';

import Icon from '@/components/ui/Icon';

interface TopbarProps {
  title: string;
  setMobileOpen: (open: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
}

export default function Topbar({ title, setMobileOpen, notifOpen, setNotifOpen }: TopbarProps) {
  return (
    <div className="sticky top-0 z-30 bg-[var(--porcelain)]/85 backdrop-blur-md border-b border-[var(--line)] px-5 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
          <Icon name="menu" size={20} />
        </button>
        <h1 className="font-display text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-white border border-[var(--line)] rounded-full px-3.5 py-2 w-64">
          <Icon name="search" size={15} className="text-[var(--slate)]" />
          <input
            placeholder="Search clients, staff, products…"
            className="outline-none text-sm bg-transparent w-full"
          />
        </div>

        {/* Notifications bell */}
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative w-10 h-10 rounded-full bg-white border border-[var(--line)] flex items-center justify-center"
        >
          <Icon name="bell" size={17} />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--rosewood)] pulse-dot" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-[var(--gold)] flex items-center justify-center text-white text-xs font-bold font-mono">
          SW
        </div>
      </div>
    </div>
  );
}
