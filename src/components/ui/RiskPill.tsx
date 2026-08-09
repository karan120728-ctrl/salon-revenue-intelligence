'use client';

interface RiskPillProps {
  risk: number;
}

export default function RiskPill({ risk }: RiskPillProps) {
  const tone = risk >= 70 ? 'risk-high' : risk >= 40 ? 'risk-med' : 'risk-low';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${tone}`}>
      {risk}%
    </span>
  );
}
