import { useEffect, useState } from "react";
import { FileSpreadsheet, Trash2, Upload as UploadIcon } from "lucide-react";
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

  const loadBatches = () => {
    api.get("/uploads/batches").then(setBatches).catch(console.error);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !periodStart || !periodEnd) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", source);
    formData.append("periodStart", periodStart);
    formData.append("periodEnd", periodEnd);

    try {
      const res = await api.post("/uploads", formData);
      setResult(res);
      setFile(null);
      loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Excel Upload</h1>
        <p className="text-muted-foreground">
          Import Glovo or Bolt courier payroll files. All amounts are in Lei (RON). Couriers are
          auto-created on first upload.
        </p>
      </div>

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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                {loading ? "Processing..." : "Upload & Calculate"}
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
                      Tax: {formatCurrency(r.taxAmount)}
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
