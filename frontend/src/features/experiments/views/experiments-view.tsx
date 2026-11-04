import { ChevronRight, Sprout } from "lucide-react";
import { Pill } from "../../../shared/ui/form-controls.tsx";
import { formatDate } from "../../inventory/data/inventory-data";
import { useDashboardNavigation } from "../../dashboard-shell/components/navigation";
import { useExperiments } from "../store/experiments-store";
import { latestForTreatment } from "../data/experiments-data";

export function ExperimentsView() {
  const { experiments } = useExperiments();
  const { navigate } = useDashboardNavigation();

  if (experiments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-6 py-14 text-center">
        <Sprout className="size-6 text-muted-foreground" />
        <p className="font-medium">No experiments yet</p>
        <p className="text-sm text-muted-foreground">
          Register a trial once a batch is approved for supervised testing.
        </p>
      </div>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {experiments.map((experiment) => {
        const latest = experiment.treatments
          .map((treatment) => ({
            treatment,
            entry: latestForTreatment(experiment, treatment.id),
          }))
          .filter((row) => row.entry);

        return (
          <article
            key={experiment.id}
            className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-medium">
                  {experiment.title}
                </h3>
                <p className="truncate text-xs text-muted-foreground">
                  {experiment.crop} · {experiment.id}
                </p>
              </div>
              <Pill
                className={
                  experiment.status === "active"
                    ? "bg-success/10 text-success"
                    : "bg-secondary text-secondary-foreground"
                }
              >
                {experiment.status === "active" ? "Active" : "Completed"}
              </Pill>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Batch</dt>
                <dd className="truncate font-medium">{experiment.batchCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Started</dt>
                <dd className="font-medium">
                  {formatDate(experiment.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Treatments</dt>
                <dd className="font-medium">{experiment.treatments.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Measurements</dt>
                <dd className="font-medium">{experiment.growth.length}</dd>
              </div>
            </dl>

            {latest.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {latest.map((row) => (
                  <li key={row.treatment.id}>
                    {row.treatment.label}:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {row.entry!.heightCm.toFixed(1)} cm
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(`/experiments/${experiment.id}`)}
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open experiment
              <ChevronRight className="size-4" />
            </button>
          </article>
        );
      })}
    </section>
  );
}
