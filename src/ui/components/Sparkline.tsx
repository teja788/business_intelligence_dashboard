/** Tiny inline-SVG bar sparkline for column distributions. */
export function Sparkline({
  values,
  width = 120,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const gap = 1;
  const barW = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg width={width} height={height} className="block">
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * (height - 2));
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={1}
            className="fill-accent2/70"
          />
        );
      })}
    </svg>
  );
}
