import {
  latestForTreatment,
  measurementDates,
  treatmentColor,
  type Experiment,
} from "../data/experiments-data";

const W = 680;
const H = 260;
const PAD = { left: 40, right: 14, top: 14, bottom: 30 };

export function GrowthChart({ experiment }: { experiment: Experiment }) {
  const dates = measurementDates(experiment);
  const series = experiment.treatments.map((treatment) => ({
    treatment,
    color: treatmentColor[treatment.kind],
    points: dates.map((date) => {
      const entry = experiment.growth.find(
        (item) => item.treatmentId === treatment.id && item.date === date,
      );
      return entry ? entry.heightCm : null;
    }),
  }));

  const maxValue = Math.max(
    1,
    ...series.flatMap((line) =>
      line.points.filter((value): value is number => value !== null),
    ),
  );
  const ceiling = Math.max(5, Math.ceil((maxValue * 1.05) / 5) * 5);

  const x = (index: number) =>
    PAD.left +
    (dates.length > 1 ? index / (dates.length - 1) : 0.5) *
      (W - PAD.left - PAD.right);
  const y = (value: number) =>
    H - PAD.bottom - (value / ceiling) * (H - PAD.top - PAD.bottom);

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((step) => step * ceiling);

  return (
    <article className="rounded-xl border bg-card p-4 md:p-5">
      <div className="space-y-1">
        <h3 className="text-base font-medium">Growth curve</h3>
        <p className="text-xs text-muted-foreground">
          Plant height in cm across measurement dates
        </p>
      </div>

      {dates.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No measurements logged yet.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-4 h-auto w-full"
          role="img"
          aria-label="Plant height by treatment over time"
        >
          {gridValues.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
              <text
                x={PAD.left - 8}
                y={y(value) + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--muted-foreground)"
              >
                {value}
              </text>
            </g>
          ))}

          {dates.map((date, index) => (
            <text
              key={date}
              x={x(index)}
              y={H - 10}
              textAnchor={
                index === 0
                  ? "start"
                  : index === dates.length - 1
                    ? "end"
                    : "middle"
              }
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                timeZone: "UTC",
              })}
            </text>
          ))}

          {series.map((line) => {
            const points = line.points
              .map((value, index) =>
                value === null ? null : `${x(index)},${y(value)}`,
              )
              .filter((point): point is string => point !== null);

            return (
              <g key={line.treatment.id}>
                <polyline
                  points={points.join(" ")}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {line.points.map((value, index) =>
                  value === null ? null : (
                    <circle
                      key={`${line.treatment.id}-${index}`}
                      cx={x(index)}
                      cy={y(value)}
                      r="3"
                      fill={line.color}
                    />
                  ),
                )}
              </g>
            );
          })}
        </svg>
      )}

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {series.map((line) => (
          <li key={line.treatment.id} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-muted-foreground">{line.treatment.label}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function TreatmentComparison({ experiment }: { experiment: Experiment }) {
  const rows = experiment.treatments.map((treatment) => {
    const latest = latestForTreatment(experiment, treatment.id);
    return {
      treatment,
      color: treatmentColor[treatment.kind],
      height: latest?.heightCm ?? 0,
      leaves: latest?.leafCount ?? 0,
    };
  });

  const max = Math.max(1, ...rows.map((row) => row.height));

  return (
    <article className="rounded-xl border bg-card p-4 md:p-5">
      <div className="space-y-1">
        <h3 className="text-base font-medium">Treatment comparison</h3>
        <p className="text-xs text-muted-foreground">
          Latest recorded height per treatment
        </p>
      </div>

      <ul className="mt-5 flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.treatment.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{row.treatment.label}</span>
              <span className="tabular-nums font-medium">
                {row.height.toFixed(1)} cm
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(row.height / max) * 100}%`,
                  backgroundColor: row.color,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {row.leaves} leaves
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
