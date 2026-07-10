import { NavLink, Outlet, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Upload,
  UserPlus,
  CreditCard,
  BarChart3,
  LogOut,
  Truck,
  Landmark,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/companies", icon: Users, label: "Companies" },
  { to: "/upload", icon: Upload, label: "Upload" },
  { to: "/commission-import", icon: UserPlus, label: "Commission & Tax Import" },
  { to: "/payments", icon: CreditCard, label: "Payments" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/accounts", icon: Landmark, label: "Accounts" },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r bg-white">
        <div className="flex items-center gap-3 border-b px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">White Integrity</p>
            <p className="text-xs text-muted-foreground">Fleet ERP</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4 space-y-3">
          <CurrencySelector />
          <div className="px-3">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function ProtectedRoute() {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <AppLayout />;
}
