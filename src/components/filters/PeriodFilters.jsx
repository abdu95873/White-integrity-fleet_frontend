import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

export function toDateInputValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInput(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function weekStartFromEnd(weekEnd) {
  if (!weekEnd) return "";
  const end = parseDateInput(weekEnd);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return toDateInputValue(start);
}

export function weekEndFromStart(weekStart) {
  if (!weekStart) return "";
  const start = parseDateInput(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return toDateInputValue(end);
}

function daysBetween(weekStart, weekEnd) {
  if (!weekStart || !weekEnd) return 6;
  const start = parseDateInput(weekStart);
  const end = parseDateInput(weekEnd);
  return Math.max(0, Math.round((end - start) / 86400000));
}

function shiftDateInput(value, days) {
  const d = parseDateInput(value);
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

export function PeriodFilters({
  period,
  onPeriodChange,
  month,
  onMonthChange,
  year,
  onYearChange,
  weekStart,
  weekEnd,
  onWeekStartChange,
  onWeekEndChange,
  showAllOption = true,
}) {
  const resolvedWeekStart = weekStart ?? weekStartFromEnd(weekEnd);
  return (
    <>
      <div className="space-y-2">
        <Label>Period type</Label>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
        >
          {showAllOption && <option value="">All time</option>}
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {period === "monthly" && (
        <>
          <div className="space-y-2">
            <Label>Month</Label>
            <select
              className="flex h-10 min-w-[140px] rounded-md border border-input bg-background px-3 text-sm"
              value={month}
              onChange={(e) => onMonthChange(Number(e.target.value))}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {period === "yearly" && (
        <div className="space-y-2">
          <Label>Year</Label>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {period === "weekly" && (
        <>
          <div className="space-y-2">
            <Label>Week start</Label>
            <Input
              type="date"
              value={resolvedWeekStart}
              onChange={(e) => {
                const nextStart = e.target.value;
                const span = daysBetween(resolvedWeekStart, weekEnd);
                if (onWeekStartChange) {
                  onWeekStartChange(nextStart);
                  onWeekEndChange(shiftDateInput(nextStart, span));
                } else {
                  onWeekEndChange(weekEndFromStart(nextStart));
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Week end</Label>
            <Input
              type="date"
              value={weekEnd}
              onChange={(e) => {
                const nextEnd = e.target.value;
                const span = daysBetween(resolvedWeekStart, weekEnd);
                if (onWeekStartChange) {
                  onWeekStartChange(shiftDateInput(nextEnd, -span));
                }
                onWeekEndChange(nextEnd);
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
