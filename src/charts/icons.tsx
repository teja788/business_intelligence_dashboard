/** Chart-type glyphs for the catalog / type switcher. */
import type { SVGProps } from 'react';

const svg = (p: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
});

export const BarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
  </svg>
);
export const LineIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <path d="M3 17l5-6 4 3 7-8" />
    <path d="M3 21h18" />
  </svg>
);
export const AreaIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <path d="M3 16l5-5 4 2 6-7v11H3z" />
  </svg>
);
export const PieIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <path d="M12 3a9 9 0 1 0 9 9h-9z" />
    <path d="M12 3v9" />
  </svg>
);
export const ScatterIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <circle cx="7" cy="14" r="1.6" />
    <circle cx="12" cy="8" r="1.6" />
    <circle cx="16" cy="15" r="1.6" />
    <circle cx="18" cy="6" r="1.6" />
    <path d="M3 21h18" />
  </svg>
);
export const BubbleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <circle cx="8" cy="13" r="3" />
    <circle cx="16" cy="9" r="4.5" />
    <circle cx="18" cy="17" r="1.6" />
  </svg>
);
export const KpiIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <path d="M4 7h16M4 12h7M4 17h10" />
  </svg>
);
export const TableChartIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
);
export const HeatmapIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
  </svg>
);
export const PivotIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 3v18" />
    <path d="M13 13h5v5" />
  </svg>
);
export const DonutIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v5" />
  </svg>
);
export const FunnelIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </svg>
);
export const TreemapIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M13 3v10M3 13h10M13 8h8" />
  </svg>
);
export const GaugeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...svg(p)}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="M12 18l4-5" />
  </svg>
);
