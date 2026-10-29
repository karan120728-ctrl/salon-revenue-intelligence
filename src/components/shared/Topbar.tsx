'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { customers, stylists, products } from '@/data/mock';

interface TopbarProps {
  title: string;
  setMobileOpen: (open: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
}

const PAGES = [
  { name: 'Executive Dashboard', path: '/app', icon: 'home', category: 'Navigation', desc: 'Overview, briefing & metrics' },
  { name: 'Customer Retention', path: '/app/retention', icon: 'users', category: 'Navigation', desc: 'At-risk clients & win-backs' },
  { name: 'No-show Prediction', path: '/app/noshow', icon: 'calendar', category: 'Navigation', desc: 'Daily attendance risk scoring' },
  { name: 'Revenue Leak Analysis', path: '/app/leak', icon: 'alert', category: 'Navigation', desc: 'Recoverable leak breakdown' },
  { name: 'Staff Performance', path: '/app/staff', icon: 'scissors', category: 'Navigation', desc: 'Stylist metrics & rebook rates' },
  { name: 'Inventory & Retail', path: '/app/inventory', icon: 'package', category: 'Navigation', desc: 'Stock levels & AI reorders' },
  { name: 'AI Business Advisor', path: '/app/advisor', icon: 'chat', category: 'Navigation', desc: 'Ask operational AI questions' },
  { name: 'Analytics', path: '/app/analytics', icon: 'chart', category: 'Navigation', desc: 'Monthly charts & KPIs' },
];

export default function Topbar({ title, setMobileOpen, notifOpen, setNotifOpen }: TopbarProps) {
  const router = useRouter();
  const [initials, setInitials] = useState('MR');
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('salon_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) {
          const parts = user.name.split(' ').filter(Boolean);
          const inits = parts.map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
          if (inits) setInitials(inits);
        }
      }
    } catch {}
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocused(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cleanQuery = query.trim().toLowerCase();

  const matchingClients = cleanQuery
    ? customers.filter((c) => c.name.toLowerCase().includes(cleanQuery) || c.action.toLowerCase().includes(cleanQuery))
    : [];

  const matchingStaff = cleanQuery
    ? stylists.filter((s) => s.name.toLowerCase().includes(cleanQuery) || s.role.toLowerCase().includes(cleanQuery))
    : [];

  const matchingProducts = cleanQuery
    ? products.filter((p) => p.name.toLowerCase().includes(cleanQuery) || p.supplier.toLowerCase().includes(cleanQuery))
    : [];

  const matchingPages = cleanQuery
    ? PAGES.filter((p) => p.name.toLowerCase().includes(cleanQuery) || p.desc.toLowerCase().includes(cleanQuery))
    : [];

  const totalResults = matchingClients.length + matchingStaff.length + matchingProducts.length + matchingPages.length;

  const navigateTo = (path: string) => {
    router.push(path);
    setIsFocused(false);
    setMobileSearchOpen(false);
    setQuery('');
  };

  return (
    <div className="sticky top-0 z-30 bg-[var(--porcelain)]/85 backdrop-blur-md border-b border-[var(--line)] px-5 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
          <Icon name="menu" size={20} />
        </button>
        <h1 className="font-display text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3" ref={searchContainerRef}>
        {/* Mobile Search Toggle */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="md:hidden relative w-10 h-10 rounded-full bg-white border border-[var(--line)] flex items-center justify-center text-[var(--slate)]"
          aria-label="Toggle search"
        >
          <Icon name={mobileSearchOpen ? 'x' : 'search'} size={16} />
        </button>

        {/* Desktop & Mobile Search Input */}
        <div className={`relative ${mobileSearchOpen ? 'absolute left-4 right-4 top-3 z-40 flex' : 'hidden md:flex'}`}>
          <div className="flex items-center gap-2 bg-white border border-[var(--line)] rounded-full px-3.5 py-2 w-full md:w-80 shadow-sm focus-within:border-[var(--ink)] focus-within:ring-2 focus-within:ring-[var(--ink)]/5 transition-all">
            <Icon name="search" size={15} className="text-[var(--slate)] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isFocused) setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              placeholder="Search clients, staff, products…"
              className="outline-none text-sm bg-transparent w-full text-[var(--ink)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[var(--slate)] hover:text-[var(--ink)] p-0.5 rounded-full flex-shrink-0"
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>

          {/* Search Dropdown Modal/Popover */}
          {isFocused && query.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[var(--line)] rounded-2xl shadow-xl overflow-hidden z-50 max-h-[28rem] overflow-y-auto">
              <div className="p-2 border-b border-[var(--line)] flex items-center justify-between text-xs text-[var(--slate)] px-3">
                <span>{totalResults} {totalResults === 1 ? 'match' : 'matches'} found</span>
                <span className="font-mono text-[10px] uppercase tracking-wider">ESC to close</span>
              </div>

              {totalResults === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--slate)]">
                  <p className="font-medium text-[var(--ink)] mb-1">No matches found for &quot;{query}&quot;</p>
                  <p className="text-xs">Try searching for a client name (e.g. Grace), stylist (e.g. Priya), product (e.g. Toner), or feature (e.g. Advisor).</p>
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  {/* Clients */}
                  {matchingClients.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--slate)] px-2.5 py-1">
                        Clients ({matchingClients.length})
                      </p>
                      <div className="space-y-0.5">
                        {matchingClients.map((client, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigateTo('/app/retention')}
                            className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--porcelain)] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[var(--rosewood)]/10 text-[var(--rosewood-deep)] flex items-center justify-center flex-shrink-0">
                                <Icon name="users" size={13} />
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--rosewood-deep)] truncate">
                                  {client.name}
                                </p>
                                <p className="text-xs text-[var(--slate)] truncate">{client.action}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <span className="text-[11px] font-bold text-[var(--rosewood-deep)] bg-[#FBE7E9] px-2 py-0.5 rounded-full">
                                {client.risk}% risk
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff */}
                  {matchingStaff.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--slate)] px-2.5 py-1">
                        Stylists &amp; Staff ({matchingStaff.length})
                      </p>
                      <div className="space-y-0.5">
                        {matchingStaff.map((staff, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigateTo('/app/staff')}
                            className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--porcelain)] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[var(--ink)] text-white flex items-center justify-center font-bold text-xs font-mono flex-shrink-0">
                                {staff.img}
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--rosewood-deep)] truncate">
                                  {staff.name}
                                </p>
                                <p className="text-xs text-[var(--slate)] truncate">{staff.role}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2 text-xs font-semibold text-[var(--ink)]">
                              ★ {staff.rating} · {staff.rebook}% rebook
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {matchingProducts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--slate)] px-2.5 py-1">
                        Products &amp; Inventory ({matchingProducts.length})
                      </p>
                      <div className="space-y-0.5">
                        {matchingProducts.map((prod, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigateTo('/app/inventory')}
                            className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--porcelain)] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[var(--gold)]/15 text-[#96712A] flex items-center justify-center flex-shrink-0">
                                <Icon name="package" size={13} />
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--rosewood-deep)] truncate">
                                  {prod.name}
                                </p>
                                <p className="text-xs text-[var(--slate)] truncate">{prod.supplier}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <span className="text-xs font-semibold text-[var(--slate)]">
                                {prod.stock} units
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pages / Features */}
                  {matchingPages.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--slate)] px-2.5 py-1">
                        Pages &amp; Tools ({matchingPages.length})
                      </p>
                      <div className="space-y-0.5">
                        {matchingPages.map((pg, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigateTo(pg.path)}
                            className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--porcelain)] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[var(--sage-soft)] text-[var(--sage)] flex items-center justify-center flex-shrink-0">
                                <Icon name={pg.icon} size={13} />
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--rosewood-deep)] truncate">
                                  {pg.name}
                                </p>
                                <p className="text-xs text-[var(--slate)] truncate">{pg.desc}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2 text-xs text-[var(--slate)]">
                              Open →
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications bell */}
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative w-10 h-10 rounded-full bg-white border border-[var(--line)] flex items-center justify-center hover:bg-[var(--porcelain)] transition-colors"
          aria-label="Notifications"
        >
          <Icon name="bell" size={17} />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--rosewood)] pulse-dot" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-[var(--gold)] flex items-center justify-center text-white text-xs font-bold font-mono select-none">
          {initials}
        </div>
      </div>
    </div>
  );
}
