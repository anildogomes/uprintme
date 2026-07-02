import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Trash2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useAuthRole, type AppRole } from "@/hooks/useAuthRole";

export const Route = createFileRoute("/_authenticated/pedidos")({
  component: PedidosPage,
});

type OrderStatus = "novo" | "em_producao" | "pronto" | "entregue" | "cancelado";

type Order = {
  id: string;
  company_id: string;
  client_id: string | null;
  code: string;
  title: string;
  description: string | null;
  status: OrderStatus;
  total_cents: number;
  due_date: string | null;
  created_at: string;
  clients?: { name: string } | null;
};

type Client = { id: string; name: string };

const STATUSES: { value: OrderStatus; label: string; tone: string }[] = [
  { value: "novo", label: "Novo", tone: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "em_producao", label: "Em produção", tone: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "pronto", label: "Pronto", tone: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "entregue", label: "Entregue", tone: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "cancelado", label: "Cancelado", tone: "bg-rose-100 text-rose-700 border-rose-200" },
];

const statusLabel = (s: OrderStatus) => STATUSES.find((x) => x.value === s)?.label ?? s;
const statusTone = (s: OrderStatus) => STATUSES.find((x) => x.value === s)?.tone ?? "";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const db = supabase as unknown as {
  from: (t: string) => any;
};

function PedidosPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);
  const { roles, isOwner, hasAny } = useAuthRole(userId);
  const isProducaoOnly = hasAny(["producao"]) && !isOwner && !hasAny(["vendedor"]);
  const canCreate = isOwner || hasAny(["vendedor"]);
  const canDelete = isOwner || hasAny(["vendedor"]);
  const allowedStatuses: OrderStatus[] = isOwner || hasAny(["vendedor"])
    ? ["novo", "em_producao", "pronto", "entregue", "cancelado"]
    : ["em_producao", "pronto"]; // produção só transiciona nessas
  const [view, setView] = useState<"list" | "kanban">(isProducaoOnly ? "kanban" : "list");
  useEffect(() => {
    if (isProducaoOnly) setView("kanban");
  }, [isProducaoOnly]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [openNew, setOpenNew] = useState(false);
  void roles;

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await db.from("clients").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await db.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pedido removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.code.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        (o.clients?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const totals = useMemo(() => {
    const byStatus: Record<OrderStatus, number> = {
      novo: 0,
      em_producao: 0,
      pronto: 0,
      entregue: 0,
      cancelado: 0,
    };
    let sum = 0;
    for (const o of orders) {
      byStatus[o.status]++;
      if (o.status !== "cancelado") sum += o.total_cents;
    }
    return { byStatus, sum };
  }, [orders]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} pedidos • {brl(totals.sum)} em produção/entrega
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <Button
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
              className="h-8 gap-1"
            >
              <List className="h-3.5 w-3.5" /> Lista
            </Button>
            <Button
              size="sm"
              variant={view === "kanban" ? "default" : "ghost"}
              onClick={() => setView("kanban")}
              className="h-8 gap-1"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            {canCreate && (
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Novo pedido
                </Button>
              </DialogTrigger>
            )}
            <NewOrderDialog clients={clients} onDone={() => setOpenNew(false)} />
          </Dialog>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, título ou cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onNew={() => setOpenNew(true)} hasAny={orders.length > 0} canCreate={canCreate} />
      ) : view === "list" ? (
        <ListView
          orders={filtered}
          onStatus={(id, status) => updateStatus.mutate({ id, status })}
          onDelete={(id) => removeOrder.mutate(id)}
          allowedStatuses={allowedStatuses}
          canDelete={canDelete}
        />
      ) : (
        <KanbanView
          orders={filtered}
          onStatus={(id, status) => updateStatus.mutate({ id, status })}
          allowedStatuses={allowedStatuses}
        />
      )}
    </div>
  );
}

