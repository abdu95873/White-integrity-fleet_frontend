import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Wallet, Clock, Receipt, ArrowDownLeft, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PeriodFilters,
  CURRENT_YEAR,
  toDateInputValue,
  weekStartFromEnd,
} from "@/components/filters/PeriodFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AccountsPage() {
  const { formatCurrency } = useCurrency();
  const [period, setPeriod] = useState("weekly");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [weekStart, setWeekStart] = useState(weekStartFromEnd(toDateInputValue(new Date())));
  const [weekEnd, setWeekEnd] = useState(toDateInputValue(new Date()));
  const [source, setSource] = useState("");
  const [data, setData] = useState(null);
  const [rangeLabel, setRangeLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ready, setReady] = useState(false);
  const skipNextLoad = useRef(false);

  const applyResponse = (res) => {
    setData(res);
    if (res.range) {
      setRangeLabel(`${formatDate(res.range.start)} – ${formatDate(res.range.end)}`);
    } else {
      setRangeLabel("");
    }
  };

  const buildParams = () => {
    const params = new URLSearchParams({ period });
    if (period === "monthly") {
      params.set("month", String(month));
      params.set("year", String(year));
    } else if (period === "yearly") {
      params.set("year", String(year));
    } else if (period === "weekly") {
      if (weekStart) params.set("weekStart", weekStart);
      params.set("weekEnd", weekEnd);
    }
    if (source) params.set("source", source);
    return params;
  };

  const load = () => {
    setLoading(true);
    api
      .get(`/accounts?${buildParams()}`)
      .then(applyResponse)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const syncAndLoad = async () => {
    setSyncing(true);
    try {
      await api.post("/accounts/sync");
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
      load();
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/accounts?period=weekly");
        if (res.periodDefaults) {
          setPeriod(res.periodDefaults.period);
          setMonth(res.periodDefaults.month);
          setYear(res.periodDefaults.year);
          setWeekStart(
            res.periodDefaults.weekStart ?? weekStartFromEnd(res.periodDefaults.weekEnd)
          );
          setWeekEnd(res.periodDefaults.weekEnd);
        }
        applyResponse(res);
        skipNextLoad.current = true;
      } catch (err) {
        console.error(err);
      } finally {
        setReady(true);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    load();
  }, [ready, period, month, year, weekStart, weekEnd, source]);

  const allTime = data?.allTime;
  const periodSummary = data?.summary;

  const allTimeCards = [
    {
      title: "Due from Users",
      value: allTime ? formatCurrency(allTime.totalDueFromUsers) : "—",
      icon: ArrowDownLeft,
      desc: "Total cash debt & amounts users owe you",
      highlight: true,
    },
    {
      title: "Outstanding (Collect)",
      value: allTime ? formatCurrency(allTime.totalOutstandingFromUsers) : "—",
      icon: Clock,
      desc: "Pending — still to collect from users",
      highlight: true,
    },
    {
      title: "Commission Profit",
      value: allTime ? formatCurrency(allTime.totalCommissionProfit) : "—",
      icon: TrendingUp,
      desc: "Total commission earned (set rates on company profiles)",
    },
    {
      title: "Tax Collected",
      value: allTime ? formatCurrency(allTime.totalTaxCollected) : "—",
      icon: Receipt,
      desc: "Fixed tax amounts deducted",
    },
    {
      title: "Due to Couriers",
      value: allTime ? formatCurrency(allTime.totalPendingDue) : "—",
      icon: Wallet,
      desc: `${allTime?.pendingCount ?? 0} pending payouts`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            User receivables, commission profit, and courier payouts
          </p>
        </div>
        <Button variant="outline" onClick={syncAndLoad} disabled={syncing || loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Refresh calculations
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {allTimeCards.map(({ title, value, icon: Icon, desc, highlight }) => (
          <Card key={title} className={highlight ? "border-blue-200 bg-blue-50/30" : undefined}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className={`h-4 w-4 ${highlight ? "text-blue-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${highlight ? "text-blue-700" : ""}`}>
                {loading && !data ? "…" : value}
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.outstandingReceivables?.length > 0 ? (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Users who owe you — pending collection</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>You receive</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.outstandingReceivables.map((row) => (
                  <TableRow key={`${row.courierId}-${row.periodStart}`}>
                    <TableCell className="font-mono text-sm">{row.externalId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {row.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
                    </TableCell>
                    <TableCell className="font-bold text-blue-700">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell>
                      <Link to={`/companies/${row.courierId}`}>
                        <span className="text-sm font-medium text-primary hover:underline">View</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        !loading && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No pending amounts owed by users. Upload Excel and set commission/tax on company profiles.
            </CardContent>
          </Card>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle>Period breakdown</CardTitle>
          {rangeLabel && (
            <p className="text-sm font-medium text-primary">Showing: {rangeLabel}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <PeriodFilters
              period={period}
              onPeriodChange={setPeriod}
              month={month}
              onMonthChange={setMonth}
              year={year}
              onYearChange={setYear}
              weekStart={weekStart}
              weekEnd={weekEnd}
              onWeekStartChange={setWeekStart}
              onWeekEndChange={setWeekEnd}
              showAllOption={false}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Platform</label>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">All platforms</option>
                <option value="glovo">Glovo</option>
                <option value="bolt">Bolt</option>
              </select>
            </div>
          </div>

          {periodSummary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Due from users</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(periodSummary.dueFromUsers)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg font-bold">{formatCurrency(periodSummary.outstandingFromUsers)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(periodSummary.commissionProfit)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Due to couriers</p>
                <p className="text-lg font-bold text-amber-700">
                  {formatCurrency(periodSummary.pendingDue)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Paid out</p>
                <p className="text-lg font-bold">{formatCurrency(periodSummary.paidOut)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Due from User</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Due to Courier</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.byCourier?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {loading ? "Loading..." : "No records for selected period — try 22/06/2026 – 28/06/2026"}
                </TableCell>
              </TableRow>
            ) : (
              data.byCourier.map((row) => (
                <TableRow key={row.courierId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{row.externalId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {row.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-blue-700">
                    {row.dueFromUsers > 0 ? formatCurrency(row.dueFromUsers) : "—"}
                  </TableCell>
                  <TableCell className="font-medium text-green-700">
                    {row.commissionProfit > 0 ? formatCurrency(row.commissionProfit) : "—"}
                  </TableCell>
                  <TableCell className="text-amber-700">
                    {row.pendingDue > 0 ? formatCurrency(row.pendingDue) : "—"}
                  </TableCell>
                  <TableCell>
                    <Link to={`/companies/${row.courierId}`}>
                      <span className="text-sm font-medium text-primary hover:underline">View</span>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
