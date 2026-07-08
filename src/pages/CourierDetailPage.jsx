import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RateApplySelector,
  buildKnownWeeks,
  defaultWeekRange,
} from "@/components/courier/RateApplySelector";
import { toDateInputValue } from "@/components/filters/PeriodFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CourierDetailPage() {
  const { formatCurrency } = useCurrency();
  const { id } = useParams();
  const [courier, setCourier] = useState(null);
  const [commission, setCommission] = useState("");
  const [tax, setTax] = useState("");
  const [applyMode, setApplyMode] = useState("future");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [showAllCommissionHistory, setShowAllCommissionHistory] = useState(false);
  const [showAllTaxHistory, setShowAllTaxHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    api.get(`/couriers/${id}`).then(setCourier);
  };

  useEffect(() => {
    if (!courier?.paymentRecords?.length) return;
    const { start, end } = defaultWeekRange(courier.paymentRecords);
    setWeekStart(start);
    setWeekEnd(end);
  }, [courier?.id, courier?.paymentRecords?.length]);

  const recentWeeks = buildKnownWeeks(courier?.paymentRecords, formatDate, 8);
  const selectedWeekKey =
    applyMode === "week" && weekStart && weekEnd ? `${weekStart}|${weekEnd}` : "";

  const buildRateBody = (value) => {
    const body = { value: parseFloat(value) };
    if (applyMode === "week" && weekStart && weekEnd) {
      body.periodStart = weekStart;
      body.periodEnd = weekEnd;
    }
    return body;
  };

  const selectPaymentWeek = (record) => {
    setApplyMode("week");
    setWeekStart(toDateInputValue(new Date(record.batch.periodStart)));
    setWeekEnd(toDateInputValue(new Date(record.batch.periodEnd)));
    setSelectedRowId(record.id);
  };

  const recalculatePending = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.post(`/couriers/${id}/recalculate-pending`);
      load();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    api.post(`/couriers/${id}/recalculate-pending`).finally(load);
  }, [id]);

  const saveCommission = async () => {
    if (!id || !commission) return;
    setSaving(true);
    try {
      await api.post(`/couriers/${id}/commission`, buildRateBody(commission));
      setCommission("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const saveTax = async () => {
    if (!id || !tax) return;
    setSaving(true);
    try {
      await api.post(`/couriers/${id}/tax`, buildRateBody(tax));
      setTax("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const exportPaymentHistory = (format) => {
    if (!id || !courier) return;
    const ext = format === "csv" ? "csv" : "xlsx";
    const safeId = courier.externalId.replace(/[^a-zA-Z0-9_-]+/g, "-");
    api.download(`/couriers/${id}/payment-history?format=${format}`, `${safeId}-payment-history.${ext}`);
  };

  const commissionHistory = courier?.commissionHistory ?? [];
  const taxHistory = courier?.taxHistory ?? [];
  const visibleCommissionHistory = showAllCommissionHistory
    ? commissionHistory
    : commissionHistory.slice(0, 1);
  const visibleTaxHistory = showAllTaxHistory ? taxHistory : taxHistory.slice(0, 1);

  if (!courier) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{courier.name}</h1>
            <Badge variant="secondary" className="capitalize">
              {courier.source}
            </Badge>
          </div>
          <p className="font-mono text-muted-foreground">ID: {courier.externalId}</p>
          {courier.city && <p className="text-sm text-muted-foreground">{courier.city}</p>}
        </div>
        <Button variant="outline" onClick={recalculatePending} disabled={saving}>
          Recalculate pending
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="pt-5">
          <RateApplySelector
            mode={applyMode}
            onModeChange={setApplyMode}
            weekStart={weekStart}
            weekEnd={weekEnd}
            onWeekRangeChange={({ start, end }) => {
              setWeekStart(start);
              setWeekEnd(end);
              setSelectedRowId(null);
            }}
            recentWeeks={recentWeeks}
            selectedWeekKey={selectedWeekKey}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Commission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  New Rate (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
              <Button onClick={saveCommission} disabled={saving}>
                Save
              </Button>
            </div>
            <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  History
                </p>
                {commissionHistory.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCommissionHistory((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showAllCommissionHistory ? "Show less" : `See more (${commissionHistory.length - 1})`}
                  </button>
                )}
              </div>
              {visibleCommissionHistory.map((r) => (
                <div key={r.id} className="flex justify-between gap-3 text-muted-foreground">
                  <span>{r.value}%</span>
                  <span>
                    from {formatDate(r.effectiveFrom)}
                    {r.effectiveTo ? ` to ${formatDate(r.effectiveTo)}` : " (current)"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  New Amount
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
              <Button onClick={saveTax} disabled={saving}>
                Save
              </Button>
            </div>
            <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  History
                </p>
                {taxHistory.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTaxHistory((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showAllTaxHistory ? "Show less" : `See more (${taxHistory.length - 1})`}
                  </button>
                )}
              </div>
              {visibleTaxHistory.map((r) => (
                <div key={r.id} className="flex justify-between gap-3 text-muted-foreground">
                  <span>{formatCurrency(r.value)}</span>
                  <span>
                    from {formatDate(r.effectiveFrom)}
                    {r.effectiveTo ? ` to ${formatDate(r.effectiveTo)}` : " (current)"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Payment History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click a row to select that week for commission/tax above.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => exportPaymentHistory("csv")}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportPaymentHistory("xlsx")}>
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Calculated</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Tax Amount</TableHead>
                <TableHead>Due from User</TableHead>
                <TableHead>Grand</TableHead>
                <TableHead>Prev. Due</TableHead>
                <TableHead>Adjustment</TableHead>
                <TableHead>Total Payable</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courier.paymentRecords.map((r) => (
                <TableRow
                  key={r.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedRowId === r.id ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
                  }`}
                  onClick={() => selectPaymentWeek(r)}
                >
                  <TableCell>
                    {formatDate(r.batch.periodStart)} – {formatDate(r.batch.periodEnd)}
                  </TableCell>
                  <TableCell>{formatCurrency(r.periodCalculated)}</TableCell>
                  <TableCell>{r.commissionUsed}%</TableCell>
                  <TableCell>{formatCurrency(r.taxAmount)}</TableCell>
                  <TableCell className={r.userReceivableAmount > 0 ? "font-medium text-blue-700" : ""}>
                    {r.userReceivableAmount > 0 ? formatCurrency(r.userReceivableAmount) : "—"}
                  </TableCell>
                  <TableCell>{formatCurrency(r.calculatedGrandPayment)}</TableCell>
                  <TableCell>{formatCurrency(r.previousDueAmount)}</TableCell>
                  <TableCell
                    className={
                      r.adjustmentAmount !== 0
                        ? r.adjustmentAmount > 0
                          ? "font-medium text-green-700"
                          : "font-medium text-red-700"
                        : ""
                    }
                  >
                    {r.adjustmentAmount !== 0 ? formatCurrency(r.adjustmentAmount) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(r.totalPayable)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "paid" ? "success" : "warning"} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
