import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Package, Wallet, Store, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoUm from "@/assets/logoUm.png.asset.json";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/40">
        <AppSidebar
          user={user}
          companyName={companyName}
          onSignOut={handleSignOut}
        />
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">
              {companyName || "Sua gráfica"}
            </span>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({
  user,
  companyName,
  onSignOut,
}: {
  user: { email?: string | null };
  companyName: string;
  onSignOut: () => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center justify-center px-2">
          <img
            src={logoUm.url}
            alt="UprintMe"
            className={collapsed ? "h-7 w-7 object-contain" : "h-8 w-auto"}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                if (item.soon || !item.to) {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton disabled tooltip={item.label}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                const active = pathname === item.to;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 pb-2">
            <div className="mb-1 truncate text-xs text-muted-foreground">
              {companyName || "Sua gráfica"}
            </div>
            <div className="mb-2 truncate text-sm font-medium">{user.email}</div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onSignOut}
          className="w-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