function EmptyState({ onNew, hasAny, canCreate }: { onNew: () => void; hasAny: boolean; canCreate: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <h3 className="text-lg font-semibold">
        {hasAny ? "Nenhum pedido nesse filtro" : "Nenhum pedido ainda"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {hasAny
          ? "Ajuste os filtros ou crie um novo pedido."
          : "Comece cadastrando seu primeiro pedido para acompanhar produção e entrega."}
      </p>
      {canCreate && (
        <Button onClick={onNew} className="mt-4 gap-2">
          <Plus className="h-4 w-4" /> Novo pedido
        </Button>
      )}
    </div>
  );
}

function ListView({
  orders,
  onStatus,
  onDelete,
  allowedStatuses,
  canDelete,
}: {
  orders: Order[];
  onStatus: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
  allowedStatuses: OrderStatus[];
  canDelete: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => {
            const canEditStatus = allowedStatuses.includes(o.status);
            const options = STATUSES.filter((s) => allowedStatuses.includes(s.value));
            return (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.code}</TableCell>
                <TableCell className="font-medium">{o.title}</TableCell>
                <TableCell className="text-muted-foreground">{o.clients?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {o.due_date ? new Date(o.due_date).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell>{brl(o.total_cents)}</TableCell>
                <TableCell>
                  {canEditStatus ? (
                    <Select value={o.status} onValueChange={(v) => onStatus(o.id, v as OrderStatus)}>
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={statusTone(o.status)}>
                      {statusLabel(o.status)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remover pedido ${o.code}?`)) onDelete(o.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function KanbanView({
  orders,
  onStatus,
  allowedStatuses,
}: {
  orders: Order[];
  onStatus: (id: string, status: OrderStatus) => void;
  allowedStatuses: OrderStatus[];
}) {
  // Colunas visíveis: exclui cancelado; para perfil restrito, mostra só as colunas permitidas
  const restricted = !allowedStatuses.includes("novo");
  const cols = STATUSES.filter((s) => s.value !== "cancelado").filter((s) =>
    restricted ? allowedStatuses.includes(s.value) : true,
  );
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${restricted ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
      {cols.map((col) => {
        const items = orders.filter((o) => o.status === col.value);
        const canDrop = allowedStatuses.includes(col.value);
        return (
          <div key={col.value} className="rounded-2xl border border-border bg-card p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div
              onDragOver={(e) => canDrop && e.preventDefault()}
              onDrop={(e) => {
                if (!canDrop) return;
                const id = e.dataTransfer.getData("text/plain");
                if (id) onStatus(id, col.value);
              }}
              className="flex min-h-[120px] flex-col gap-2"
            >
              {items.map((o) => {
                const canDrag = allowedStatuses.includes(o.status);
                return (
                <div
                  key={o.id}
                  draggable={canDrag}
                  onDragStart={(e) => canDrag && e.dataTransfer.setData("text/plain", o.id)}
                  className={`rounded-xl border border-border bg-background p-3 shadow-sm ${canDrag ? "cursor-grab active:cursor-grabbing" : "opacity-70"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{o.code}</span>
                    <span className="text-xs font-semibold">{brl(o.total_cents)}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium">{o.title}</div>
                  {o.clients?.name && (
                    <div className="mt-1 text-xs text-muted-foreground">{o.clients.name}</div>
                  )}
                  {o.due_date && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Entrega: {new Date(o.due_date).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  Arraste aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewOrderDialog({ clients, onDone }: { clients: Client[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    client_id: "",
    status: "novo" as OrderStatus,
    total: "",
    due_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      code: f.code || `PED-${Date.now().toString().slice(-6)}`,
    }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Informe o título do pedido");
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    const { data: prof, error: pErr } = await db
      .from("profiles")
      .select("company_id")
      .eq("id", uid)
      .maybeSingle();
    if (pErr || !prof?.company_id) {
      setSaving(false);
      return toast.error("Empresa não encontrada para o usuário");
    }
    const total_cents = Math.round(parseFloat(form.total.replace(",", ".") || "0") * 100);
    const { error } = await db.from("orders").insert({
      company_id: prof.company_id,
      client_id: form.client_id || null,
      code: form.code,
      title: form.title,
      description: form.description || null,
      status: form.status,
      total_cents,
      due_date: form.due_date || null,
      created_by: uid,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido criado!");
    qc.invalidateQueries({ queryKey: ["orders"] });
    onDone();
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Novo pedido</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Entrega</Label>
            <Input
              id="due"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            placeholder="Ex.: 500 cartões de visita"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Descrição</Label>
          <Textarea
            id="desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sem cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Cadastre clientes no módulo Clientes
                  </div>
                )}
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="total">Total (R$)</Label>
            <Input
              id="total"
              inputMode="decimal"
              placeholder="0,00"
              value={form.total}
              onChange={(e) => setForm({ ...form, total: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Status inicial</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as OrderStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="inline-flex items-center gap-2">
                    <Badge variant="outline" className={statusTone(s.value)}>
                      {statusLabel(s.value)}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar pedido
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
