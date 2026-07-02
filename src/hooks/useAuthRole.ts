import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "vendedor" | "producao" | "financeiro";

type RoleRow = { role: AppRole; company_id: string };

const db = supabase as unknown as { from: (t: string) => any };

export function useAuthRole(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["user-roles", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await db
        .from("user_roles")
        .select("role, company_id")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const roles = (query.data ?? []).map((r) => r.role);
  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAny = (rs: AppRole[]) => rs.some((r) => roles.includes(r));

  return {
    roles,
    isLoading: query.isLoading,
    isOwner: hasRole("owner"),
    hasRole,
    hasAny,
  };
}

// Página -> perfis autorizados. `owner` sempre tem acesso total (adicionado abaixo).
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  "/dashboard": ["vendedor", "producao", "financeiro"],
  "/clientes": ["vendedor"],
  "/pedidos": ["vendedor", "producao"],
  "/produtos": ["vendedor", "producao"],
  "/fornecedores": ["vendedor", "producao", "financeiro"],
  "/financeiro": ["financeiro"],
  "/loja": ["vendedor"],
  "/membros": [], // owner-only (owner é liberado antes)
  "/configuracoes": [], // owner-only
};

export function canAccessRoute(pathname: string, roles: AppRole[]): boolean {
  if (roles.includes("owner")) return true;
  const key = Object.keys(ROUTE_ACCESS).find((k) => pathname.startsWith(k));
  if (!key) return true; // rota sem regra explícita: liberada por padrão
  return ROUTE_ACCESS[key].some((r) => roles.includes(r));
}
