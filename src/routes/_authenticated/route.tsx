import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Package, Wallet, Store, LogOut, ShieldAlert, Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoUm from "@/assets/logoUm.png.asset.json";
import { useAuthRole, canAccessRoute, type AppRole } from "@/hooks/useAuthRole";
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
  to: "/dashboard" | "/pedidos" | "/clientes" | "/financeiro" | "/loja" | "/membros";
  label: string;
  icon: typeof LayoutDashboard;
  allow: AppRole[]; // owner sempre incluso implicitamente
  ownerOnly?: boolean;
};
const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, allow: ["vendedor", "producao", "financeiro"] },
  { to: "/clientes", label: "Clientes", icon: Users, allow: ["vendedor"] },
  { to: "/pedidos", label: "Pedidos", icon: Package, allow: ["vendedor", "producao"] },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, allow: ["financeiro"] },
  { to: "/loja", label: "Loja virtual", icon: Store, allow: ["vendedor"] },
  { to: "/membros", label: "Membros", icon: UserCog, allow: [], ownerOnly: true },
];

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState<string>("");
  const { roles, isLoading: rolesLoading, isOwner } = useAuthRole(user.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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

  const visibleNav = nav.filter((n) => isOwner || n.allow.some((r) => roles.includes(r)));
  const allowed = canAccessRoute(pathname, roles);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/40">
        <AppSidebar
          user={user}
          companyName={companyName}
          onSignOut={handleSignOut}
          items={visibleNav}
        />
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">
              {companyName || "Sua gráfica"}
            </span>
          </header>
          <main className="flex-1">
            {rolesLoading ? (
              <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allowed ? (
              <Outlet />
            ) : (
              <AccessDenied roles={roles} />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AccessDenied({ roles }: { roles: AppRole[] }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-semibold">Acesso restrito</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu perfil {roles.length ? `(${roles.join(", ")})` : "atual"} não tem permissão para esta página.
        Fale com o responsável (owner) da sua empresa para liberar acesso.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/dashboard">Voltar ao dashboard</Link>
      </Button>
    </div>
  );
}

function AppSidebar({
  user,
  companyName,
  onSignOut,
  items,
}: {
  user: { email?: string | null };
  companyName: string;
  onSignOut: () => void;
  items: NavItem[];
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
              {items.map((item) => {
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
