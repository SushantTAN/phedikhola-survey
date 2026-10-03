"use client";
import { AdminShellSkeleton } from "@/components/shared/skeletons";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  FileBarChart,
  Database,
  Hospital,
  Home,
  Landmark,
  LogOut,
  MapPinned,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { api, clearTokens, getAccessToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import { RoleContext, type Role } from "@/components/role-context";
import { Button } from "@/components/ui/button";

const links = [
  [/^\/admin$/, "/admin", "Dashboard", BarChart3],
  [/^\/admin\/citizens/, "/admin/citizens", "Citizens", Users],
  [/^\/admin\/services/, "/admin/services", "Service Records", ClipboardList],
  [/^\/admin\/medicines/, "/admin/medicines", "Medicines", Pill],
  [/^\/admin\/wards/, "/admin/wards", "Ward Management", MapPinned],
  [/^\/admin\/health-posts/, "/admin/health-posts", "Health Posts", Hospital],
  [/^\/admin\/toles/, "/admin/toles", "Toles", MapPinned],
  [/^\/admin\/staff/, "/admin/staff", "Staff", UserCog],
  [/^\/admin\/reports/, "/admin/reports", "Reports", FileBarChart],
  [/^\/admin\/bulk-sms/, "/admin/bulk-sms", "Bulk SMS", MessageSquareText],
  [/^\/admin\/data/, "/admin/data", "Import / Export", Database],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (path === "/admin/login") {
      setRole(null);
      setReady(true);
      return;
    }
    if (!getAccessToken()) {
      router.replace("/admin/login");
      return;
    }
    api<any>("/auth/me")
      .then((r) => {
        if (r.data.role !== "ADMIN" && r.data.role !== "STAFF")
          throw new Error("Not allowed");
        setRole(r.data.role);
        setReady(true);
      })
      .catch(() => {
        clearTokens();
        router.replace("/admin/login");
      });
  }, [router, path]);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);
  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  // Staff only get the dashboard, citizens and service records.
  const staffAllowed = (p: string) =>
    /^\/admin(\/(citizens|services)(\/|$))?$/.test(p);
  const isStaff = role === "STAFF";
  const visibleLinks = isStaff
    ? links.filter(([, href]) => staffAllowed(href))
    : links;
  const blocked = isStaff && !staffAllowed(path);
  useEffect(() => {
    if (blocked) router.replace("/admin");
  }, [blocked, router]);

  if (!ready) return <AdminShellSkeleton />;
  if (path === "/admin/login") return <>{children}</>;
  // Right after signing in, wait for /auth/me so the wrong dashboard never flashes.
  if (role === null || blocked) return <AdminShellSkeleton />;

  const navigation = (mobile: boolean) => (
    <>
      <nav
        aria-label={isStaff ? "Staff navigation" : "Admin navigation"}
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {visibleLinks.map(([re, href, label, Icon]) => {
          const active = re.test(path);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={!mobile && collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/20"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white",
                !mobile && collapsed && "justify-center px-0",
              )}
            >
              <Icon size={18} />
              {(mobile || !collapsed) && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-900",
            !mobile && collapsed && "justify-center px-0",
          )}
        >
          <Home size={18} />
          {(mobile || !collapsed) && "Public portal"}
        </Link>
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-normal text-slate-300 hover:bg-slate-900 hover:text-white",
            !mobile && collapsed && "justify-center px-0",
          )}
          onClick={() => {
            setMobileOpen(false);
            clearTokens();
            router.push("/admin/login");
          }}
        >
          <LogOut size={18} />
          {(mobile || !collapsed) && "Logout"}
        </Button>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-[radial-gradient(circle_at_top_right,#ecfdf5,transparent_28%),#f8fafc] md:grid",
        collapsed ? "md:grid-cols-[84px_1fr]" : "md:grid-cols-[270px_1fr]",
      )}
    >
      <aside className="no-print sticky top-0 hidden h-screen border-r border-slate-800 bg-slate-950 text-white md:flex md:flex-col">
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-5">
          <div
            className={cn(
              "overflow-hidden transition-all",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <div className="text-[10px] font-bold uppercase tracking-[.26em] text-emerald-300">
              Phedikhola
            </div>
            <div className="mt-1 whitespace-nowrap text-base font-semibold">
              Citizen Survey
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-slate-300 hover:bg-slate-900 hover:text-white"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        {navigation(false)}
      </aside>
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-admin-menu"
            aria-label="Admin menu"
            className="absolute inset-y-0 left-0 flex w-[min(85vw,320px)] flex-col bg-slate-950 text-white shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.26em] text-emerald-300">
                  Phedikhola
                </div>
                <div className="mt-1 text-base font-semibold">
                  Citizen Survey
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                className="text-slate-300 hover:bg-slate-900 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                <X />
              </Button>
            </div>
            {navigation(true)}
          </aside>
        </div>
      )}
      <main className="min-w-0">
        <div className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-5 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-admin-menu"
              className="-ml-2 shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <Landmark className="shrink-0 text-emerald-600" size={18} />
            <span className="truncate">Phedikhola Rural Municipality</span>
          </div>
          <Link
            href="/"
            className="shrink-0 text-xs font-medium text-slate-500 hover:text-emerald-700"
          >
            Citizen portal →
          </Link>
        </div>
        <div className="p-5 md:p-8 xl:p-10">
          <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
        </div>
      </main>
    </div>
  );
}
