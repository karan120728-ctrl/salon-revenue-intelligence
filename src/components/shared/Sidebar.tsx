'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';

const NAV = [
  { id: '/app', label: 'Dashboard', icon: 'home' },
  { id: '/app/retention', label: 'Customer Retention', icon: 'users' },
  { id: '/app/noshow', label: 'No-show Prediction', icon: 'alert' },
  { id: '/app/leak', label: 'Revenue Leak', icon: 'trenddown' },
  { id: '/app/staff', label: 'Staff Performance', icon: 'star' },
  { id: '/app/inventory', label: 'Inventory', icon: 'box' },
  { id: '/app/advisor', label: 'AI Advisor', icon: 'chat' },
  { id: '/app/analytics', label: 'Analytics', icon: 'chart' },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onSignOut: () => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`fixed lg:sticky top-0 h-screen w-64 bg-[var(--ink)] text-white flex flex-col z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-6">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Icon name="scissors" size={14} />
          </div>
          <span className="font-display text-lg">Marlowe &amp; Rose</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-1 mt-2">
          {NAV.map((n) => {
            const isActive = pathname === n.id;
            return (
              <Link
                key={n.id}
                href={n.id}
                onClick={() => setMobileOpen(false)}
                className={`nav-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${isActive ? 'active text-white' : 'text-white/60'}`}
              >
                <Icon name={n.icon} size={17} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onSignOut}
            className="nav-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/60"
          >
            <Icon name="logout" size={17} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
