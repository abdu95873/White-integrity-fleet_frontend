import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  toDateInputValue,
  weekStartFromEnd,
  weekEndFromStart,
} from "@/components/filters/PeriodFilters";

function daysBetween(weekStart, weekEnd) {
  if (!weekStart || !weekEnd) return 6;
  const [sy, sm, sd] = weekStart.split("-").map(Number);
  const [ey, em, ed] = weekEnd.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  return Math.max(0, Math.round((end - start) / 86400000));
}

function shiftDateInput(value, days) {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

/**
 * Scales to many payroll weeks: date pickers + recent chips instead of a long dropdown.
 * mode: "future" | "week"
 */
export function RateApplySelector({
  mode,
  onModeChange,
  weekStart,
  weekEnd,
  onWeekRangeChange,
  recentWeeks = [],
  selectedWeekKey,
}) {
  const setStart = (nextStart) => {
    const span = daysBetween(weekStart, weekEnd);
    onWeekRangeChange({ start: nextStart, end: shiftDateInput(nextStart, span) });
  };

  const setEnd = (nextEnd) => {
    const span = daysBetween(weekStart, weekEnd);
    onWeekRangeChange({ start: shiftDateInput(nextEnd, -span), end: nextEnd });
  };

  const pickRecent = (week) => {
    onModeChange("week");
    onWeekRangeChange({ start: week.periodStart, end: week.periodEnd });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Apply Scope
          </Label>
          <p className="text-sm text-muted-foreground">
            Update one week or all upcoming payroll weeks.
          </p>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => onModeChange("future")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              mode === "future"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Current & future
          </button>
          <button
            type="button"
            onClick={() => onModeChange("week")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              mode === "week"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            One specific week
          </button>
        </div>
      </div>

      {mode === "week" && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Week Start
              </Label>
              <Input type="date" value={weekStart} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Week End
              </Label>
              <Input type="date" value={weekEnd} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="hidden text-xs text-muted-foreground md:block">
              Paid weeks stay locked; difference auto-carries.
            </div>
          </div>

          {recentWeeks.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Recent Weeks
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentWeeks.map((week) => {
                  const key = `${week.periodStart}|${week.periodEnd}`;
                  const active = selectedWeekKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pickRecent(week)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {week.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {mode === "future"
          ? "Applies from today forward. Past paid weeks stay unchanged."
          : "Tip: click a Payment History row below to load that week instantly."}
      </p>
    </div>
  );
}

export function buildKnownWeeks(paymentRecords, formatDate, limit = 8) {
  if (!paymentRecords?.length) return [];

  const seen = new Map();
  for (const r of paymentRecords) {
    const periodStart = toDateInputValue(new Date(r.batch.periodStart));
    const periodEnd = toDateInputValue(new Date(r.batch.periodEnd));
    const key = `${periodStart}|${periodEnd}`;
    if (!seen.has(key)) {
      const paid = r.status === "paid";
      seen.set(key, {
        periodStart,
        periodEnd,
        periodStartMs: new Date(r.batch.periodStart).getTime(),
        label: `${formatDate(r.batch.periodStart)} – ${formatDate(r.batch.periodEnd)}${paid ? " · paid" : ""}`,
      });
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.periodStartMs - a.periodStartMs)
    .slice(0, limit);
}

export function defaultWeekRange(paymentRecords) {
  if (!paymentRecords?.length) {
    const end = toDateInputValue(new Date());
    return { start: weekStartFromEnd(end), end };
  }
  const latest = [...paymentRecords].sort(
    (a, b) => new Date(b.batch.periodStart) - new Date(a.batch.periodStart)
  )[0];
  return {
    start: toDateInputValue(new Date(latest.batch.periodStart)),
    end: toDateInputValue(new Date(latest.batch.periodEnd)),
  };
}

export { weekEndFromStart, weekStartFromEnd };
