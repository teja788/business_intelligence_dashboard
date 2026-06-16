/**
 * ECharts theming derived from the app's CSS variables, so charts follow the
 * active theme (dark/light) without hardcoding colors. Kept inside the adapter.
 */

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  // Variables are stored as "r g b" triples.
  const parts = raw.split(/\s+/);
  if (parts.length === 3) return `rgb(${parts.join(',')})`;
  return raw;
}

export interface EChartsTheme {
  text: string;
  textMuted: string;
  axis: string;
  split: string;
  palette: string[];
}

export function echartsTheme(): EChartsTheme {
  const accent = cssVar('--v-accent', '99 102 241');
  const accent2 = cssVar('--v-accent2', '34 211 238');
  return {
    text: cssVar('--v-content-primary', '237 237 244'),
    textMuted: cssVar('--v-content-muted', '110 110 128'),
    axis: cssVar('--v-border-strong', '60 60 74'),
    split: cssVar('--v-border-subtle', '38 38 48'),
    palette: [
      accent,
      accent2,
      'rgb(52,211,153)',
      'rgb(251,191,36)',
      'rgb(244,114,182)',
      'rgb(96,165,250)',
      'rgb(167,139,250)',
      'rgb(248,113,113)',
      'rgb(45,212,191)',
      'rgb(250,204,21)',
    ],
  };
}

/** Common axis/grid/tooltip styling shared by cartesian charts. */
export function baseCartesianOption(theme: EChartsTheme) {
  return {
    grid: { left: 48, right: 20, top: 32, bottom: 40, containLabel: true },
    textStyle: { color: theme.text, fontFamily: 'Inter, sans-serif' },
    legend: {
      type: 'scroll',
      textStyle: { color: theme.textMuted },
      top: 4,
      icon: 'roundRect',
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20,20,28,0.96)',
      borderColor: theme.split,
      textStyle: { color: theme.text },
    },
  } as const;
}

export function categoryAxis(
  theme: EChartsTheme,
  name?: string,
  data?: (string | number)[],
) {
  return {
    type: 'category' as const,
    name,
    data,
    nameTextStyle: { color: theme.textMuted },
    axisLine: { lineStyle: { color: theme.axis } },
    axisLabel: { color: theme.textMuted, hideOverlap: true },
    axisTick: { show: false },
  };
}

export function valueAxis(theme: EChartsTheme, name?: string) {
  return {
    type: 'value' as const,
    name,
    nameTextStyle: { color: theme.textMuted },
    axisLine: { show: false },
    axisLabel: { color: theme.textMuted },
    splitLine: { lineStyle: { color: theme.split } },
  };
}
