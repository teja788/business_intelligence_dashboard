/**
 * Formula function registry — the third plugin extension point (§10). New
 * functions register here with a signature, docs, and an SQL compiler; the
 * parser and autocomplete grow without touching the core.
 */

export type FunctionKind = 'scalar' | 'aggregate' | 'window';

export interface FormulaFunction {
  name: string;
  kind: FunctionKind;
  minArgs: number;
  maxArgs: number; // Infinity for variadic
  signature: string;
  docs: string;
  /** Compile pre-compiled argument SQL into this function's SQL. */
  compile: (args: string[]) => string;
}

const registry = new Map<string, FormulaFunction>();

export function registerFunction(fn: FormulaFunction): void {
  registry.set(fn.name.toUpperCase(), fn);
}
export function getFunction(name: string): FormulaFunction | undefined {
  return registry.get(name.toUpperCase());
}
export function listFunctions(): FormulaFunction[] {
  return [...registry.values()];
}

/** Window ordering placeholder — replaced by the query compiler with the
 *  active dimension's expression at query time. */
export const ORDER_PLACEHOLDER = '__ORDER__';

function def(
  name: string,
  kind: FunctionKind,
  minArgs: number,
  maxArgs: number,
  signature: string,
  docs: string,
  compile: (a: string[]) => string,
) {
  registerFunction({ name, kind, minArgs, maxArgs, signature, docs, compile });
}

// --- Math ----------------------------------------------------------------
def('ABS', 'scalar', 1, 1, 'ABS(number)', 'Absolute value.', (a) => `ABS(${a[0]})`);
def('ROUND', 'scalar', 1, 2, 'ROUND(number, [decimals])', 'Round to decimals.', (a) => `ROUND(${a[0]}${a[1] ? `, ${a[1]}` : ''})`);
def('FLOOR', 'scalar', 1, 1, 'FLOOR(number)', 'Round down.', (a) => `FLOOR(${a[0]})`);
def('CEIL', 'scalar', 1, 1, 'CEIL(number)', 'Round up.', (a) => `CEIL(${a[0]})`);
def('SQRT', 'scalar', 1, 1, 'SQRT(number)', 'Square root.', (a) => `SQRT(${a[0]})`);
def('POWER', 'scalar', 2, 2, 'POWER(base, exp)', 'Exponentiation.', (a) => `POWER(${a[0]}, ${a[1]})`);
def('MOD', 'scalar', 2, 2, 'MOD(a, b)', 'Remainder.', (a) => `(${a[0]} % ${a[1]})`);

// --- String --------------------------------------------------------------
def('CONCAT', 'scalar', 1, Infinity, 'CONCAT(a, b, …)', 'Join strings.', (a) => `CONCAT(${a.join(', ')})`);
def('UPPER', 'scalar', 1, 1, 'UPPER(text)', 'Uppercase.', (a) => `UPPER(${a[0]})`);
def('LOWER', 'scalar', 1, 1, 'LOWER(text)', 'Lowercase.', (a) => `LOWER(${a[0]})`);
def('TRIM', 'scalar', 1, 1, 'TRIM(text)', 'Strip whitespace.', (a) => `TRIM(${a[0]})`);
def('LEFT', 'scalar', 2, 2, 'LEFT(text, n)', 'First n characters.', (a) => `LEFT(${a[0]}, ${a[1]})`);
def('RIGHT', 'scalar', 2, 2, 'RIGHT(text, n)', 'Last n characters.', (a) => `RIGHT(${a[0]}, ${a[1]})`);
def('LEN', 'scalar', 1, 1, 'LEN(text)', 'String length.', (a) => `LENGTH(${a[0]})`);
def('REPLACE', 'scalar', 3, 3, 'REPLACE(text, find, with)', 'Replace substring.', (a) => `REPLACE(${a[0]}, ${a[1]}, ${a[2]})`);
def('SPLIT', 'scalar', 3, 3, 'SPLIT(text, delim, index)', 'Split and take 1-based part.', (a) => `SPLIT_PART(${a[0]}, ${a[1]}, ${a[2]})`);

