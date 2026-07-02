import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, TrendingUp, Clock, CheckCircle2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});

type Order = {
  id: string;
  code: string;
  title: string;
  status: "novo" | "em_producao" | "pronto" | "entregue" | "cancelado";
  total_cents: number;
  due_date: string | null;
  created_at: string;
  clients?: { name: string } | null;
};

const db = supabase as unknown as { from: (t: string) => any };

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<Order["status"], string> = {
  novo: "Novo",
  em_producao: "Em produção",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function FinanceiroPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders", "financeiro"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("id, code, title, status, total_cents, due_date, created_at, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelado");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const pending = active
      .filter((o) => o.status !== "entregue")
      .reduce((s, o) => s + o.total_cents, 0);
    const delivered = active
      .filter((o) => o.status === "entregue")
      .reduce((s, o) => s + o.total_cents, 0);
    const monthTotal = active
      .filter((o) => {
        const d = new Date(o.created_at);
        return d >= monthStart && d < monthEnd;
      })
      .reduce((s, o) => s + o.total_cents, 0);
    const avgTicket =
      active.length > 0
        ? active.reduce((s, o) => s + o.total_cents, 0) / active.length
        : 0;

    return { pending, delivered, monthTotal, avgTicket };
  }, [orders]);

  const cards = [
    {
      label: "A receber",
      value: brl(stats.pending),
      hint: "pedidos ainda não entregues",
      icon: Clock,
    },
    {
      label: "Recebido (entregues)",
      value: brl(stats.delivered),
      hint: "total já entregue",
      icon: CheckCircle2,
    },
    {
      label: "Faturado no mês",
      value: brl(stats.monthTotal),
      hint: "criados neste mês",
      icon: TrendingUp,
    },
    {
      label: "Ticket médio",
      value: brl(Math.round(stats.avgTicket)),
      hint: "por pedido ativo",
      icon: Wallet,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe recebíveis e faturamento da sua gráfica.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {c.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.hint}</div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Últimos lançamentos
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Nenhum pedido registrado ainda. Ao criar pedidos, eles aparecerão aqui.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 20).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">{o.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {o.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.clients?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{STATUS_LABEL[o.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {brl(o.total_cents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
