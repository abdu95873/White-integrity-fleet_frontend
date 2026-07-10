import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodFilters, toDateInputValue } from "@/components/filters/PeriodFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const currentYear = new Date().getFullYear();

export default function ReportsPage() {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("weekly");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [weekEnd, setWeekEnd] = useState(toDateInputValue(new Date()));
  const [source, setSource] = useState("");
  const [courierId, setCourierId] = useState("");
  const [data, setData] = useState([]);
  const [rangeLabel, setRangeLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buildParams = (format = "json") => {
    const params = new URLSearchParams({ period, format });
    if (period === "monthly") {
      params.set("month", String(month));
      params.set("year", String(year));
    } else if (period === "yearly") {
      params.set("year", String(year));
    } else if (period === "weekly") {
      params.set("weekEnd", weekEnd);
    }
    if (source) params.set("source", source);
    if (courierId) params.set("courierId", courierId);
    return params;
  };

  const load = () => {
    setLoading(true);
    api
      .get(`/reports?${buildParams("json")}`)
      .then((res) => {
        setData(res.data);
        if (res.range) {
          setRangeLabel(`${formatDate(res.range.start)} – ${formatDate(res.range.end)}`);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [period, month, year, weekEnd, source]);

  const exportFile = async (format) => {
    if ((format === "pdf" || format === "chart-xlsx") && !source) {
      setError("Select Glovo or Bolt platform for payment chart export");
      return;
    }

    setError("");
    const params = buildParams(format);
    const label =
      period === "monthly"
        ? `${year}-${String(month).padStart(2, "0")}`
        : period === "yearly"
          ? String(year)
          : weekEnd;
    const ext =
      format === "csv" ? "csv" : format === "pdf" ? "pdf" : "xlsx";
    const prefix =
      format === "pdf" || format === "chart-xlsx"
        ? `${source.toUpperCase()}-payment-chart-`
        : "report-";
    try {
      await api.download(`/reports?${params}`, `${prefix}${label}.${ext}`);
    } catch (err) {
      setError(err.message || "Download failed");
    }
  };

  const viewCourierReport = () => {
    if (!courierId.trim()) {
      load();
      return;
    }
    navigate(`/companies/${courierId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
          <p className="text-muted-foreground">
            Select any week, month, or year to view payroll reports
          </p>
          {rangeLabel && (
            <p className="mt-1 text-sm font-medium text-primary">Showing: {rangeLabel}</p>
          )}
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          {!source && (
            <p className="mt-1 text-sm text-muted-foreground">
              Select Glovo or Bolt to export the payment chart PDF/Excel.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportFile("pdf")} disabled={!source}>
            <Download className="mr-2 h-4 w-4" />
            Payment Chart PDF
          </Button>
          <Button variant="outline" onClick={() => exportFile("chart-xlsx")} disabled={!source}>
            <Download className="mr-2 h-4 w-4" />
            Payment Chart Excel
          </Button>
          <Button variant="outline" onClick={() => exportFile("csv")}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportFile("xlsx")}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <PeriodFilters
            showAllOption={false}
            period={period}
            onPeriodChange={setPeriod}
            month={month}
            onMonthChange={setMonth}
            year={year}
            onYearChange={setYear}
            weekEnd={weekEnd}
            onWeekEndChange={setWeekEnd}
          />

          <div className="space-y-2">
            <Label>Platform</Label>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">All</option>
              <option value="glovo">Glovo</option>
              <option value="bolt">Bolt</option>
            </select>
          </div>

          <div className="min-w-[200px] space-y-2">
            <Label>Courier ID (internal)</Label>
            <Input
              placeholder="Filter by courier..."
              value={courierId}
              onChange={(e) => setCourierId(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Generate"}
            </Button>
            {courierId && (
              <Button variant="secondary" onClick={viewCourierReport}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Courier
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Courier ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Commission Amount</TableHead>
              <TableHead>Tax Amount</TableHead>
              <TableHead>Total Payable</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No records for selected period
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={`${row.courierId}-${i}`}>
                  <TableCell className="font-mono text-sm">{row.courierId}</TableCell>
                  <TableCell>{row.courierName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {row.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
                  </TableCell>
                  <TableCell>{row.commissionUsed}%</TableCell>
                  <TableCell>{formatCurrency(row.commissionAmount)}</TableCell>
                  <TableCell>{formatCurrency(row.taxAmount)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(row.totalPayable)}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "paid" ? "success" : "warning"} className="capitalize">
                      {row.status}
                    </Badge>
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
