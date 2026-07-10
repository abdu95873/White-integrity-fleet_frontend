import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function PaymentsPage() {
  const { formatCurrency } = useCurrency();
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [period, setPeriod] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [weekEnd, setWeekEnd] = useState(toDateInputValue(new Date()));
  const [rangeLabel, setRangeLabel] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading] = useState(false);

  const buildParams = () => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
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
    setLoading(true);
    api
      .get(`/payments?${buildParams()}`)
      .then((res) => {
        setPayments(res.data);
        setPages(res.pagination.pages);
        if (res.range) {
          setRangeLabel(`${formatDate(res.range.start)} – ${formatDate(res.range.end)}`);
        } else {
          setRangeLabel("");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, status, source, period, month, year, weekEnd]);

  const applySearch = () => {
    setPage(1);
    load();
  };

  const confirmPayment = async (id) => {
    if (!confirm("Mark this payment as paid? This action is recorded with your user and timestamp.")) {
      return;
    }
    setConfirming(id);
    try {
      await api.post(`/payments/${id}/confirm`, {});
      load();
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Payments</h1>
        <p className="text-muted-foreground">Review and confirm courier salary payments</p>
        {rangeLabel && (
          <p className="mt-1 text-sm font-medium text-primary">Period: {rangeLabel}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["", "pending", "paid"].map((s) => (
              <Button
                key={s || "all"}
                variant={status === s ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
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
            <Button variant="secondary" onClick={applySearch}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Courier</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Tax Amount</TableHead>
              <TableHead>Grand Payment</TableHead>
              <TableHead>Prev. Due</TableHead>
              <TableHead>Total Payable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  {loading ? "Loading..." : "No payments match your filters"}
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link to={`/companies/${p.courier.id}`} className="font-medium hover:underline">
                      {p.courier.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.courier.externalId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {p.courier.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(p.batch.periodStart)} – {formatDate(p.batch.periodEnd)}
                  </TableCell>
                  <TableCell>{p.commissionUsed}%</TableCell>
                  <TableCell>{formatCurrency(p.taxAmount)}</TableCell>
                  <TableCell>{formatCurrency(p.calculatedGrandPayment)}</TableCell>
                  <TableCell>{formatCurrency(p.previousDueAmount)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.totalPayable)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "paid" ? "success" : "warning"} className="capitalize">
                      {p.status}
                    </Badge>
                    {p.paymentActions[0] && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        by {p.paymentActions[0].confirmedBy.name}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => confirmPayment(p.id)}
                        disabled={confirming === p.id}
                      >
                        {confirming === p.id ? "..." : "Confirm Paid"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
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
