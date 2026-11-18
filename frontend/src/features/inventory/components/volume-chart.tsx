import { fmtKg } from "../data/inventory-data";

export function VolumeChart({
  title = "Volume collected",
  subtitle,
  volumes,
}: {
  title?: string;
  subtitle: string;
  volumes: { label: string; value: number }[];
}) {
  const total = volumes.reduce((sum, v) => sum + v.value, 0);
  const max = Math.max(...volumes.map((v) => v.value), 1);
  const columns = {
    gridTemplateColumns: `repeat(${volumes.length}, minmax(0, 1fr))`,
  };

  return (
    <article className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-xl leading-none font-semibold tabular-nums">
            {fmtKg(Math.round(total * 10) / 10)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">in this window</p>
        </div>
      </div>

      <div className="mt-6 grid h-52 items-end gap-2 md:gap-4" style={columns}>
        {volumes.map((v) => (
          <div
            key={v.label}
            className="flex h-full flex-col items-center justify-end gap-1"
          >
            <span className="text-xs tabular-nums text-muted-foreground">
              {v.value}
            </span>
            <div
              title={`${v.label}: ${fmtKg(v.value)}`}
              style={{ height: `${(v.value / max) * 82}%` }}
              className="w-full rounded-t-md bg-primary transition-opacity hover:opacity-80"
            />
          </div>
        ))}
      </div>
      <div
        className="mt-2 grid text-center text-xs text-muted-foreground"
        style={columns}
      >
        {volumes.map((v) => (
          <span key={v.label}>{v.label}</span>
        ))}
      </div>
    </article>
  );
}
