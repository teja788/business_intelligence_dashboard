/**
 * Bundled sample datasets so users reach a populated, explorable view in one
 * click (the "Try sample data" onboarding promise).
 */
import salesCsv from './sales.csv?raw';
import countriesCsv from './countries.csv?raw';

export interface SampleDataset {
  fileName: string;
  name: string;
  description: string;
  csv: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    fileName: 'sales.csv',
    name: 'Retail Sales',
    description: 'Orders across regions, categories, and segments (2023–2024).',
    csv: salesCsv,
  },
  {
    fileName: 'countries.csv',
    name: 'Sales by Country',
    description: 'Country-level sales — demoable with the choropleth map.',
    csv: countriesCsv,
  },
];
