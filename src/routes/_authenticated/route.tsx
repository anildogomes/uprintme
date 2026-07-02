import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, LayoutDashboard, Users, Package, Wallet, Store, LogOut } from "lucide-react";
import logoAsset from "@/assets/logo.png.asset.json";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

type NavItem = {
  to?: "/dashboard" | "/pedidos" | "/clientes" | "/financeiro" | "/loja";
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
};
const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/pedidos", label: "Pedidos", icon: Package },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/loja", label: "Loja virtual", icon: Store },
];

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{ data: { companies?: { name?: string } | null } | null }>;
          };
        };
      };
    })
      .from("profiles")
      .select("company_id, companies(name)")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const c = data?.companies as { name?: string } | null | undefined;
        if (c?.name) setCompanyName(c.name);
      });
  }, [user.id]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Até breve!");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside className="hidden w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Printer className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight">UprintMe</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map((item) => {
            if (item.soon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/60"
                  title="Em breve"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">em breve</span>
                </div>
              );
            }
            const active = pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-2 truncate text-xs text-muted-foreground">
            {companyName || "Sua gráfica"}
          </div>
          <div className="mb-3 truncate text-sm font-medium">{user.email}</div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
