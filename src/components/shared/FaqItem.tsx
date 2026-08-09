'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';

interface FaqItemProps {
  f: { q: string; a: string };
}

export default function FaqItem({ f }: FaqItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left font-medium"
      >
        {f.q}
        <span className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`}>
          <Icon name="chevron" size={16} />
        </span>
      </button>
      <div className="grid transition-all duration-300" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm text-[var(--slate)] leading-relaxed">{f.a}</p>
        </div>
      </div>
    </div>
  );
}
