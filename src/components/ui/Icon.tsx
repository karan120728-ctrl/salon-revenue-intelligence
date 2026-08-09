'use client';

interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '' }: IconProps) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" {...p} />
        <path d="M5 9.5V21h14V9.5" {...p} />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" {...p} />
        <path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" {...p} />
        <path d="M15.5 5.2a3.2 3.2 0 0 1 0 6.2" {...p} />
        <path d="M16.5 14.6c2.7.4 4.6 2.2 5.1 5.4" {...p} />
      </>
    ),
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...p} />
        <path d="M3.5 9.5h17" {...p} />
        <path d="M8 3v4M16 3v4" {...p} />
      </>
    ),
    alert: (
      <>
        <path d="M12 3.5 21.5 20h-19L12 3.5Z" {...p} />
        <path d="M12 10v4.5" {...p} />
        <circle cx="12" cy="17.3" r=".4" fill="currentColor" stroke="none" />
      </>
    ),
    box: (
      <>
        <path d="M3.5 7.5 12 3l8.5 4.5-8.5 4.5-8.5-4.5Z" {...p} />
        <path d="M3.5 7.5v9L12 21l8.5-4.5v-9" {...p} />
        <path d="M12 12v9" {...p} />
      </>
    ),
    chat: (
      <>
        <path d="M4 5.5h16v11H9.5L5 20v-3.5H4Z" {...p} />
        <path d="M8 10h8M8 13h5" {...p} />
      </>
    ),
    bell: (
      <>
        <path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 14.5 6 10Z" {...p} />
        <path d="M9.5 19a2.5 2.5 0 0 0 5 0" {...p} />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M11 20V4M18 20v-7" {...p} />
        <path d="M2.5 20.5h19" {...p} />
      </>
    ),
    trenddown: (
      <>
        <path d="M3 6.5 10 14l4-4 7 7.5" {...p} />
        <path d="M14.5 17.7H21V11" {...p} />
      </>
    ),
    trendup: (
      <>
        <path d="M3 17.5 10 10l4 4 7-7.5" {...p} />
        <path d="M14.5 6.3H21V13" {...p} />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" {...p} />
        <path d="m20 20-4.4-4.4" {...p} />
      </>
    ),
    chevron: <path d="m9 6 6 6-6 6" {...p} />,
    sparkle: (
      <>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" {...p} />
        <path d="M12 8.5 14 12l-2 3.5L10 12Z" {...p} />
      </>
    ),
    arrowup: <path d="M7 17 17 7M9 7h8v8" {...p} />,
    arrowdown: <path d="M7 7 17 17M17 9V17H9" {...p} />,
    star: <path d="m12 3 2.7 5.9 6.3.7-4.7 4.4 1.3 6.3L12 17.2 6.4 20.3l1.3-6.3-4.7-4.4 6.3-.7Z" {...p} />,
    logout: (
      <>
        <path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" {...p} />
        <path d="M16 17l5-5-5-5M21 12H9" {...p} />
      </>
    ),
    check: <path d="M4 12.5 9.5 18 20 6" {...p} />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" {...p} />
        <path d="M12 7.5V12l3 2" {...p} />
      </>
    ),
    droplet: <path d="M12 3S5.5 11 5.5 15.5a6.5 6.5 0 0 0 13 0C18.5 11 12 3 12 3Z" {...p} />,
    package: (
      <>
        <path d="M3.5 7.5 12 3l8.5 4.5-8.5 4.5-8.5-4.5Z" {...p} />
        <path d="M3.5 7.5v9L12 21l8.5-4.5v-9M12 12v9" {...p} />
      </>
    ),
    send: <path d="M21 3 3 10.5l7 3 3 7L21 3Z" {...p} />,
    x: <path d="m6 6 12 12M18 6 6 18" {...p} />,
    plus: <path d="M12 5v14M5 12h14" {...p} />,
    lock: (
      <>
        <rect x="5" y="10.5" width="14" height="9.5" rx="2" {...p} />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...p} />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2" {...p} />
        <path d="m4 7 8 6 8-6" {...p} />
      </>
    ),
    grid: (
      <>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" {...p} />
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" {...p} />
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" {...p} />
        <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" {...p} />
      </>
    ),
    scissors: (
      <>
        <circle cx="6.5" cy="6.5" r="2.3" {...p} />
        <circle cx="6.5" cy="17.5" r="2.3" {...p} />
        <path d="M20 5 8.3 15.5M8.3 8.5 20 19" {...p} />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" {...p} />
      </>
    ),
    play: <path d="M8 5.5v13l11-6.5-11-6.5Z" {...p} />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {paths[name]}
    </svg>
  );
}
