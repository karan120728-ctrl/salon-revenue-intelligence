'use client';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
}

export default function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--ink)] text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium z-30">
        {label}
      </span>
    </span>
  );
}
