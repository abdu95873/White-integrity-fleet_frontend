import { useEffect, useState } from "react";
import { ArrowLeft, Check, Eye, FileSpreadsheet, Trash2, Upload as UploadIcon } from "lucide-react";
import { api } from "@/lib/api";
import { computePreviewPayment, parseRateInput } from "@/lib/paymentCalc";
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

function recalcPreviewRow(row, source) {
  const commission = parseRateInput(row.commission);
  const tax = parseRateInput(row.tax);
  const amounts = computePreviewPayment(
    source,
    row.rawExcelData,
    commission,
    tax,
    row.previousDueAmount
  );

  return {
    ...row,
    commission: row.commission,
    tax: row.tax,
    ...amounts,
  };
}

export default function UploadPage() {
  const { formatCurrency } = useCurrency();
  const [source, setSource] = useState("glovo");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [batches, setBatches] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);

  const loadBatches = () => {
    api.get("/uploads/batches").then(setBatches).catch(console.error);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const resetPreview = () => {
    setPreview(null);
    setPreviewRows([]);
  };

  const buildFormData = (overrides) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", source);
    formData.append("periodStart", periodStart);
    formData.append("periodEnd", periodEnd);
    if (overrides) {
      formData.append("overrides", JSON.stringify(overrides));
    }
    return formData;
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!file || !periodStart || !periodEnd) return;

    setLoading(true);
    setError("");
    setResult(null);
    resetPreview();

    try {
      const res = await api.post("/uploads/preview", buildFormData());
      setPreview(res);
      setPreviewRows(res.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!file || !preview) return;

    setLoading(true);
    setError("");

    const overrides = Object.fromEntries(
      previewRows.map((row) => [
        row.externalId,
        {
          commission: row.commission,
          tax: row.tax,
        },
      ])
    );

    try {
      const res = await api.post("/uploads", buildFormData(overrides));
      setResult(res);
      setFile(null);
      resetPreview();
      loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const updatePreviewRow = (rowIndex, field, value) => {
    setPreviewRows((rows) =>
      rows.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        const updated = recalcPreviewRow({ ...row, [field]: value }, preview.source);
        return updated;
      })
    );
  };

  const deleteBatch = async (batch) => {
    if (batch.paidCount > 0) return;

    const period = `${formatDate(batch.periodStart)} – ${formatDate(batch.periodEnd)}`;

    if (
      !confirm(
        `Delete this ${batch.source} upload?\n\nPeriod: ${period}\nRecords: ${batch.recordCount}`
      )
    ) {
      return;
    }

    setDeletingId(batch.id);
    setError("");
    try {
      await api.delete(`/uploads/batches/${batch.id}`);
      if (result?.batch?.id === batch.id) {
        setResult(null);
      }
      loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const previewTotals = previewRows.reduce(
    (acc, row) => ({
      periodCalculated: acc.periodCalculated + row.periodCalculated,
      totalPayable: acc.totalPayable + row.totalPayable,
    }),
    { periodCalculated: 0, totalPayable: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Excel Upload</h1>
        <p className="text-muted-foreground">
          Import Glovo or Bolt courier payroll files. Preview commission and tax per courier before
          confirming the upload.
        </p>
      </div>

      {!preview ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                Upload File
              </CardTitle>
              <CardDescription>
                Glovo and Bolt are processed separately — never merged.
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Period start</Label>
                    <Input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period end</Label>
                    <Input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>

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

                <Button type="submit" disabled={loading} className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  {loading ? "Loading preview..." : "Preview Upload"}
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
            <CardContent className="text-sm text-muted-foreground">
              {source === "glovo" ? (
                <ul className="list-inside list-disc space-y-1">
                  <li>Id curier (unique)</li>
                  <li>Oras, Nume, Comenzi</li>
                  <li>Total Venituri de transferat</li>
                  <li>+ other Glovo payroll columns</li>
                </ul>
              ) : (
                <ul className="list-inside list-disc space-y-1">
                  <li>Courier UID (unique)</li>
                  <li>First Name, Last Name</li>
                  <li>Adjusted Earnings (Without VAT)</li>
                  <li>Courier Tips (With VAT)</li>
                  <li>Overdue courier cash debt</li>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Upload Preview</CardTitle>
                <CardDescription>
                  {preview.rowCount} couriers · {formatDate(preview.periodStart)} –{" "}
                  {formatDate(preview.periodEnd)} · {preview.fileReference}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetPreview} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleConfirmUpload} disabled={loading}>
                  <Check className="mr-2 h-4 w-4" />
                  {loading ? "Uploading..." : "Confirm Upload"}
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
              <span className="text-muted-foreground">
                Calculated total: {formatCurrency(previewTotals.periodCalculated)}
              </span>
              <span className="font-medium">
                Payable total: {formatCurrency(previewTotals.totalPayable)}
              </span>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Courier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Calculated</TableHead>
                    <TableHead>Commission %</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Prev. Due</TableHead>
                    <TableHead>Total Payable</TableHead>
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
                      <TableCell>{formatCurrency(row.periodCalculated)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-8 w-24"
                          placeholder={row.isNewCourier ? "—" : "0"}
                          value={row.commission}
                          onChange={(e) =>
                            updatePreviewRow(row.rowIndex, "commission", e.target.value)
                          }
                        />
                        {!row.isNewCourier &&
                          row.systemCommission !== parseRateInput(row.commission) && (
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
                          placeholder={row.isNewCourier ? "—" : "0"}
                          value={row.tax}
                          onChange={(e) => updatePreviewRow(row.rowIndex, "tax", e.target.value)}
                        />
                        {!row.isNewCourier && row.systemTax !== parseRateInput(row.tax) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            was {formatCurrency(row.systemTax)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.previousDueAmount > 0
                          ? formatCurrency(row.previousDueAmount)
                          : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(row.totalPayable)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Batches</CardTitle>
          <CardDescription>
            Wrong file or duplicate week? Delete pending-only batches and upload again. Batches
            with any paid history cannot be removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[90px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No uploads yet
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {batch.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(batch.periodStart)} – {formatDate(batch.periodEnd)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                      {batch.fileReference || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {batch.recordCount}
                      {batch.paidCount > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({batch.paidCount} paid)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(batch.uploadedAt)}
                    </TableCell>
                    <TableCell>
                      {batch.paidCount > 0 ? (
                        <span className="text-xs text-muted-foreground">Locked</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === batch.id}
                          onClick={() => deleteBatch(batch)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
            <CardDescription>
              {result.recordsCreated} payment records created for{" "}
              <Badge variant="secondary" className="capitalize">
                {result.batch.source}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {result.records.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{r.courier.name}</p>
                    <p className="text-muted-foreground">{r.courier.externalId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(r.totalPayable)}</p>
                    <p className="text-xs text-muted-foreground">
                      Commission: {r.commissionUsed}% · Tax: {formatCurrency(r.taxAmount)}
                    </p>
                    {r.previousDueAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        incl. {formatCurrency(r.previousDueAmount)} prior due
                      </p>
                    )}
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
