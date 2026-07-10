import { useState } from "react";
import { ArrowLeft, Check, Eye, FileSpreadsheet, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { weekEndFromStart, weekStartFromEnd } from "@/components/filters/PeriodFilters";

function parseRateInput(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function CommissionImportPage() {
  const { formatCurrency } = useCurrency();
  const [source, setSource] = useState("glovo");
  const [applyMode, setApplyMode] = useState("current");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [result, setResult] = useState(null);

  const resetPreview = () => {
    setPreview(null);
    setPreviewRows([]);
    setResult(null);
  };

  const buildFormData = (overrides) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", source);
    formData.append("applyMode", applyMode);
    if (applyMode === "week") {
      formData.append("periodStart", periodStart);
      formData.append("periodEnd", periodEnd);
    }
    if (overrides) {
      formData.append("overrides", JSON.stringify(overrides));
    }
    return formData;
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (applyMode === "week" && (!periodStart || !periodEnd)) {
      setError("Select week start and end for weekly import");
      return;
    }

    setLoading(true);
    setError("");
    resetPreview();

    try {
      const res = await api.post("/courier-import/preview", buildFormData());
      setPreview(res);
      setPreviewRows(res.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !preview) return;

    setLoading(true);
    setError("");

    const overrides = Object.fromEntries(
      previewRows.map((row) => [
        row.externalId,
        { commission: row.commission, tax: row.tax },
      ])
    );

    try {
      const res = await api.post("/courier-import/confirm", buildFormData(overrides));
      setResult(res);
      setFile(null);
      setPreview(null);
      setPreviewRows([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (rowIndex, field, value) => {
    setPreviewRows((rows) =>
      rows.map((row) => (row.rowIndex === rowIndex ? { ...row, [field]: value } : row))
    );
  };

  const handleWeekStartChange = (value) => {
    setPeriodStart(value);
    if (value) setPeriodEnd(weekEndFromStart(value));
  };

  const handleWeekEndChange = (value) => {
    setPeriodEnd(value);
    if (value) setPeriodStart(weekStartFromEnd(value));
  };

  const newCount = previewRows.filter((row) => row.isNewCourier).length;
  const existingCount = previewRows.length - newCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commission & Tax Import</h1>
        <p className="text-muted-foreground">
          Import courier commission and tax rates for the current default or a specific week. This
          does not create payment records — use Excel Upload for weekly payroll.
        </p>
      </div>

      {!preview ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Import Commission & Tax
              </CardTitle>
              <CardDescription>
                Upload your Glovo or Bolt commission list spreadsheet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePreview} className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="glovo">Glovo</option>
                    <option value="bolt">Bolt</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Apply rates to</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={applyMode}
                    onChange={(e) => setApplyMode(e.target.value)}
                  >
                    <option value="current">Current default (ongoing)</option>
                    <option value="week">Specific week only</option>
                  </select>
                </div>

                {applyMode === "week" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Week start</Label>
                      <Input
                        type="date"
                        value={periodStart}
                        onChange={(e) => handleWeekStartChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Week end</Label>
                      <Input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => handleWeekEndChange(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Excel file (.xlsx)</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={loading || !file} className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  {loading ? "Loading preview..." : "Preview Import"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Expected Columns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {source === "glovo" ? (
                <ul className="list-inside list-disc space-y-1">
                  <li>Id curier</li>
                  <li>Name</li>
                  <li>TAX</li>
                  <li>COMISSION</li>
                </ul>
              ) : (
                <ul className="list-inside list-disc space-y-1">
                  <li>Courier UID</li>
                  <li>First Name, Last Name</li>
                  <li>TAX</li>
                  <li>COMISSION</li>
                </ul>
              )}
              <p>
                {applyMode === "week"
                  ? "Weekly mode updates commission and tax for the selected week only."
                  : "Current mode updates the ongoing default rates used for future weeks."}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Import Preview</CardTitle>
                <CardDescription>
                  {preview.rowCount} couriers · {preview.fileReference}
                  {preview.applyMode === "week" && preview.periodStart && preview.periodEnd && (
                    <span>
                      {" "}
                      · Week {formatDate(preview.periodStart)} – {formatDate(preview.periodEnd)}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetPreview} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleConfirm} disabled={loading}>
                  <Check className="mr-2 h-4 w-4" />
                  {loading ? "Importing..." : "Confirm Import"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="secondary" className="capitalize">
                {preview.source}
              </Badge>
              <Badge variant="outline">
                {preview.applyMode === "week" ? "Weekly rates" : "Current default"}
              </Badge>
              <span className="text-muted-foreground">{newCount} new</span>
              <span className="text-muted-foreground">{existingCount} existing</span>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Courier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commission %</TableHead>
                    <TableHead>Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow key={row.externalId}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.externalId}</div>
                      </TableCell>
                      <TableCell>
                        {row.isNewCourier ? (
                          <Badge variant="warning">New</Badge>
                        ) : (
                          <Badge variant="secondary">Existing</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-8 w-24"
                          placeholder="—"
                          value={row.commission}
                          onChange={(e) => updateRow(row.rowIndex, "commission", e.target.value)}
                        />
                        {!row.isNewCourier &&
                          row.systemCommission !== null &&
                          parseRateInput(row.commission) !== row.systemCommission && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              was {row.systemCommission}%
                            </p>
                          )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 w-24"
                          placeholder="—"
                          value={row.tax}
                          onChange={(e) => updateRow(row.rowIndex, "tax", e.target.value)}
                        />
                        {!row.isNewCourier &&
                          row.systemTax !== null &&
                          parseRateInput(row.tax) !== row.systemTax && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              was {formatCurrency(row.systemTax)}
                            </p>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
            <CardDescription>
              {result.created} created · {result.updated} updated · {result.skipped} unchanged
              {result.applyMode === "week" && result.periodStart && result.periodEnd && (
                <span>
                  {" "}
                  · Week {formatDate(result.periodStart)} – {formatDate(result.periodEnd)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {result.results.map((row) => (
                <div
                  key={row.courierId}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground">{row.externalId}</p>
                  </div>
                  <div className="text-right">
                    <p>
                      {row.commission}% · Tax {formatCurrency(row.tax)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.isNewCourier
                        ? "New courier"
                        : row.commissionChanged || row.taxChanged
                          ? "Rates updated"
                          : "No changes"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
