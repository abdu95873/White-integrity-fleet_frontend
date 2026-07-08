import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Clock, CheckCircle, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    api.get("/reports/dashboard").then(setStats).catch(console.error);
  }, []);

  const cards = [
    {
      title: "Total Companies",
      value: stats?.courierCount ?? "—",
      icon: Users,
      desc: "Glovo & Bolt combined",
    },
    {
      title: "Pending Payments",
      value: stats ? formatCurrency(stats.pendingTotal) : "—",
      icon: Clock,
      desc: `${stats?.pendingCount ?? 0} records awaiting confirmation`,
    },
    {
      title: "Paid This Month",
      value: stats ? formatCurrency(stats.paidThisMonth) : "—",
      icon: CheckCircle,
      desc: "Confirmed payments",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Courier payroll overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, desc }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Recent Uploads
          </CardTitle>
          <CardDescription>Latest Excel import batches</CardDescription>
        </CardHeader>
        <CardContent>
          {!stats?.recentBatches?.length ? (
            <p className="text-sm text-muted-foreground">
              No uploads yet.{" "}
              <Link to="/upload" className="font-medium text-primary underline-offset-4 hover:underline">
                Upload your first file
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {batch.source}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatDate(batch.periodStart)} – {formatDate(batch.periodEnd)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uploaded {formatDate(batch.uploadedAt)} · {batch._count.paymentRecords} couriers
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
