type MetricTone = "blue" | "cyan" | "mint" | "violet";

const valueToneClasses: Record<MetricTone, string> = {
  blue: "metric-value-blue",
  cyan: "metric-value-cyan",
  mint: "metric-value-mint",
  violet: "metric-value-violet",
};

type MetricProps = {
  label: string;
  tone?: MetricTone;
  value: string;
};

export function Metric({ label, tone = "blue", value }: MetricProps) {
  return (
    <div className="metric-card min-h-24 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-4">
      <dt className={`metric-value text-2xl font-bold tracking-tight ${valueToneClasses[tone]}`}>
        {value}
      </dt>
      <dd className="mt-2 text-xs leading-5 text-slate-400">{label}</dd>
    </div>
  );
}
