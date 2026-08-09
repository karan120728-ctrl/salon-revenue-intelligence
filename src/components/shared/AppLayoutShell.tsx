'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/shared/Sidebar';
import Topbar from '@/components/shared/Topbar';
import NotifPanel from '@/components/shared/NotifPanel';

const TITLES: Record<string, string> = {
  '/app': 'Executive Dashboard',
  '/app/retention': 'Customer Retention',
  '/app/noshow': 'No-show Prediction',
  '/app/leak': 'Revenue Leak Analysis',
  '/app/staff': 'Staff Performance',
  '/app/inventory': 'Inventory',
  '/app/advisor': 'AI Business Advisor',
  '/app/analytics': 'Analytics',
};

export default function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const title = TITLES[pathname] || 'Dashboard';

  const handleSignOut = () => {
    router.push('/');
  };

  return (
    <div className="flex">
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        onSignOut={handleSignOut} 
      />
      <div className="flex-1 min-w-0">
        <Topbar 
          title={title} 
          setMobileOpen={setMobileOpen} 
          notifOpen={notifOpen} 
          setNotifOpen={setNotifOpen} 
        />
        {children}
      </div>
      <NotifPanel 
        open={notifOpen} 
        onClose={() => setNotifOpen(false)} 
      />
    </div>
  );
}
