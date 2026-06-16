/**
 * Register built-in chart plugins. Imported once at app start. The catalog
 * grows here as new plugin files are added — no other core code changes.
 */
import { registerChart } from './registry';
import { barChart } from './echarts/bar';
import { lineChart, areaChart } from './echarts/line';
import { comboChart } from './echarts/combo';
import { pieChart, donutChart } from './echarts/pie';
import { funnelChart } from './echarts/funnel';
import { treemapChart } from './echarts/treemap';
import { gaugeChart } from './echarts/gauge';
import { scatterChart, bubbleChart } from './echarts/scatter';
import { heatmapChart } from './echarts/heatmap';
import { kpiChart } from './react/kpi';
import { tableChart } from './react/table';
import { pivotChart } from './react/pivot';

let registered = false;

export function registerBuiltinCharts(): void {
  if (registered) return;
  registered = true;
  [
    barChart,
    lineChart,
    areaChart,
    comboChart,
    pieChart,
    donutChart,
    funnelChart,
    treemapChart,
    gaugeChart,
    scatterChart,
    bubbleChart,
    heatmapChart,
    kpiChart,
    tableChart,
    pivotChart,
  ].forEach(registerChart);
}
