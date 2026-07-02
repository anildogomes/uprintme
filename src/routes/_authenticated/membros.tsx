import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthRole, type AppRole } from "@/hooks/useAuthRole";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldAlert, Trash2, UserCog, Copy, Mail, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/membros")({
  component: MembrosPage,
});

const ROLES: AppRole[] = ["owner", "vendedor", "producao", "financeiro"];
const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  vendedor: "Vendedor",
  producao: "Produção",
  financeiro: "Financeiro",
};

const db = supabase as unknown as { from: (t: string) => any };

type Profile = { id: string; full_name: string | null; company_id: string | null };
type RoleRow = { id: string; user_id: string; company_id: string; role: AppRole };

function MembrosPage() {
  const { user } = Route.useRouteContext();
  const { isOwner, isLoading: rolesLoading } = useAuthRole(user.id);
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["my-company", user.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { company_id: string | null } | null;
    },
  });
  const companyId = me?.company_id ?? null;

  const { data: profiles = [], isLoading: pLoading } = useQuery<Profile[]>({
    queryKey: ["company-profiles", companyId],
    enabled: !!companyId && isOwner,
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("id, full_name, company_id")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const { data: allRoles = [], isLoading: rLoading } = useQuery<RoleRow[]>({
    queryKey: ["company-user-roles", companyId],
    enabled: !!companyId && isOwner,
    queryFn: async () => {
      const { data, error } = await db
        .from("user_roles")
        .select("id, user_id, company_id, role")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const rolesByUser = useMemo(() => {
    const map = new Map<string, RoleRow[]>();
    for (const r of allRoles) {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r);
      map.set(r.user_id, arr);
    }
    return map;
  }, [allRoles]);

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await db
        .from("user_roles")
        .insert({ user_id: userId, company_id: companyId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-user-roles", companyId] });
      toast.success("Perfil adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await db.from("user_roles").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-user-roles", companyId] });
      toast.success("Perfil removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db
        .from("user_roles")
        .delete()
        .eq("company_id", companyId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-user-roles", companyId] });
      toast.success("Membro removido (todos os perfis revogados)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ------ Convites ------
  const { data: invites = [], isLoading: iLoading } = useQuery<
    { id: string; email: string; role: AppRole; token: string; expires_at: string }[]
  >({
    queryKey: ["company-invitations", companyId],
    enabled: !!companyId && isOwner,
    queryFn: async () => {
      const { data, error } = await db
        .from("invitations")
        .select("id, email, role, token, expires_at")
        .eq("company_id", companyId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("vendedor");

  const createInvite = useMutation({
    mutationFn: async () => {
      const email = inviteEmail.trim().toLowerCase();
      if (!email) throw new Error("Informe o e-mail");
      const { data, error } = await db
        .from("invitations")
        .insert({
          company_id: companyId,
          email,
          role: inviteRole,
          invited_by: user.id,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data as { token: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["company-invitations", companyId] });
      setInviteEmail("");
      const link = `${window.location.origin}/auth?invite=${data.token}`;
      navigator.clipboard?.writeText(link).catch(() => {});
      toast.success("Convite criado — link copiado para a área de transferência");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-invitations", companyId] });
      toast.success("Convite revogado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard?.writeText(link);
    toast.success("Link copiado");
  };

  if (rolesLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <ShieldAlert className="mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-lg font-semibold">Somente o owner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Apenas o responsável (owner) da empresa pode gerenciar membros.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/dashboard">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserCog className="h-6 w-6" /> Membros da empresa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Convide novos usuários e defina os perfis (owner, vendedor, produção, financeiro).
        </p>
      </header>

      {/* Formulário de convite */}
      <section className="mb-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4" /> Convidar novo membro
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createInvite.mutate();
          }}
          className="grid gap-3 sm:grid-cols-[1fr,180px,auto]"
        >
          <div>
            <Label htmlFor="inv-email" className="sr-only">E-mail</Label>
            <Input
              id="inv-email"
              type="email"
              required
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="sr-only">Perfil</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={createInvite.isPending}>
            {createInvite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar convite
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Ao gerar, o link é copiado automaticamente. Envie ao convidado para ele criar a conta
          já dentro da sua empresa.
        </p>

        {invites.length > 0 && (
          <div className="mt-5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Convites pendentes
            </h3>
            {invites.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{i.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABEL[i.role]} · expira {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyInviteLink(i.token)}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Link
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => revokeInvite.mutate(i.id)}
                  disabled={revokeInvite.isPending}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {iLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> carregando convites…
          </div>
        )}
      </section>

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Membros ativos</h2>


      {pLoading || rLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Nenhum membro além de você ainda. Enquanto o convite não chega,
          novos cadastros criam uma empresa própria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfis</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const isMe = p.id === user.id;
                const userRoles = rolesByUser.get(p.id) ?? [];
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">
                        {p.full_name || "(sem nome)"}
                        {isMe && (
                          <Badge variant="outline" className="ml-2">
                            você
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {p.id.slice(0, 8)}…
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-3">
                        {ROLES.map((r) => {
                          const existing = userRoles.find((ur) => ur.role === r);
                          const checked = !!existing;
                          const disableOwnerSelf =
                            isMe && r === "owner" && checked;
                          return (
                            <label
                              key={r}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                disabled={
                                  disableOwnerSelf ||
                                  addRole.isPending ||
                                  removeRole.isPending
                                }
                                onCheckedChange={(v) => {
                                  if (v && !existing) {
                                    addRole.mutate({ userId: p.id, role: r });
                                  } else if (!v && existing) {
                                    removeRole.mutate(existing.id);
                                  }
                                }}
                              />
                              {ROLE_LABEL[r]}
                            </label>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isMe && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (
                              confirm(
                                `Remover ${p.full_name || "este membro"} da empresa? Todos os perfis serão revogados.`,
                              )
                            ) {
                              removeMember.mutate(p.id);
                            }
                          }}
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
