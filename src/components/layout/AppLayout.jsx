import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
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
  Menu,
  X,
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

function SidebarContent({ user, logout, onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">White Integrity</p>
          <p className="text-xs text-muted-foreground">Fleet ERP</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t p-4">
        <CurrencySelector />
        <div className="px-3">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentLabel =
    navItems.find(({ to }) =>
      to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)
    )?.label ?? "White Integrity";

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-white lg:flex">
        <SidebarContent user={user} logout={logout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-white shadow-xl">
            <button
              type="button"
              onClick={closeMobile}
              className="absolute right-3 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent user={user} logout={logout} onNavigate={closeMobile} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Truck className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">{currentLabel}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
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
