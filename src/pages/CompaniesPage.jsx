import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PeriodFilters,
  CURRENT_YEAR,
  toDateInputValue,
} from "@/components/filters/PeriodFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export default function CompaniesPage() {
  const { formatCurrency } = useCurrency();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [period, setPeriod] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [weekEnd, setWeekEnd] = useState(toDateInputValue(new Date()));
  const [rangeLabel, setRangeLabel] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const buildParams = () => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (source) params.set("source", source);
    if (period) {
      params.set("period", period);
      if (period === "monthly") {
        params.set("month", String(month));
        params.set("year", String(year));
      } else if (period === "yearly") {
        params.set("year", String(year));
      } else if (period === "weekly") {
        params.set("weekEnd", weekEnd);
      }
    }
    return params;
  };

  const load = () => {
    api.get(`/couriers?${buildParams()}`).then((res) => {
      setCompanies(res.data);
      setPages(res.pagination.pages);
      if (res.range) {
        setRangeLabel(`${formatDate(res.range.start)} – ${formatDate(res.range.end)}`);
      } else {
        setRangeLabel("");
      }
    });
  };

  useEffect(() => {
    load();
  }, [page, source, period, month, year, weekEnd]);

  const hasPeriodFilter = Boolean(period);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground">
          Manage Glovo and Bolt company profiles — filter by any week, month, or year
        </p>
        {rangeLabel && (
          <p className="mt-1 text-sm font-medium text-primary">Showing: {rangeLabel}</p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All platforms</option>
          <option value="glovo">Glovo</option>
          <option value="bolt">Bolt</option>
        </select>
        <PeriodFilters
          period={period}
          onPeriodChange={(value) => {
            setPeriod(value);
            setPage(1);
          }}
          month={month}
          onMonthChange={setMonth}
          year={year}
          onYearChange={setYear}
          weekEnd={weekEnd}
          onWeekEndChange={setWeekEnd}
        />
        <Button variant="secondary" onClick={() => (setPage(1), load())}>
          Search
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Tax Amount</TableHead>
              {hasPeriodFilter ? (
                <>
                  <TableHead>Period Payable</TableHead>
                  <TableHead>Period Tax</TableHead>
                </>
              ) : (
                <TableHead>Pending Due</TableHead>
              )}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {c.source}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{c.externalId}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.currentCommission}%</TableCell>
                <TableCell>{formatCurrency(c.currentTax)}</TableCell>
                {hasPeriodFilter ? (
                  <>
                    <TableCell>{formatCurrency(c.periodPayable)}</TableCell>
                    <TableCell>{formatCurrency(c.periodTax)}</TableCell>
                  </>
                ) : (
                  <TableCell>
                    {c.pendingDue > 0 ? formatCurrency(c.pendingDue) : "—"}
                  </TableCell>
                )}
                <TableCell>
                  <Link to={`/companies/${c.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page} of {pages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
