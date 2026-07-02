import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  Wallet,
  Store,
  LogOut,
  ShieldAlert,
  Loader2,
  UserCog,
  Package2,
  Truck,
  Settings,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoUm from "@/assets/logoUm.png.asset.json";
import { useAuthRole, canAccessRoute, type AppRole } from "@/hooks/useAuthRole";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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

type NavPath =
  | "/pedidos"
  | "/clientes"
  | "/produtos"
  | "/fornecedores"
  | "/membros"
  | "/financeiro"
  | "/loja"
  | "/configuracoes";

type NavItem = {
  to: NavPath;
  label: string;
  icon: typeof Package;
  allow: AppRole[];
  ownerOnly?: boolean;
};

const primaryNav: NavItem[] = [
  { to: "/pedidos", label: "Pedidos", icon: Package, allow: ["vendedor", "producao"] },
  { to: "/clientes", label: "Clientes", icon: Users, allow: ["vendedor"] },
  { to: "/produtos", label: "Produtos", icon: Package2, allow: ["vendedor", "producao"] },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck, allow: ["vendedor", "producao", "financeiro"] },
  { to: "/membros", label: "Usuários", icon: UserCog, allow: [], ownerOnly: true },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, allow: ["financeiro"] },
];

const secondaryNav: NavItem[] = [
  { to: "/loja", label: "Loja Virtual", icon: Store, allow: ["vendedor"] },
];

const ROUTE_LABELS: Record<string, string> = {
  pedidos: "Pedidos",
  clientes: "Clientes",
  produtos: "Produtos",
  fornecedores: "Fornecedores",
  membros: "Usuários",
  financeiro: "Financeiro",
  loja: "Loja Virtual",
  configuracoes: "Configurações",
  dashboard: "Dashboard",
};

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const { roles, isLoading: rolesLoading, isOwner } = useAuthRole(user.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{
              data: { full_name?: string | null; companies?: { name?: string } | null } | null;
            }>;
          };
        };
      };
    })
      .from("profiles")
      .select("full_name, company_id, companies(name)")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const c = data?.companies as { name?: string } | null | undefined;
        if (c?.name) setCompanyName(c.name);
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user.id]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Até breve!");
    navigate({ to: "/", replace: true });
  };

  const filterFn = (n: NavItem) => isOwner || n.allow.some((r) => roles.includes(r));
  const visiblePrimary = primaryNav.filter(filterFn);
  const visibleSecondary = secondaryNav.filter(filterFn);
  const allowed = canAccessRoute(pathname, roles);

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((seg, i) => ({
      label: ROUTE_LABELS[seg] ?? seg,
      href: "/" + parts.slice(0, i + 1).join("/"),
      isLast: i === parts.length - 1,
    }));
  }, [pathname]);

  const roleLabel = isOwner ? "Gestor" : roles[0] ?? "Membro";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/40">
        <AppSidebar
          user={user}
          fullName={fullName}
          companyName={companyName}
          roleLabel={roleLabel}
          onSignOut={handleSignOut}
          primary={visiblePrimary}
          secondary={visibleSecondary}
          ownerCanSettings={isOwner}
        />
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
              <Link to="/pedidos" className="text-muted-foreground hover:text-foreground">
                {companyName || "Início"}
              </Link>
              {crumbs.map((c) => (
                <span key={c.href} className="flex items-center gap-1 min-w-0">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span
                    className={
                      c.isLast
                        ? "truncate font-medium text-foreground"
                        : "truncate text-muted-foreground"
                    }
                  >
                    {c.label}
                  </span>
                </span>
              ))}
            </nav>
          </header>
          <main className="flex-1">
            {rolesLoading ? (
              <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allowed ? (
              <div className="p-4 md:p-6 lg:p-8">
                <Outlet />
              </div>
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
        <Link to="/pedidos">Voltar</Link>
      </Button>
    </div>
  );
}

function initialsOf(name: string, fallback: string) {
  const src = (name || fallback || "?").trim();
  const parts = src.split(/\s+/);
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
  return chars.toUpperCase();
}

function AppSidebar({
  user,
  fullName,
  companyName,
  roleLabel,
  onSignOut,
  primary,
  secondary,
  ownerCanSettings,
}: {
  user: { email?: string | null };
  fullName: string;
  companyName: string;
  roleLabel: string;
  onSignOut: () => void;
  primary: NavItem[];
  secondary: NavItem[];
  ownerCanSettings: boolean;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const displayName = fullName || user.email || "Usuário";
  const initials = initialsOf(fullName, user.email ?? "U");

  const renderItem = (item: NavItem) => {
    const active = pathname === item.to || pathname.startsWith(item.to + "/");
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
          <Link to={item.to}>
            <item.icon />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-14 items-center gap-2 px-2">
          <img
            src={logoUm.url}
            alt="UprintMe"
            className={collapsed ? "h-8 w-8 object-contain" : "h-9 w-9 object-contain"}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{companyName || "Sua gráfica"}</div>
              <div className="truncate text-[11px] text-muted-foreground">UprintMe</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{primary.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {secondary.length > 0 && (
          <>
            {!collapsed && <Separator className="my-1" />}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>{secondary.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {ownerCanSettings && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/configuracoes")}
                tooltip="Configurações"
              >
                <Link to="/configuracoes">
                  <Settings />
                  <span>Configurações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {roleLabel}
                {companyName ? ` · ${companyName}` : ""}
              </div>
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={onSignOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