// --- Logic ---------------------------------------------------------------
def('IF', 'scalar', 3, 3, 'IF(condition, then, else)', 'Conditional value.', (a) => `CASE WHEN ${a[0]} THEN ${a[1]} ELSE ${a[2]} END`);
def('COALESCE', 'scalar', 1, Infinity, 'COALESCE(a, b, …)', 'First non-null.', (a) => `COALESCE(${a.join(', ')})`);
def('ISNULL', 'scalar', 1, 1, 'ISNULL(value)', 'True when null.', (a) => `(${a[0]} IS NULL)`);

// --- Dates ---------------------------------------------------------------
def('YEAR', 'scalar', 1, 1, 'YEAR(date)', 'Year part.', (a) => `YEAR(${a[0]})`);
def('MONTH', 'scalar', 1, 1, 'MONTH(date)', 'Month number.', (a) => `MONTH(${a[0]})`);
def('DAY', 'scalar', 1, 1, 'DAY(date)', 'Day of month.', (a) => `DAY(${a[0]})`);
def('QUARTER', 'scalar', 1, 1, 'QUARTER(date)', 'Quarter number.', (a) => `QUARTER(${a[0]})`);
def('DATETRUNC', 'scalar', 2, 2, "DATETRUNC('month', date)", 'Truncate a date to a unit.', (a) => `DATE_TRUNC(${a[0]}, ${a[1]})`);
def('DATEDIFF', 'scalar', 3, 3, "DATEDIFF('day', start, end)", 'Difference in units.', (a) => `DATE_DIFF(${a[0]}, ${a[1]}, ${a[2]})`);

// --- Casts ---------------------------------------------------------------
def('INT', 'scalar', 1, 1, 'INT(value)', 'Cast to integer.', (a) => `CAST(${a[0]} AS BIGINT)`);
def('FLOAT', 'scalar', 1, 1, 'FLOAT(value)', 'Cast to number.', (a) => `CAST(${a[0]} AS DOUBLE)`);
def('STR', 'scalar', 1, 1, 'STR(value)', 'Cast to text.', (a) => `CAST(${a[0]} AS VARCHAR)`);

// --- Aggregations --------------------------------------------------------
def('SUM', 'aggregate', 1, 1, 'SUM(number)', 'Total.', (a) => `SUM(${a[0]})`);
def('AVG', 'aggregate', 1, 1, 'AVG(number)', 'Mean.', (a) => `AVG(${a[0]})`);
def('MIN', 'aggregate', 1, 1, 'MIN(value)', 'Minimum.', (a) => `MIN(${a[0]})`);
def('MAX', 'aggregate', 1, 1, 'MAX(value)', 'Maximum.', (a) => `MAX(${a[0]})`);
def('COUNT', 'aggregate', 1, 1, 'COUNT(value)', 'Row count.', (a) => `COUNT(${a[0]})`);
def('COUNTD', 'aggregate', 1, 1, 'COUNTD(value)', 'Distinct count.', (a) => `COUNT(DISTINCT ${a[0]})`);
def('MEDIAN', 'aggregate', 1, 1, 'MEDIAN(number)', 'Median.', (a) => `MEDIAN(${a[0]})`);

// --- Window / running calcs ----------------------------------------------
def('RUNNING_SUM', 'window', 1, 1, 'RUNNING_SUM(measure)', 'Cumulative total over the chart order.', (a) => `SUM(${a[0]}) OVER (ORDER BY ${ORDER_PLACEHOLDER} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`);
def('MOVING_AVG', 'window', 2, 2, 'MOVING_AVG(measure, n)', 'Moving average of the last n points.', (a) => `AVG(${a[0]}) OVER (ORDER BY ${ORDER_PLACEHOLDER} ROWS BETWEEN ${a[1]} - 1 PRECEDING AND CURRENT ROW)`);
def('RANK', 'window', 1, 1, 'RANK(measure)', 'Rank (1 = highest).', (a) => `RANK() OVER (ORDER BY ${a[0]} DESC)`);
def('PERCENT_OF_TOTAL', 'window', 1, 1, 'PERCENT_OF_TOTAL(measure)', 'Share of the grand total.', (a) => `(${a[0]}) / NULLIF(SUM(${a[0]}) OVER (), 0)`);
